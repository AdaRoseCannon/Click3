/*global define, THREE, $*/
define(['jquery', 'three', 'libs/requestAnimSingleton', 'renderloop', 'libs/pointerInteractions'], function ($, three, AnimRequest, renderloop, PointerInteractions) {
    'use strict';

    var requestAnimFrame = (function(){
        return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            function( callback ){
                window.setTimeout(callback, 1000 / 60);
            };
    })();

    var scene = new THREE.Scene();
    var bigPlane = new THREE.Mesh(new THREE.PlaneGeometry(10000, 10000), new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true, transparent: true, opacity: 0 } ));
    bigPlane.rotation.x = -Math.PI/2;
    scene.add(bigPlane);
    var WIDTH = 480;
    var HEIGHT = WIDTH * document.documentElement.clientHeight/document.documentElement.clientWidth;
    var VIEW_ANGLE = 45, ASPECT = WIDTH / HEIGHT, NEAR = 0.1, FAR = 10000;
    var sceneObjects = [];
    var doer;
    var projector = new THREE.Projector();
    var ACTUALWIDTH;
    var ACTUALHEIGHT;


    function addObject (obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                scene.add(obj[key]);
                sceneObjects.push(obj[key]);
            }
        }
    }

    function getIntersection(x, y, camera, objects) {

        var tx = ( x / ACTUALWIDTH ) * 2 - 1;
        var ty = - ( y / ACTUALHEIGHT ) * 2 + 1;

		var vector = new THREE.Vector3( tx, ty, 1);
		projector.unprojectVector( vector, camera );

		var raycaster = new THREE.Raycaster( camera.position, vector.sub(camera.position).normalize());

		var intersects = raycaster.intersectObjects(objects);

		if ( intersects.length > 0 ) {
			return {object: intersects[0].object, point: intersects[0].point};
		} else {
            return false;
		}
    }

    return (function init() {

        var $container = $('body');
        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(WIDTH, HEIGHT);
        var camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
        //var camera = new THREE.OrthographicCamera( WIDTH / - 1, WIDTH / 1, HEIGHT / 1, HEIGHT / - 1, NEAR, FAR );
        camera.position.z = 300;
        camera.position.y = 300;
        camera.lookAt({x:500, y:0, z:500});
        $container.append(renderer.domElement);
        requestAnimFrame(function () {window.scrollTo(0, 100)});
        ACTUALWIDTH = renderer.domElement.clientWidth;
        ACTUALHEIGHT = renderer.domElement.clientHeight;
        var mouseEventHandler = new PointerInteractions($container.get(0));

        var c = [];
        var obj = {};
        for (var i=0; i<10; i++) {
            c[i] = [];
            for (var j=0; j<10; j++) {
                var material = new THREE.MeshLambertMaterial({color: 0xFF00CC});
                c[i][j] = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), material);
                c[i][j].position = {x:i*100, y:0, z:j*100};
                c[i][j].rotation.x = -Math.PI/2;
                obj['cubex'+i+'y'+j] = c[i][j];
            }
        }
        addObject(obj);


        var pointLight = new THREE.PointLight(0xFFFFFF);
        pointLight.position = {x: 10, y: 500, z: 130};

        // add to the scene
        addObject({camera: camera, light: pointLight});
        doer = new AnimRequest(function () {
            renderloop(renderer, scene, camera);
        });
        doer.start();

        mouseEventHandler.addClickHandler(function (e) {
            var collide =  getIntersection(e.detail.x, e.detail.y, camera, sceneObjects);
            if (collide) collide.object.material.color.setHex( Math.random() * 0xffffff );
        });

        var cameraDragStart = false;
        var cameraDragStartPosition = false;
        mouseEventHandler.addDragStartHandler(function (e) {
            bigPlane.position.x = camera.position.x;
            bigPlane.position.z = camera.position.z;
            cameraDragStartPosition = camera.position;
            cameraDragStart = getIntersection(e.detail.x, e.detail.y, camera, [bigPlane]).point;
        });


        mouseEventHandler.addDragEndHandler(function (e) {
            cameraDragStart = false;
            cameraDragStartPosition = false;
        });

        mouseEventHandler.addDragHandler(function (e) {
            var collide = getIntersection(e.detail.current.x, e.detail.current.y, camera, [bigPlane]);
            if (cameraDragStart && collide) {
                camera.position.x = cameraDragStartPosition.x - (collide.point.x - cameraDragStart.x);
                camera.position.z =  cameraDragStartPosition.z - (collide.point.z - cameraDragStart.z);
            }
        });


        return {
            objects: sceneObjects,
            scene: scene,
            loop: doer
        }
    })();
});