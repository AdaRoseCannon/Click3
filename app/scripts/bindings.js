define(['libs/pointerInteractions', 'libs/requestAnimSingleton', 'renderloop', 'libs/selectObjectFromScreen', 'libs/store'], function(PointerInteractions, AnimRequest, renderloop, selectObjectFromScreen, Store) {
    
    var store = new Store();
    var render = store.data.render;
    var renderer = render.get('renderer');
    var scene = render.get('scene');
    var camera = render.get('camera');
    var sceneObjects = render.get('sceneObjects');
    var bigPlane = render.get('bigPlane');
    
    var mouseEventHandler = new PointerInteractions(renderer.domElement);


    var doer = new AnimRequest(function() {
        renderloop(renderer, scene, camera);
    });
    doer.start();

    mouseEventHandler.addClickHandler(function(e) {
        var clickObjects = render.get('clickables');
        var collide = selectObjectFromScreen(e.detail.x, e.detail.y, camera, clickObjects);
        if (collide) collide.object.recieveClick();
    });

    var cameraDragStart = false;
    var cameraDragStartPosition = false;
    mouseEventHandler.addDragStartHandler(function(e) {
        bigPlane.position.x = camera.position.x;
        bigPlane.position.z = camera.position.z;
        cameraDragStartPosition = camera.position;
        cameraDragStart = selectObjectFromScreen(e.detail.x, e.detail.y, camera, [bigPlane]).point;
    });

    mouseEventHandler.addDragEndHandler(function(e) {
        cameraDragStart = false;
        cameraDragStartPosition = false;
    });

    mouseEventHandler.addDragHandler(function(e) {
        var collide = selectObjectFromScreen(e.detail.current.x, e.detail.current.y, camera, [bigPlane]);
        if (cameraDragStart && collide) {
            camera.position.x = cameraDragStartPosition.x - (collide.point.x - cameraDragStart.x);
            camera.position.z = cameraDragStartPosition.z - (collide.point.z - cameraDragStart.z);
        }
    });
});