/* globals define, $*/
define(['jquery', 'mapGen/rhill-voronoi-core'], function ($, Voronoi) {
	'use strict';
	var v = new Voronoi();
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

		var bbox = {xl:0,xr:800,yt:0,yb:600};
		var noPoints = 100;

		var points = [];

		for (var i=0; i<noPoints; i++) {
			points[i] = {x: bbox.xr*Math.random(), y: bbox.yb*Math.random()};
		}

		var diagram = v.compute(points, bbox);
		diagram = relax(diagram, bbox);
		diagram = relax(diagram, bbox);
		render (canvas, ctx, diagram);
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