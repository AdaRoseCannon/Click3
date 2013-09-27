/* globals define, $, THREE*/
define(['jquery', 'mapGen/rhill-voronoi-core', 'mapGen/doob-perlin', 'libs/requestAnimSingleton', 'three', 'chroma'], function ($, Voronoi, Perlin, AnimRequest, three, chroma) {
	'use strict';
	var v = new Voronoi();
	var perlin = new Perlin(true);
	var maxArea = 0.3;

	function pad(n, len) {
		return (new Array(len + 1).join('0') + n).slice(-len);
	}

	var uniquePush = function (a, i) {
		if(a.indexOf(i) === -1) {
			a.push(i);
		}
	};

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
				switch (data.polys[i].land) {
				case 'land':
					key = '668855';
					break;
				case 'lake':
					key = '00ffff';
					break;
				case 'ocean':
					key = '000066';
					break;
				case 'forcedOcean':
					key = '000055';
					break;
				default:
					key = '000000';
				}
				//ctx.globalCompositeOperation='lighter';
			}
			ctx.fillStyle = '#' + key;
			ctx.beginPath();
			var v = null;
			for (var j=0,l2=data.polys[i].vertices.length;j<l2;j++) {
				if (v === null) {
					v = data.vertices[data.polys[i].vertices[j]];
					ctx.moveTo(v.x, v.y);
				} else {
					v = data.vertices[data.polys[i].vertices[j]];
					ctx.lineTo(v.x, v.y);
				}
			}
			ctx.closePath();
			ctx.fill();
			for (j=0,l2=data.polys[i].vertices.length;j<l2;j++) {
				v = data.vertices[data.polys[i].vertices[j]];
				if (v.distanceToOcean) {
					var newCol = '#' + pad((255-(v.distanceToOcean*64)).toString(16),2) + '0000';
					ctx.fillStyle = newCol;
					ctx.fillRect(v.x-3, v.y-3, 6,6);
				}
			}
		}
		for (var k=0,l3=data.edges.length;k<l3;k++) {
			if(data.edges[k].type !== undefined) {
				var v1 = data.vertices[data.edges[k].a];
				var v2 = data.vertices[data.edges[k].b];
				ctx.beginPath();
				ctx.moveTo(v1.x, v1.y);
				ctx.lineTo(v2.x, v2.y);
				switch (data.edges[k].type) {
				case 'beach':
					ctx.lineWidth=5;
					ctx.strokeStyle='#FFFF00';
					break;
				case 'cliffs':
					ctx.lineWidth=4;
					ctx.strokeStyle='#333333';
					break;
				}
				ctx.stroke();
			}
		}
		ctx.globalCompositeOperation='source-over';
		return cellKey;
	}

	function setup () {
		console.time('mapGen');
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
		var noPoints = 150;

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
		data.edges = [];

		var addVertex = function (vertex, cell) {
			var inArray = data.vertices.indexOf(vertex);
			var vertexObject = JSON.parse(vertex);
			if (inArray === -1) {
				var newVertexIndex = data.vertices.push(vertex)-1;
				data.polys[cell].vertices.push(newVertexIndex);
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
			data.polys[cell].edges = [];
			data.polys[cell].adjacent = [];
			data.polys[cell].origin = {};
			data.polys[cell].origin.x = diagram.cells[cell].site.x;
			data.polys[cell].origin.y = diagram.cells[cell].site.y;
			data.polys[cell].area = 0;
			data.polys[cell].areaValue = 0;
			data.polys[cell].land = null;
			var edgeVertex = false;
			for(var halfedge in diagram.cells[cell].halfedges) {
				var va = diagram.cells[cell].halfedges[halfedge].edge.va;
				var vb = diagram.cells[cell].halfedges[halfedge].edge.vb;
				//use JSON.stringify as a hash to check the array against
				var vertex1 = JSON.stringify({x: va.x, y: va.y});
				var vertex2 = JSON.stringify({x: vb.x, y: vb.y});
				addVertex(vertex1, cell);
				addVertex(vertex2, cell);
				if (va.x === bbox.xl || va.x === bbox.xr || va.y === bbox.yt || va.y === bbox.yb) {
					edgeVertex = true;
				}
				if (vb.x === bbox.xl || vb.x === bbox.xr || vb.y === bbox.yt || vb.y === bbox.yb) {
					edgeVertex = true;
				}
			}
			data.polys[cell].edgesCount = data.polys[cell].vertices.length - 1;
			if (edgeVertex) {
				data.polys[cell].land = 'forcedWater';
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
				var origin = cell.origin;
				return cell.vertices.sort(function (aIn,bIn) {
					//convert cartesian coordinates to polar
					var a = data.vertices[aIn];
					var b = data.vertices[bIn];
					var angleA = Math.atan2(a.y - origin.y,a.x - origin.x);
					var angleB = Math.atan2(b.y - origin.y,b.x - origin.x);
					return  angleA - angleB;
				});
			}
			for(var cell in data.polys) {
				data.polys[cell].vertices = sortCell(data.polys[cell]);
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
		function isAdjacent (a ,b) {
			if (b.index === a.index) {
				return false;
			}
			if (b.adjacent.indexOf(a.index) !== -1) {
				return true;
			}
			if (a.adjacent.length >= a.edgesCount) {
				return false;
			}
			if (b.adjacent.length >= b.edgesCount) {
				return false;
			}
			for (var v=0, l=a.vertices.length; v<l; v++) {
				var result = b.vertices.indexOf(a.vertices[v]);

				if (result >= 0) {
					if (b.vertices.indexOf(a.vertices[((v - 1) + l) % l]) !== -1) {
						a.adjacent.push(b.index);
						b.adjacent.push(a.index);
						return true;
					}
					if (b.vertices.indexOf(a.vertices[(v + 1) % l]) !== -1) {
						a.adjacent.push(b.index);
						b.adjacent.push(a.index);
						return true;
					}
				}
			}
			return false;
		}
		function cellSortFunction (a,b) {
			return b.areaValue - a.areaValue;
		}
		var areaUsed = 0;
		var oceanSeed;
		data.polys = data.polys.sort(cellSortFunction);
		for(i=0,l=data.polys.length;i<l;i++) {
			data.polys[i].index = i;
			totalArea += data.polys[i].area;
			data.polys[i].areaValue /= data.polys[i].area;
			data.polys[i].area /= totalArea;

			if(data.polys[i].land === null) {
				if (areaUsed < maxArea) {
					data.polys[i].land = 'land';
					areaUsed += data.polys[i].area;
				} else {
					data.polys[i].land = 'lake';
				}
			}
			if (oceanSeed === undefined && data.polys[i].land === 'forcedWater') {
				oceanSeed = data.polys[i];
			}

		}

		//Generate Edges

		(function () {
			var tempAdjacentData = [];
			for(var cell in data.polys) {
				var vertices = data.polys[cell].vertices;

				//Loop around a cell saving all of the edges.
				for(var v=0,l=vertices.length; v<l; v++) {

					var v1 = vertices[v];
					var v2 = vertices[((v-1) + l)%l];

					var edge1 = JSON.stringify({a: v1, b: v2});
					var edge2 = JSON.stringify({a: v2, b: v1});

					if(data.vertices[v1].adjacent === undefined) {
						data.vertices[v1].adjacent = [];
					}
					if(data.vertices[v1].adjacent.indexOf(v2) === -1) {
						data.vertices[v1].adjacent.push(v2);
					}
					if(data.vertices[v2].adjacent === undefined) {
						data.vertices[v2].adjacent = [];
					}
					if(data.vertices[v2].adjacent.indexOf(v1) === -1) {
						data.vertices[v2].adjacent.push(v1);
					}

					//See if the edge is already present 
					//(it can be in either directio)
					var useEdge;
					var search1 = data.edges.indexOf(edge1);
					var search2 = data.edges.indexOf(edge2);
					if (search1 === -1) {
						if (search2 === -1) {
							useEdge = data.edges.push(edge1) - 1;
							//if neither direction is in the object then add one of them.
						} else {
							useEdge = search2;
						}
					} else {
						useEdge = search1;
					}
					data.polys[cell].edges.push(useEdge);

					//assign cells to each edge.
					if (tempAdjacentData[useEdge] === undefined) {
						tempAdjacentData[useEdge] = [];
					}
					tempAdjacentData[useEdge].push(cell);
				}
			}

			//convert edges to objects
			(function () {
				for(var i=0,l=data.edges.length;i<l;i++) {
					data.edges[i] = JSON.parse(data.edges[i]);
					data.edges[i].polys = tempAdjacentData[i];
				}
			})();
		})();

		//create delaunay traingles adjacentiness
		for(i=0,l=data.polys.length;i<l;i++) {
			for(var j=0;j<l;j++) {
				if (isAdjacent (data.polys[i], data.polys[j])) {
					if (data.polys[i].adjacent.length >= data.polys[i].edgesCount) {
						break;
					}
				}
			}
		}

		//flood oceans in from corner
		function recursiveFlood(seed) {
			if (seed.land === 'forcedWater') {
				seed.land = 'forcedOcean';
			} else {
				seed.land = 'ocean';
			}
			for (var key in seed.adjacent) {
				var next = data.polys[seed.adjacent[key]];
				if (next.land !== 'land' && next.land !== 'ocean' && next.land !== 'forcedOcean') {
					recursiveFlood(next);
				}
			}
		}
		recursiveFlood(oceanSeed);

		//create reverse look up map for vertices.
		for(i=0,l=data.polys.length;i<l;i++) {
			var vertices = data.polys[i].vertices;
			for (var v=0, l2=vertices.length; v<l2; v++) {
				//construct vertex lookup object
				if (data.vertices[vertices[v]].polys === undefined) {
					data.vertices[vertices[v]].polys = [data.polys[i].index];
				} else {
					if (data.vertices[vertices[v]].polys.indexOf(data.polys[i].index) === -1) {
						data.vertices[vertices[v]].polys.push(data.polys[i].index);
					}
				}
			}
		}

		function calculateDistanceToOcean (pass) {
			for(var vSet in data.vertices) {
				if (pass === 0) {
					var contactingOcean = false;
					for (var cell in data.vertices[vSet].polys){
						var land = data.polys[data.vertices[vSet].polys[cell]].land;
						if (land === 'ocean' || land === 'forcedOcean') {
							contactingOcean = true;
						}
					}
					if (contactingOcean) {
						data.vertices[vSet].distanceToOcean = 0;
					}
				} else {
					if (data.vertices[vSet].distanceToOcean === undefined) {
						for (var adj in data.vertices[vSet].adjacent) {
							if (data.vertices[data.vertices[vSet].adjacent[adj]].distanceToOcean === pass - 1) {
								data.vertices[vSet].distanceToOcean = pass;
								break;
							}
						}
					}
				}
			}
		}
		calculateDistanceToOcean (0);
		calculateDistanceToOcean (1);
		calculateDistanceToOcean (2);
		calculateDistanceToOcean (3);
		calculateDistanceToOcean (4);
		calculateDistanceToOcean (5);
		calculateDistanceToOcean (6);
		calculateDistanceToOcean (7);

		//Determine coatlines beaches or cliffs.
		//If they are adjacent to cut off cells then they are cliffs.
		(function () {
			for (var edge in data.edges){
				if(data.edges[edge].polys.length === 2) {
					if(data.vertices[data.edges[edge].a].distanceToOcean === 0) {
						if(data.vertices[data.edges[edge].b].distanceToOcean === 0) {
							for (var e=0; e<2;e++){
								if(data.edges[edge].type === undefined) {
									var f = (e + 1)%2;
									var land1 = data.polys[data.edges[edge].polys[f]].land;
									var land2 = data.polys[data.edges[edge].polys[e]].land;
									if(land1 === 'land' && land2 === 'forcedOcean') {
										data.edges[edge].type = 'cliffs';
									}
									if(land1 === 'land' && land2 === 'ocean') {
										data.edges[edge].type = 'beach';
									}
								}
							}
						}
					}
				}
			}
		})();

		//Calculate heights
		(function () {
			for(var v in data.vertices) {
				data.vertices[v].z = data.vertices[v].distanceToOcean * 10;
			}
		})();

		function split(edges) {


			//collect all the vertices 
			var verts = [];
			for (var e1 in edges) {
				uniquePush(verts,data.edges[edges[e1]].a);
				uniquePush(verts,data.edges[edges[e1]].b);
			}

			//duplicate any edges which contain any of the vertices.
			var touchedEdges = [];
			for (var e2 in data.edges) {
				if(verts.indexOf(data.edges[e2].a) !== -1 || verts.indexOf(data.edges[e2].b) !== -1) {
					touchedEdges.push(parseInt(e2,10));
				}
			}
			console.log(touchedEdges);

			//return a concatenated list of all edges.
			return edges;
		}
		function bridge(edgeNo1, edgeNo2) {

			var e1 = data.edges[edgeNo1];
			var e2 = data.edges[edgeNo2];

			var newPoly = {};
			newPoly.vertices = [e2.a];
			if (newPoly.vertices.indexOf(e2.b) === -1) {
				newPoly.vertices.push(e2.b);
			}
			if (newPoly.vertices.indexOf(e1.b) === -1) {
				newPoly.vertices.push(e1.b);
			}
			if (newPoly.vertices.indexOf(e1.a) === -1) {
				newPoly.vertices.push(e1.a);
			}
			newPoly.edges = [edgeNo1, edgeNo2];
			newPoly = data.polys.push(JSON.parse(JSON.stringify(newPoly))) -1;

			return newPoly;

		}

		var splitEdges = [];
		for (var k=0,l3=data.edges.length;k<l3;k++) {
			if(data.edges[k].type === 'cliffs') {
				splitEdges.push(k);
			}
		}
		var newEdges = split(splitEdges);
		for (var k4=0,l4=newEdges.length;k4<l4;k4++) {
			data.vertices[data.edges[newEdges[k4]].a].z = 30;
			data.vertices[data.edges[newEdges[k4]].b].z = 30;
		}


		console.log(Math.ceil((JSON.stringify(data).length*2)/1000)+'kB');
		console.log(data);
		renderCells(canvas, ctx, data, true);
		console.timeEnd('mapGen');
		canvas.style.display = 'none';
		render3D(canvas, ctx, data);
	}

	function render3D(canvas, ctx, data){
		function addObject(obj) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					scene.add(obj[key]);
					sceneObjects.push(obj[key]);
				}
			}
		}
		var scene = new THREE.Scene();
		var WIDTH = 400;
		var HEIGHT = 400;
		var VIEW_ANGLE = 45;
		var ASPECT = WIDTH / HEIGHT;
		var NEAR = 0.1;
		var FAR = 10000;
		var sceneObjects = [];
		var camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
		var renderer = new THREE.WebGLRenderer();
		renderer.setSize(WIDTH, HEIGHT);
	    camera.position = {x: 100, y:300, z:400};
	    camera.lookAt({x: 0, y: 0, z: 0});
	    var pointLight = new THREE.PointLight(0xFFFFFF);
	    pointLight.position = {x: 10, y: 500, z: 130};

		// add to the scene
		addObject({
			camera: camera,
			light: pointLight
		});
        $('div.bs').append(renderer.domElement);

        //build 3d island

		var islandGeometry = new THREE.Geometry();
		(function () {
			for(var v in data.vertices) {
				var v3 = data.vertices[v];
				islandGeometry.vertices.push(new THREE.Vector3(v3.x-200, v3.z, v3.y-200));
			}
		})();

		var Uv1 = 0.5, Uv = 0.3;
		(function () {
			for(var f in data.polys) {
				var f4 = data.polys[f].vertices;
				//all edges are convex so naively doing this is fine
				var h = Math.random();
				for (var a=0, l=f4.length; a<l-1;a++) {
					var p1 = 0;
					var p2 = a;
					var p3 = (a + 1) % l;
					var p4 = (a + 2) % l;
					var face, face2;
					if (p4 === 0 || true) {
						face = new THREE.Face3(f4[p3], f4[p2], f4[p1]);
						face2 = new THREE.Face3(f4[p2], f4[p3], f4[p1]);
					} else {
						face = new THREE.Face4(f4[p4], f4[p3], f4[p2], f4[p1]);
					}
					switch(data.polys[f].land){
					case 'land':
						face.color.setRGB( 0.4, 0.7, 0.4 );
						break;
					case 'ocean':
						face.color.setRGB( 0, 0, 0.7 );
						break;
					case 'forcedOcean':
						face.color.setRGB( 0, 0, 0.6 );
						break;
					case 'lake':
						face.color.setRGB( 0, 0.4, 0.8 );
						break;
					case 'cliff':
						face.color.setHSL(h , 1, 0.5);
						break;
					}
					islandGeometry.faces.push(face);
					//islandGeometry.faces.push(face2);
				}
			}
		})();
		islandGeometry.computeCentroids();
		islandGeometry.computeFaceNormals();
		islandGeometry.computeVertexNormals();
		var material = new THREE.MeshPhongMaterial({ //replace basic with lambert.
				color:  0xFFFFFF,
				vertexColors: THREE.FaceColors,
				overdraw: false
			});
		var islandObject = new THREE.Mesh(islandGeometry, material);
		var island = new THREE.Object3D();
		island.add(islandObject);
		scene.add(island);
		var doer = new AnimRequest('renderloop', function () {
			renderer.render(scene, camera);
			island.rotation.y += 0.01;
		});
		doer.start();
	}
});