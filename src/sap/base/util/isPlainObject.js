"use strict";

export function isPlainObject(obj) {
	var class2type = {};
	var hasOwn = class2type.hasOwnProperty;
	var toString = class2type.toString;
	var fnToString = hasOwn.toString;
	var ObjectFunctionString = fnToString.call( Object );

	/*
		* The code in this function is taken from jQuery 3.6.0 "jQuery.isPlainObject" and got modified.
		*
		* jQuery JavaScript Library v3.6.0
		* http://jquery.com/
		*
		* Copyright OpenJS Foundation and other contributors
		* Released under the MIT license
		* http://jquery.org/license
		*/
	var proto, Ctor;

	// Detect obvious negatives
	// Use toString instead of jQuery.type to catch host objects
	if ( !obj || toString.call( obj ) !== "[object Object]" ) {
		return false;
	}

	proto = Object.getPrototypeOf( obj );

	// Objects with no prototype (e.g., `Object.create( null )`) are plain
	if ( !proto ) {
		return true;
	}

	// Objects with a prototype are considered plain only if they were constructed by a global Object function
	Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;

	return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
}
