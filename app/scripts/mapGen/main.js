/* globals define, $*/
define(['jquery'], function ($) {
	'use strict';
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

		for (var i=0; i<100; i++) {
			ctx.fillStyle=0xFFFFFF*Math.random();
			ctx.fillRect(400*Math.random(),400*Math.random(),1,1);
		}
	}
	setup();
});