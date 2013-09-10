/* globals define */

define([], function () {
    'use strict';
    function KeyValue () {
        var data = {};
        
        this.get = function (i) {
            if(data[i]) {
                return data[i];
            }
        };
        
        this.set = function  (i,j) {
            data[i] = j;
        };
    }
    
    function Store(taskIn) {
		if (Store.prototype._singletonInstance) {
			return Store.prototype._singletonInstance;
		}
		Store.prototype._singletonInstance = this;
        
        var addCategory = function (i) {
            this.data[i] = new KeyValue();
        };
        
        this.data = {};
        
        this.addCategory = addCategory;
    }

    return Store;
});