import { BaseObject } from "/microui5/src/sap/ui/base/Object.js";
"use strict";

export class EventProvider extends BaseObject {
	constructor() {
		BaseObject.call(this);
		this.mEventRegistry = {};
	}

	static EVENT__LISTENERS_CHANGED = "EventHandlerChange";
	static M_EVENTS = { EventHandlerChange: this.EVENT__LISTENERS_CHANGED };

	attachEvent(sEventId, oData, fnFunction, oListener) {
		var mEventRegistry = this.mEventRegistry;
		assert(typeof (sEventId) === "string" && sEventId, "EventProvider.attachEvent: sEventId must be a non-empty string");
		if (typeof (oData) === "function") {
		//one could also increase the check in the line above
		//if(typeof(oData) === "function" && oListener === undefined) {
			oListener = fnFunction;
			fnFunction = oData;
			oData = undefined;
		}
		assert(typeof (fnFunction) === "function", "EventProvider.attachEvent: fnFunction must be a function");
		assert(!oListener || typeof (oListener) === "object", "EventProvider.attachEvent: oListener must be empty or an object");

		oListener = oListener === this ? undefined : oListener;

		var aEventListeners = mEventRegistry[sEventId];
		if ( !Array.isArray(aEventListeners) ) {
			aEventListeners = mEventRegistry[sEventId] = [];
		}

		aEventListeners.push({oListener:oListener, fFunction:fnFunction, oData: oData});

		// Inform interested parties about changed EventHandlers
		if ( mEventRegistry[EVENT__LISTENERS_CHANGED] ) {
			this.fireEvent(EVENT__LISTENERS_CHANGED, {EventId: sEventId, type: 'listenerAttached', listener: oListener, func: fnFunction, data: oData});
		}

		return this;
	};

	attachEventOnce(sEventId, oData, fnFunction, oListener) {
		if (typeof (oData) === "function") {
			oListener = fnFunction;
			fnFunction = oData;
			oData = undefined;
		}
		assert(typeof (fnFunction) === "function", "EventProvider.attachEventOnce: fnFunction must be a function");
		var fnOnce = function() {
			this.detachEvent(sEventId, fnOnce);  // ‘this’ is always the control, due to the context ‘undefined’ in the attach call below
			fnFunction.apply(oListener || this, arguments);  // needs to do the same resolution as in fireEvent
		};
		fnOnce.oOriginal = {
			fFunction: fnFunction,
			oListener: oListener,
			oData: oData
		};
		this.attachEvent(sEventId, oData, fnOnce, undefined); // a listener of ‘undefined’ enforce a context of ‘this’ even after clone
		return this;
	};

	detachEvent(sEventId, fnFunction, oListener) {
		var mEventRegistry = this.mEventRegistry;
		assert(typeof (sEventId) === "string" && sEventId, "EventProvider.detachEvent: sEventId must be a non-empty string" );
		assert(typeof (fnFunction) === "function", "EventProvider.detachEvent: fnFunction must be a function");
		assert(!oListener || typeof (oListener) === "object", "EventProvider.detachEvent: oListener must be empty or an object");

		var aEventListeners = mEventRegistry[sEventId];
		if ( !Array.isArray(aEventListeners) ) {
			return this;
		}

		var oFound, oOriginal;

		oListener = oListener === this ? undefined : oListener;

		//PERFOPT use array. remember length to not re-calculate over and over again
		for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
			//PERFOPT check for identity instead of equality... avoid type conversion
			if (aEventListeners[i].fFunction === fnFunction && aEventListeners[i].oListener === oListener) {
				oFound = aEventListeners[i];
				aEventListeners.splice(i,1);
				break;
			}
		}
		// If no listener was found, look for original listeners of attachEventOnce
		if (!oFound) {
			for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
				oOriginal = aEventListeners[i].fFunction.oOriginal;
				if (oOriginal && oOriginal.fFunction === fnFunction && oOriginal.oListener === oListener) {
					oFound = oOriginal;
					aEventListeners.splice(i,1);
					break;
				}
			}
		}
		// If we just deleted the last registered EventHandler, remove the whole entry from our map.
		if (aEventListeners.length == 0) {
			delete mEventRegistry[sEventId];
		}

		if (oFound && mEventRegistry[EVENT__LISTENERS_CHANGED] ) {
			// Inform interested parties about changed EventHandlers
			this.fireEvent(EVENT__LISTENERS_CHANGED, {EventId: sEventId, type: 'listenerDetached', listener: oFound.oListener, func: oFound.fFunction, data: oFound.oData});
		}

		return this;
	};

	fireEvent(sEventId, oParameters, bAllowPreventDefault, bEnableEventBubbling) {

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
			aEventListeners = oProvider.mEventRegistry[sEventId];

			if ( Array.isArray(aEventListeners) ) {

				// avoid issues with 'concurrent modification' (e.g. if an event listener unregisters itself).
				aEventListeners = aEventListeners.slice();
				oEvent = new Event(sEventId, this, oParameters);

				for (i = 0, iL = aEventListeners.length; i < iL; i++) {
					oInfo = aEventListeners[i];
					oInfo.fFunction.call(oInfo.oListener || oProvider, oEvent, oInfo.oData);
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
	};

	hasListeners(sEventId) {
		return !!this.mEventRegistry[sEventId];
	};

	static getEventList = function(oEventProvider) {
		return oEventProvider.mEventRegistry;
	};

	static hasListener = function (oEventProvider, sEventId, fnFunction, oListener) {
		assert(typeof (sEventId) === "string" && sEventId, "EventProvider.hasListener: sEventId must be a non-empty string" );
		assert(typeof (fnFunction) === "function", "EventProvider.hasListener: fnFunction must be a function");
		assert(!oListener || typeof (oListener) === "object", "EventProvider.hasListener: oListener must be empty or an object");

		var aEventListeners = oEventProvider && oEventProvider.mEventRegistry[sEventId];
		if ( aEventListeners ) {
			for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
				if (aEventListeners[i].fFunction === fnFunction && aEventListeners[i].oListener === oListener) {
					return true;
				}
			}
		}

		return false;
	};

	getEventingParent() {
		return null;
	};

	toString() {
		if ( this.getMetadata ) {
			return "EventProvider " + this.getMetadata().getName();
		} else {
			return "EventProvider";
		}
	};

	destroy() {
		this.mEventRegistry = {};
		BaseObject.prototype.destroy.apply(this, arguments);
	};
}