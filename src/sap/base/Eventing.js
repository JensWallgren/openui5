import { Event } from "/microui5/src/sap/base/Event.js";
"use strict";

export class Eventing {
	attachEvent(sType, fnFunction, oData) {
		this.mEventRegistry = this.mEventRegistry || {};
		assert(typeof (sType) === "string" && sType, "Eventing.attachEvent: sType must be a non-empty string");
		assert(typeof (fnFunction) === "function", "Eventing.attachEvent: fnFunction must be a function");

		var aEventListeners = this.mEventRegistry[sType];
		if ( !Array.isArray(aEventListeners) ) {
			aEventListeners = this.mEventRegistry[sType] = [];
		}

		aEventListeners.push({fnFunction: fnFunction, oData: oData});

		return this;
	}

	attachEventOnce(sType, fnFunction, oData) {
		var fnOnce = function() {
			this.detachEvent(sType, fnOnce);
			fnFunction.apply(this, arguments);  // needs to do the same resolution as in fireEvent
		};
		fnOnce.oOriginal = {
			fnFunction: fnFunction,
			oData: oData
		};
		this.attachEvent(sType, fnOnce, oData);
		return this;
	}

	detachEvent(sType, fnFunction) {
		this.mEventRegistry = this.mEventRegistry || {};
		assert(typeof (sType) === "string" && sType, "Eventing.detachEvent: sType must be a non-empty string" );
		assert(typeof (fnFunction) === "function", "Eventing.detachEvent: fnFunction must be a function");

		var aEventListeners = this.mEventRegistry[sType];
		if ( !Array.isArray(aEventListeners) ) {
			return this;
		}

		var oFound, oOriginal;

		for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
			if (aEventListeners[i].fnFunction === fnFunction) {
				oFound = aEventListeners[i];
				aEventListeners.splice(i,1);
				break;
			}
		}
		// If no listener was found, look for original listeners of attachEventOnce
		if (!oFound) {
			for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
				oOriginal = aEventListeners[i].fnFunction.oOriginal;
				if (oOriginal && oOriginal.fnFunction === fnFunction) {
					oFound = oOriginal;
					aEventListeners.splice(i,1);
					break;
				}
			}
		}
		// If we just deleted the last registered EventHandler, remove the whole entry from our map.
		if (aEventListeners.length == 0) {
			delete this.mEventRegistry[sType];
		}

		return this;
	}

	fireEvent(sType, oParameters, bAllowPreventDefault, bEnableEventBubbling) {

		// get optional parameters right
		if (typeof oParameters === "boolean") {
			bEnableEventBubbling = bAllowPreventDefault;
			bAllowPreventDefault = oParameters;
		}
		/* eslint-disable consistent-this */
		var oProvider = this,
		/* eslint-enable consistent-this */
			bPreventDefault = false,
			aEventListeners, oEvent, i, iL, oInfo;

		do {
			oProvider.mEventRegistry = oProvider.mEventRegistry || {};
			aEventListeners = oProvider.mEventRegistry[sType];

			if ( Array.isArray(aEventListeners) ) {

				// avoid issues with 'concurrent modification' (e.g. if an event listener unregisters itself).
				aEventListeners = aEventListeners.slice();
				oEvent = new oProvider.fnEventClass(sType, this, oParameters);

				for (i = 0, iL = aEventListeners.length; i < iL; i++) {
					oInfo = aEventListeners[i];
					oInfo.fnFunction.call(oProvider, oEvent, oInfo.oData);
				}

				bEnableEventBubbling = bEnableEventBubbling && !oEvent.bCancelBubble;
			}

			oProvider = oProvider.getEventingParent();

		} while (bEnableEventBubbling && oProvider);

		if ( oEvent ) {
			// remember 'prevent default' state before returning event to the pool
			bPreventDefault = oEvent.bPreventDefault;
		}

		// return 'execute default' flag only when 'prevent default' has been enabled, otherwise return 'this' (for compatibility)
		return bAllowPreventDefault ? !bPreventDefault : this;
	}

	hasListeners(sType) {
		return !!(this.mEventRegistry && this.mEventRegistry[sType]);
	}

	static getEventList = function(oEventing) {
		return oEventing.mEventRegistry || {};
	};

	static hasListener = function(oEventing, sType, fnFunction) {
		assert(typeof (sType) === "string" && sType, "Eventing.hasListener: sType must be a non-empty string" );
		assert(typeof (fnFunction) === "function", "Eventing.hasListener: fnFunction must be a function");

		var aEventListeners = oEventing && oEventing.mEventRegistry[sType];
		if ( aEventListeners ) {
			for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
				if (aEventListeners[i].fnFunction === fnFunction) {
					return true;
				}
			}
		}

		return false;
	};

	getEventingParent() {
		return null;
	}

	destroy() {
		this.mEventRegistry = {};
	}
}