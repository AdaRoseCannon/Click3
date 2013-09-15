/*global define, THREE, $, renderer*/
define(['libs/store'], function (Store) {
    'use strict';
    
    return function selectObjectFromScreen(x, y, camera, objects) {
        var actualDimensions = (new Store()).data.render.get('actualDimensions');
        var ACTUALWIDTH = actualDimensions.width;
        var ACTUALHEIGHT = actualDimensions.height;

        var projector = new THREE.Projector();

        var tx = (x / ACTUALWIDTH) * 2 - 1;
        var ty = -(y / ACTUALHEIGHT) * 2 + 1;

        var vector = new THREE.Vector3(tx, ty, 1);
        projector.unprojectVector(vector, camera);

        var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

        var intersects = raycaster.intersectObjects(objects);

        if (intersects.length > 0) {
            return {
                object: intersects[0].object,
                point: intersects[0].point
            };
        }
        else {
            return false;
        }
    };
});