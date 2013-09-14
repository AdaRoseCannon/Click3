/* globals define, $*/
define(['jquery', 'mapGen/rhill-voronoi-core', 'mapGen/doob-perlin', 'libs/requestAnimSingleton'], function ($, Voronoi, Perlin, AnimRequest) {
	'use strict';
	var v = new Voronoi();
	var perlin = new Perlin(true);
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
		data.polys = [];
		var addVertex = function (vertex, cell) {
			var inArray = data.vertices.indexOf(vertex);
			if (inArray === -1) {
				data.polys[cell].vertices.push(data.vertices.push(vertex)-1);
			} else {
				var inPoly = data.polys[cell].vertices.indexOf(inArray);
				if (inPoly === -1) {
					data.polys[cell].vertices.push(inArray);
				} else {
					data.polys[cell].vertices[inPoly] = inArray;
				}
			}
		};

		for(var cell in diagram.cells) {
			data.polys[cell] = {};
			data.polys[cell].vertices = [];
			data.polys[cell].origin = {};
			data.polys[cell].origin.x = diagram.cells[cell].site.x;
			data.polys[cell].origin.y = diagram.cells[cell].site.y;
			for(var halfedge in diagram.cells[cell].halfedges) {
				var va = diagram.cells[cell].halfedges[halfedge].edge.va;
				var vb = diagram.cells[cell].halfedges[halfedge].edge.vb;
				//use JSON.stringify as a hash to check the array against
				var vertex1 = JSON.stringify({x: va.x - data.polys[cell].origin.x, y: va.y - data.polys[cell].origin.y});
				var vertex2 = JSON.stringify({x: vb.x - data.polys[cell].origin.x, y: vb.y - data.polys[cell].origin.y});
				addVertex(vertex1, cell);
				addVertex(vertex2, cell);
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

		renderCells(canvas, ctx, data);

		// Get the CanvasPixelArray from the given coordinates and dimensions.
		var imgd = ctx.getImageData(bbox.xl, bbox.yt, bbox.xr - bbox.xl, bbox.yb - bbox.yt);
		var pix = imgd.data;
		// Loop over each pixel and invert the color.
		for (var i = 0, l = pix.length; l < l; i += 4) {
		    pix[i  ] = 255 - pix[i  ]; // red
		    pix[i+1] = 255 - pix[i+1]; // green
		    pix[i+2] = 255 - pix[i+2]; // blue
		    // i+3 is alpha (the fourth element)
		}
	}

	function getPerlin(point, min, max, zoom) {
		var x = point.x;
		var y = point.y;
		var z = point.z;
		(function (z) {
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
		})(z++ % 100);
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

	function renderCells (canvas, ctx, cells) {
		for(var i=0,l=cells.polys.length;i<l;i++) {
			ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16);
			ctx.beginPath();
			var v = null;
			for (var j=0,l2=cells.polys[i].vertices.length;j<l2;j++) {
				if (v === null) {
					v = cells.vertices[cells.polys[i].vertices[j]];
					ctx.moveTo(v.x + cells.polys[i].origin.x, v.y + cells.polys[i].origin.y);
				} else {
					v = cells.vertices[cells.polys[i].vertices[j]];
					ctx.lineTo(v.x + cells.polys[i].origin.x, v.y + cells.polys[i].origin.y);
				}
			}
			ctx.closePath();
			ctx.rect(cells.polys[i].origin.x-2/3,cells.polys[i].origin.y-2/3,2,2);
			ctx.fill();
		}
	}
});