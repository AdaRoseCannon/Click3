/*global define, THREE, $*/
define([], function () {
    'use strict';
    return function (options) {
        var tileDifficulty = options.difficulty ? options.difficulty : 0;
        var tileContent =  options.content ? options.content : {blank: 0xFF00CC};
        var position =  options.position ? options.position : {x: 0, y: 0, z: 0};
        var geometry = [];
        var material = [];
        var actor = [];

        var changeMaterial = function () {
            this.material.color.setHex(Math.random() * 0xffffff);
        };

        for (var tile in tileContent) {
            switch(tile) {
            case 'blank':
                material.push(new THREE.MeshLambertMaterial({color:  tileContent[tile]}));
                geometry.push(new THREE.PlaneGeometry(100, 100));
                var t = actor.push(new THREE.Mesh(geometry[0], material[0])) - 1;
                actor[t].position = position;
                actor[t].rotation.x = -Math.PI / 2;
                actor[t].recieveClick = changeMaterial;
                break;
            }
        }
        
        this.getContent = function () {
            return tileContent;
        };
        
        this.getDifficulty = function () {
            return tileDifficulty;
        };
        
        this.getModel = function (i) {
            if (i === undefined) {
                return actor;
            }
            return actor[i];
        };
    };
});