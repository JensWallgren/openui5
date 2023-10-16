"use strict";

export class Deferred {
	constructor() {
		var that = this;

		this.promise = new Promise(function(resolve, reject) {
			that.resolve = resolve;
			that.reject = reject;
		});
	};
}
