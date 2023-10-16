"use strict";

export class Event {
	EVENT_PARAMETERS_SYMBOL = Symbol("parameters");
	type;
	target;
	bStopPropagation = false;
	bPreventDefault = false;

	constructor(sType, oTarget, oParameters) {
		if (arguments.length > 0) {
			this.type = sType;
			this.target = oTarget;

			//copy & freeze parameters
			for (var param in oParameters) {
				this[param] = oParameters[param];
				Object.defineProperty(this, param, { configurable: false, writable: false });
			}
			this[EVENT_PARAMETERS_SYMBOL] = oParameters;

			Object.defineProperty(this, "type", { configurable: false, writable: false });
			Object.defineProperty(this, "target", { configurable: false, writable: false });
		}
	};

	preventDefault() {
		this.bPreventDefault = true;
	};

	stopPropagation() {
		this.bStopPropagation = true;
	};

	getParameters(oEvent) {
		return oEvent[EVENT_PARAMETERS_SYMBOL];
	};
}