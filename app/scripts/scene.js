/*global define, THREE, $, renderer*/
define(['jquery', 'three', 'libs/store'], function($, three, Store) {
    'use strict';
    var store = new Store();
    store.addCategory('globals');
    store.addCategory('render');
    var render = store.data.render;

    var scene = new THREE.Scene();
    var bigPlane = new THREE.Mesh(new THREE.PlaneGeometry(10000, 10000), new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
        transparent: true,
        opacity: 0
    }));
    var $container = $('body');
    bigPlane.rotation.x = -Math.PI / 2;
    scene.add(bigPlane);
    var WIDTH = 480;
    var HEIGHT = WIDTH * document.documentElement.clientHeight / document.documentElement.clientWidth;
    var VIEW_ANGLE = 45;
    var ASPECT = WIDTH / HEIGHT;
    var NEAR = 0.1;
    var FAR = 10000;
    var sceneObjects = [];
    var camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(WIDTH, HEIGHT);
    $container.append(renderer.domElement);
    //var camera = new THREE.OrthographicCamera( WIDTH / - 1, WIDTH / 1, HEIGHT / 1, HEIGHT / - 1, NEAR, FAR );
    
    render.set('sceneObjects', sceneObjects);
    render.set('renderer', renderer);
    render.set('scene', scene);
    render.set('camera', camera);
    render.set('bigPlane', bigPlane);
    render.set('actualDimensions', {width: renderer.domElement.clientWidth, height: renderer.domElement.clientHeight});

    function addObject(obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                scene.add(obj[key]);
                sceneObjects.push(obj[key]);
            }
        }
    }
    camera.position.z = 300;
    camera.position.y = 300;
    camera.lookAt({
        x: 500,
        y: 0,
        z: 500
    });

    var c = [];
    var obj = {};
    for (var i = 0; i < 10; i++) {
        c[i] = [];
        for (var j = 0; j < 10; j++) {
            var material = new THREE.MeshLambertMaterial({
                color: 0xFF00CC
            });
            c[i][j] = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), material);
            c[i][j].position = {
                x: i * 100,
                y: 0,
                z: j * 100
            };
            c[i][j].rotation.x = -Math.PI / 2;
            obj['cubex' + i + 'y' + j] = c[i][j];
        }
    }
    addObject(obj);

    var pointLight = new THREE.PointLight(0xFFFFFF);
    pointLight.position = {
        x: 10,
        y: 500,
        z: 130
    };

    // add to the scene
    addObject({
        camera: camera,
        light: pointLight
    });
    
    render.set('objects', sceneObjects);
    require(['bindings']);
});