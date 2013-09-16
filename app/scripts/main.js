require.config({
	paths: {
		jquery: '../bower_components/jquery/jquery',
		three: '../bower_components/threejs/build/three',
		bootstrapAffix: '../bower_components/sass-bootstrap/js/bootstrap-affix.js',
		bootstrapAlert: '../bower_components/sass-bootstrap/js/bootstrap-alert.js',
		bootstrapButton: '../bower_components/sass-bootstrap/js/bootstrap-button.js',
		bootstrapCarousel: '../bower_components/sass-bootstrap/js/bootstrap-carousel.js',
		bootstrapCollapse: '../bower_components/sass-bootstrap/js/bootstrap-collapse.js',
		bootstrapPopover: '../bower_components/sass-bootstrap/js/bootstrap-popover.js',
		bootstrapScrollspy: '../bower_components/sass-bootstrap/js/bootstrap-scrollspy.js',
		bootstrapTab: '../bower_components/sass-bootstrap/js/bootstrap-tab.js',
		bootstrapTooltip: '../bower_components/sass-bootstrap/js/bootstrap-tooltip.js',
		bootstrapTransition: '../bower_components/sass-bootstrap/js/bootstrap-transition.js',
		bootstrapTypeahead: '../bower_components/sass-bootstrap/js/bootstrap-typeahead.js'
	},
	shim: {
		bootstrapAffix: {
			deps: ['jquery']
		},
		bootstrapAlert: {
			deps: ['jquery']
		},
		bootstrapButton: {
			deps: ['jquery']
		},
		bootstrapCarousel: {
			deps: ['jquery']
		},
		bootstrapCollapse: {
			deps: ['jquery']
		},
		bootstrapPopover: {
			deps: ['jquery']
		},
		bootstrapScrollspy: {
			deps: ['jquery']
		},
		bootstrapTab: {
			deps: ['jquery']
		},
		bootstrapTooltip: {
			deps: ['jquery']
		},
		bootstrapTransition: {
			deps: ['jquery']
		},
		bootstrapTypeahead: {
			deps: ['jquery']
		}
	}
});

function hideHud() {
	'use strict';
    require(['jquery'], function () {
        $('.hud').get(0).innerHTML = '';
    });
}

window['startApp'] = function() {
	'use strict';
    hideHud();
    require(['scene', 'libs/store', 'bindings'], function (elem, Store, bindings) {
        var render = (new Store()).data.render;
        $('body').append(elem);
        elem.classList.add('fullScreen');
        render.set('actualDimensions', {width: elem.clientWidth, height: elem.clientHeight});
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        }
        bindings();
    });
};

window['mapGen'] = function() {
	'use strict';
    hideHud();
    require(['mapGen/main']);
};

mapGen();