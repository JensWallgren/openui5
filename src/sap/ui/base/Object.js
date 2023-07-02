"use strict";


class BaseObject {
	isA(vTypeName) {
		return this.getMetadata().isA(vTypeName);
	};

	isA(oObject, vTypeName) {
		return oObject instanceof BaseObject && oObject.isA(vTypeName);
	};

	_Interface(oObject, aMethods, _bReturnFacade) {
		// if object is null or undefined, return itself
		if (!oObject) {
			return oObject;
		}

		function fCreateDelegator(oObject, sMethodName) {
			return function() {
					// return oObject[sMethodName].apply(oObject, arguments);
					var tmp = oObject[sMethodName].apply(oObject, arguments);
					// to avoid to hide the implementation behind the interface you need
					// to override the getInterface function in the object or create the interface with bFacade = true
					if (_bReturnFacade) {
						return this;
					} else {
						return (tmp instanceof BaseObject) ? tmp.getInterface() : tmp;
					}
				};
		}

		// if there are no methods return
		if (!aMethods) {
			return {};
		}

		var sMethodName;

		// create functions for all delegated methods
		// PERFOPT: 'cache' length of aMethods to reduce # of resolutions
		for (var i = 0, ml = aMethods.length; i < ml; i++) {
			sMethodName = aMethods[i];
			//!oObject[sMethodName] for 'lazy' loading interface methods ;-)
			if (!oObject[sMethodName] || typeof oObject[sMethodName] === "function") {
				this[sMethodName] = fCreateDelegator(oObject, sMethodName);
			}
		}
	};
}