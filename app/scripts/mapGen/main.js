/* globals define, $*/
define(['jquery', 'mapGen/rhill-voronoi-core', 'mapGen/doob-perlin', 'libs/requestAnimSingleton'], function ($, Voronoi, Perlin, AnimRequest) {
	'use strict';
	var v = new Voronoi();
	var perlin = new Perlin();
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

		for (var i=0; i<noPoints; i++) {
			points[i] = {x: bbox.xr*Math.random(), y: bbox.yb*Math.random()};
		}

		var diagram = v.compute(points, bbox);
		diagram = relax(diagram, bbox);
		diagram = relax(diagram, bbox);
		render (canvas, ctx, diagram);

		var z=0;
		var total = 0;
		var amount = 0;
		var min = -1;
		var max = 1;
		var doer = new AnimRequest('perlin', function () {
			(function (z) {
				ctx.beginPath();
				for (var x = bbox.xl, y; x < bbox.xr; x++) {
					for (y = bbox.yt; y <= bbox.yb; y++) {
						ctx.fillStyle = '#000';
						var noise = perlin.noise(x/100,y/100,z/100);
						noise = noise - min;
						noise *= 1/(max - min);
						amount++;
						total += noise;
						var hex = Math.floor(parseInt((0xFF).toString(10)) * noise).toString(16);
						ctx.fillStyle = '#' + hex + hex + hex;
						ctx.fillRect(x,y,1,1);
					}
				}
			})(z++ % 100);
	    });
	    doer.once();
	}
	setup();

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
});