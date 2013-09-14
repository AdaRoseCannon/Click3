/* globals define, $*/
define(['jquery', 'mapGen/rhill-voronoi-core', 'mapGen/doob-perlin', 'libs/requestAnimSingleton'], function ($, Voronoi, Perlin, AnimRequest) {
	'use strict';
	var v = new Voronoi();
	var perlin = new Perlin(true);
	var maxArea = 0.3;

	function pad(n, len) {
		return (new Array(len + 1).join('0') + n).slice(-len);
	}

	function setup () {
		var wrapper = document.createElement('div');
		wrapper.innerHTML = '<div class="container" id="mapGen">\
			<h1>Map Generator</h1>\
			<div class="bs">\
				<canvas height="400px" width="400px" />\
			</div>\
		</div>';
		$('body').append(wrapper);
		var canvas = $(wrapper).find('canvas').get(0);
		var ctx=canvas.getContext('2d');

		var bbox = {xl:0,xr:400,yt:0,yb:400};
		var noPoints = 100;

		var points = [];
		(function () {
			for (var i=0; i<noPoints; i++) {
				points[i] = {x: bbox.xr*Math.random(), y: bbox.yb*Math.random()};
			}
		})();

		var diagram = v.compute(points, bbox);
		diagram = relax(diagram, bbox);
		diagram = relax(diagram, bbox);
		generateCellsFromCanvas (canvas, ctx, diagram, bbox);
	}
	setup();

	function generateCellsFromCanvas (canvas, ctx, diagram, bbox) {

		//This function must seperate the new object from the old to allow garbage collection.

		render (canvas, ctx, diagram);

		var data = {};
		data.vertices = [];
		data.edgeVertices = [];
		data.polys = [];

		var addVertex = function (vertex, cell) {
			var inArray = data.vertices.indexOf(vertex);
			var vertexObject = JSON.parse(vertex);
			if (inArray === -1) {
				var newVertexIndex = data.vertices.push(vertex)-1;
				data.polys[cell].vertices.push(newVertexIndex);
				if(vertexObject.x === 0 || vertexObject.y === 0) {
					data.edgeVertices.push(newVertexIndex);
					return true;
				}
				return false;
			} else {
				var inPoly = data.polys[cell].vertices.indexOf(inArray);
				if (inPoly === -1) {
					data.polys[cell].vertices.push(inArray);
				} else {
					data.polys[cell].vertices[inPoly] = inArray;
				}
				if(data.edgeVertices.indexOf(inArray)) {
					return true;
				}
				return false;
			}
		};

		for(var cell in diagram.cells) {
			data.polys[cell] = {};
			data.polys[cell].vertices = [];
			data.polys[cell].origin = {};
			data.polys[cell].origin.x = diagram.cells[cell].site.x;
			data.polys[cell].origin.y = diagram.cells[cell].site.y;
			data.polys[cell].area = 0;
			data.polys[cell].areaValue = 0;
			data.polys[cell].averageValue = 0;
			data.polys[cell].land = null;
			var edgeVertex = false;
			for(var halfedge in diagram.cells[cell].halfedges) {
				var va = diagram.cells[cell].halfedges[halfedge].edge.va;
				var vb = diagram.cells[cell].halfedges[halfedge].edge.vb;
				//use JSON.stringify as a hash to check the array against
				var vertex1 = JSON.stringify({x: va.x - data.polys[cell].origin.x, y: va.y - data.polys[cell].origin.y});
				var vertex2 = JSON.stringify({x: vb.x - data.polys[cell].origin.x, y: vb.y - data.polys[cell].origin.y});
				edgeVertex = addVertex(vertex1, cell);
				edgeVertex = addVertex(vertex2, cell) || edgeVertex;
			}
			if (edgeVertex) {
				data.polys[cell].land = false;
			}
		}

		//convert the JSon.strinigify back to vertices.
		(function () {
			for(var i=0,l=data.vertices.length;i<l;i++) {
				data.vertices[i] = JSON.parse(data.vertices[i]);
			}
		})();

		//Sort the cell vertices so that they are anticlockwise;
		(function () {
			function sortCell (cell) {
				return cell.sort(function (aIn,bIn) {
					//convert cartesian coordinates to polar
					var a = data.vertices[aIn];
					var b = data.vertices[bIn];
					var angleA = Math.atan2(a.y,a.x);
					var angleB = Math.atan2(b.y,b.x);
					return  angleA - angleB;
				});
			}
			for(var cell in data.polys) {
				data.polys[cell].vertices = sortCell(data.polys[cell].vertices);
			}
		})();

		var cellKey = renderCells(canvas, ctx, data);

		// Draw perlin noise over the canvas
		function drawPerlin() {
			for(var x = bbox.xl; x<bbox.xr; x++) {
				for(var y = bbox.yt; y<bbox.yb; y++) {
					var val = Math.floor(256 * getPerlin({x: x, y: y, z: 0}, -0.3, 0.3, 20),16);
					ctx.fillStyle = 'rgb(' + val + ',' + val + ',' + val + ')';
					ctx.fillRect(x,y,1,1);
				}
			}
		}
		//drawPerlin();

		// Get the CanvasPixelArray from the given coordinates and dimensions.
		var imgd = ctx.getImageData(bbox.xl, bbox.yt, bbox.xr - bbox.xl, bbox.yb - bbox.yt);
		var pix = imgd.data;
		// Loop over each pixel and invert the color.
		var n = 0;
		var totalArea = 0;
		for (var i = 0, l = pix.length; i < l; i += 4) {
		    var red = pad(pix[i  ].toString(16),2);
		    var blue = pad(pix[i+1].toString(16),2);
		    var green = pad(pix[i+2].toString(16),2);
		    // i+3 is alpha (the fourth element)
		    var col = red+blue+green;
		    //if (Math.random() < 0.01) console.log(col);
		    var indexOfKey = cellKey.indexOf(col);
		    if (indexOfKey !== -1) {
				totalArea++;
				data.polys[indexOfKey].area++;
				var x = (i/4) % (bbox.xr - bbox.xl);
				var y = Math.floor((i/4) / (bbox.xr - bbox.xl));
				var perlinValue = getPerlin({x: x, y: y, z: 0}, -0.3, 0.3, 20);
				data.polys[indexOfKey].areaValue += perlinValue;
				pix[i+2] = Math.floor(256 * perlinValue,16);
		    }
		}
		ctx.putImageData(imgd, bbox.xl, bbox.yt);

		//Iterate over the cells average the values and normalize the area.
		//Determine if the land is land or sea.
		//Sort the cells by perlin value;

		function cellSortFunction (a,b) {
			return b.areaValue - a.areaValue;
		}
		var areaUsed = 0;
		data.polys = data.polys.sort(cellSortFunction);
		for(i=0,l=data.polys.length;i<l;i++) {
			totalArea += data.polys[i].area;
			data.polys[i].areaValue /= data.polys[i].area;
			data.polys[i].area /= totalArea;

			if (data.polys[i].land === null && areaUsed < maxArea) {
				data.polys[i].land = true;
				areaUsed += data.polys[i].area;
			}
		}

		renderCells(canvas, ctx, data, true);
	}

	function getPerlin(point, min, max, zoom) {
		var x = point.x;
		var y = point.y;
		var z = point.z;
		var noise = perlin.noise(x/(10 * zoom),y/(10 * zoom),z/(10 * zoom));
		if (noise < min) {
			noise = min;
		}
		if (noise > max) {
			noise = max;
		}
		noise = noise - min;
		noise *= 1/(max - min);
		return noise;
	}

	function relax (diagram, bbox) {
		var points = [];
		//relax by making the new point the average of the vertices.
		for(var cell in diagram.cells) {
			var px = 0, py = 0, n = 0;
			for(var halfedge in diagram.cells[cell].halfedges) {
				n++;
				var va = diagram.cells[cell].halfedges[halfedge].edge.va;
				px += va.x;
				py += va.y;
			}
			points[cell] = {x: px/n, y: py/n};
		}
		return v.compute(points, bbox);
	}

	function render (canvas, ctx, diagram) {
		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.rect(0,0,canvas.width,canvas.height);
		ctx.fillStyle = 'white';
		ctx.fill();
		ctx.strokeStyle = '#888';
		ctx.stroke();
		// voronoi
		if (!diagram) {return;}
		// edges
		ctx.beginPath();
		ctx.strokeStyle = '#000';
		var edges = diagram.edges,
			iEdge = edges.length,
			edge, vertex;
		while (iEdge--) {
			edge = edges[iEdge];
			vertex = edge.va;
			ctx.moveTo(vertex.x,vertex.y);
			vertex = edge.vb;
			ctx.lineTo(vertex.x,vertex.y);
		}
		ctx.stroke();
		// sites
		ctx.beginPath();
		ctx.fillStyle = '#44f';
		var iSite = diagram.cells.length;
		while (iSite--) {
			vertex = diagram.cells[iSite].site;
			ctx.rect(vertex.x-2/3,vertex.y-2/3,2,2);
		}
		ctx.fill();

	}

	function renderCells (canvas, ctx, data, hasData) {

		var cellKey = [];
		for(var i=0,l=data.polys.length;i<l;i++) {
			var key = pad(i.toString(16),6);
			cellKey[i] = key;
			if (hasData) {
				if (data.polys[i].land) {
					key = 'ff0000';
				} else {
					key = '000000';
				}
				ctx.globalCompositeOperation='lighter';
			}
			ctx.fillStyle = '#' + key;
			ctx.beginPath();
			var v = null;
			for (var j=0,l2=data.polys[i].vertices.length;j<l2;j++) {
				if (v === null) {
					v = data.vertices[data.polys[i].vertices[j]];
					ctx.moveTo(v.x + data.polys[i].origin.x, v.y + data.polys[i].origin.y);
				} else {
					v = data.vertices[data.polys[i].vertices[j]];
					ctx.lineTo(v.x + data.polys[i].origin.x, v.y + data.polys[i].origin.y);
				}
			}
			ctx.closePath();
			ctx.fill();
		}
		ctx.globalCompositeOperation='source-over';
		return cellKey;
	}
});