define([], function () {

	(function () {
		function CustomEvent(event, params) {
			params = params || {
				bubbles: false,
				cancelable: false,
				detail: undefined
			};
			var evt = document.createEvent('CustomEvent');
			evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
			return evt;
		}

		CustomEvent.prototype = window.CustomEvent.prototype;

		window.CustomEvent = CustomEvent;
	})();

	function Stack() {
		try {
			throw Error()
		}
		catch (ex) {
			return ex.stack
		}
	};

	return function (listenTarget) {
		var oldPos = {
			x: 0,
			y: 0
		};
		var debounce = Date.now();
		var dragTimeout = Date.now();
		var el = listenTarget;
		var dragTriggerRadius = 10;
		var disableMouseEvents = false;

		//boolean for wehther users is currently touching, dragging
		var interaction = false;
		var interactionStart = 0;
		var interactionStartLocation = {};
		var dragging = false;

		var getEventLocation = function (e) {
			var newPos;
			if (e.clientX) newPos = {
				x: e.clientX,
				y: e.clientY
			};
			if (e.touches && e.touches.length > 0) {
				newPos = {
					x: e.touches[0].clientX,
					y: e.touches[0].clientY
				};
			}
			if (newPos === undefined) return;
			return newPos;
		};

		var mousemove = function (e) {
			if (Date.now() - debounce <= 16) return;
			var newPos = getEventLocation(e);
			if (newPos === undefined) return;
			oldPos = newPos;
			var event = new window.CustomEvent('pi-move', {
				'detail': newPos
			});
			el.dispatchEvent(event);

			var distance = Math.sqrt(Math.pow(newPos.x - interactionStartLocation.x, 2) + Math.pow(newPos.y - interactionStartLocation.y, 2));
			var displacement = {
				x: newPos.x - interactionStartLocation.x,
				y: newPos.y - interactionStartLocation.y
			};
			if (distance >= dragTriggerRadius) {
				var eventDrag = new window.CustomEvent('pi-drag', {
					'detail': {
						current: newPos,
						distance: distance,
						displacement: displacement
					}
				});
				if (dragging) {
					if (Date.now() - dragTimeout > 100) {
						mouseup(e, true);
						return;
					}
					dragTimeout = Date.now();
				}
				el.dispatchEvent(eventDrag);
				if (!dragging) {
					dragTimeout = Date.now();
					dragging = true;
					var event2 = new window.CustomEvent('pi-dragStart', {
						'detail': newPos
					});
					el.dispatchEvent(event2);
				}
			}
		};

		var mousedown = function (e) {
			var newPos = getEventLocation(e);
			interaction = true;
			interactionStart = Date.now();
			interactionStartLocation = {
				x: newPos.x,
				y: newPos.y
			};
			oldPos = interactionStartLocation;
		};

		var mouseup = function (e, noclick) {
			if (interactionStart === 0 || interaction === false || interactionStartLocation.x === undefined) {
				return;
			}

			var newPos = oldPos;
			var distance = Math.pow(newPos.x - interactionStartLocation.x, 2) + Math.pow(newPos.y - interactionStartLocation.y, 2);
			var length = Date.now() - interactionStart;

			if (dragging === false && !noclick && length <= 500 || distance <= dragTriggerRadius) {
				var event = new window.CustomEvent('pi-click', {
					'detail': newPos
				});
				el.dispatchEvent(event);
			}
			if (dragging === true) {
				dragging = false;
				var eventDragEnd = new window.CustomEvent('pi-dragEnd', {
					'detail': newPos
				});
				el.dispatchEvent(eventDragEnd);
			}
			interaction = false;
			interactionStart = 0;
			interactionStartLocation = {};
		};

		var touchMove = function (e) {
			mousemove(e);
			e.preventDefault();
		};

		var touchStart = function (e) {
			disableMouseEvents = true;
			mousedown(e);
		};

		var touchEnd = function (e) {
			mouseup(e);
		};

		var cursorDown = function (e) {
			if (!disableMouseEvents) {
				mousedown(e);
			}
		}

		var cursorUp = function (e) {
			if (!disableMouseEvents) {
				mouseup(e);
			}
			disableMouseEvents = false;
		}

		var touchCancel = function (e) {
			console.warn('touchcancel');
			mouseup(e, true);
		};

		this.getCoords = function () {
			return oldPos;
		};

		this.addMoveHandler = function (func) {
			el.addEventListener('pi-move', func, false);
		};

		this.addClickHandler = function (func) {
			el.addEventListener('pi-click', func, false);
		};

		this.addDragHandler = function (func) {
			el.addEventListener('pi-drag', func, false);
		};

		this.addDragStartHandler = function (func) {
			el.addEventListener('pi-dragStart', func, false);
		};

		this.addDragEndHandler = function (func) {
			el.addEventListener('pi-dragEnd', func, false);
		};

		//Set listeners
		listenTarget.addEventListener('mousemove', mousemove, false);
		listenTarget.addEventListener('mousedown', cursorDown, false);
		listenTarget.addEventListener('mouseup', cursorUp, false);
		el.addEventListener("touchstart", touchStart, false);
		el.addEventListener("touchend", touchEnd, false);
		el.addEventListener("touchcancel", touchCancel, false);
		el.addEventListener("touchleave", touchEnd, false);
		el.addEventListener("touchmove", touchMove, false);

	};
});