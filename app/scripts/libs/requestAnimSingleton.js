 define([], function () {
    function AnimRequest(taskIn) {
        if ( AnimRequest.prototype._singletonInstance ) {
            return AnimRequest.prototype._singletonInstance;
        }
        AnimRequest.prototype._singletonInstance = this;
    
        var requestAnimFrame = (function(){
          return  window.requestAnimationFrame       ||
                  window.webkitRequestAnimationFrame ||
                  window.mozRequestAnimationFrame    ||
                  function( callback ){
                    window.setTimeout(callback, 1000 / 60);
                  };
        })();
        
        var doing = false;
        var task = taskIn;
        
        this.start = function () {
            doThing();
            doing = true;
        };
        
        this.stop = function () {
            doing = false;
        };
        
        var doThing = function () {
            task();
            requestAnimFrame(doThing);
        };
    }
    return AnimRequest;
});