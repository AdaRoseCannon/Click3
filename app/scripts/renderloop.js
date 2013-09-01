define([], function () {
	var oldTime = 0;

	return function (renderer, scene, camera, mouseEventHandler) {
		var newTime = Date.now();
		var fps = 0;
		if (oldTime !== 0) fps = 1000 / (newTime - oldTime);
		if (newTime - oldTime >= 1000) {
			//pause here
		}
		oldTime = newTime;
		renderer.render(scene, camera);
	}
});