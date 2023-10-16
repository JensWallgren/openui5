";use strict";

var oToken = Object.create(null);

export function _merge() {
	/*
		* The code in this function is taken from jQuery 3.6.0 "jQuery.extend" and got modified.
		*
		* jQuery JavaScript Library v3.6.0
		* https://jquery.com/
		*
		* Copyright OpenJS Foundation and other contributors
		* Released under the MIT license
		* https://jquery.org/license
		*/
	var src, copyIsArray, copy, name, options, clone,
		target = arguments[2] || {},
		i = 3,
		length = arguments.length,
		deep = arguments[0] || false,
		skipToken = arguments[1] ? undefined : oToken;

	// Handle case when target is a string or something (possible in deep copy)
	if (typeof target !== "object" && typeof target !== "function") {
		target = {};
	}

	for ( ; i < length; i++ ) {
		if ( ( options = arguments[ i ] ) != null ) {

			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				// Prevent Object.prototype pollution for $.extend( true, ... )
				// For further information, please visit https://github.com/jquery/jquery/pull/4333
				if ( name === "__proto__" || target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( isPlainObject( copy ) ||
					( copyIsArray = Array.isArray( copy ) ) ) ) {

					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && Array.isArray( src ) ? src : [];

					} else {
						clone = src && isPlainObject( src ) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = fnMerge( deep, arguments[1], clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== skipToken ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
}