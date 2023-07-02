"use strict";

function isFunction(obj) {
    return typeof obj === "function";
}

class MetaData {
    extend(oClassInfo) {
        this.applySettings(oClassInfo);
        this.afterApplySettings();
    };

    applySettings(oClassInfo) {
        var that = this,
            oStaticInfo = oClassInfo.metadata,
            oPrototype;

        if ( oStaticInfo.baseType ) {
            var oParentClass;
            if ( isFunction(oStaticInfo.baseType) ) {
                oParentClass = oStaticInfo.baseType;
                if ( !isFunction(oParentClass.getMetadata) ) {
                    throw new TypeError("baseType must be a UI5 class with a static getMetadata function");
                }
            } else {
                // lookup base class by its name - same reasoning as above
                oParentClass = ObjectPath.get(oStaticInfo.baseType);
                if ( !isFunction(oParentClass) ) {
                    Log.fatal("base class '" + oStaticInfo.baseType + "' does not exist");
                }
            }
            // link metadata with base metadata
            if ( oParentClass.getMetadata ) {
                this._oParent = oParentClass.getMetadata();
                assert(oParentClass === oParentClass.getMetadata().getClass(), "Metadata: oParentClass must match the class in the parent metadata");
            } else {
                // fallback, if base class has no metadata - can only happen if baseType is a string
                this._oParent = new Metadata(oStaticInfo.baseType, {});
            }
        } else {
            this._oParent = undefined;
        }

        this._bAbstract = !!oStaticInfo["abstract"];
        this._bFinal = !!oStaticInfo["final"];
        this._sStereotype = oStaticInfo.stereotype || (this._oParent ? this._oParent._sStereotype : "object");
        this._bDeprecated = !!oStaticInfo["deprecated"];
        this._aInterfaces = oStaticInfo.interfaces || [];
        this._aPublicMethods = oStaticInfo.publicMethods || [];
        this._bInterfacesUnique = false;

        oPrototype = this._oClass.prototype;
        for ( var n in oClassInfo ) {
            if ( n !== "metadata" && n !== "constructor") {
                oPrototype[n] = oClassInfo[n];
                if ( !n.match(/^_|^on|^init$|^exit$/)) {
                    // TODO hard coded knowledge about event handlers ("on") and about init/exit hooks is not nice....
                    that._aPublicMethods.push(n);
                }
            }
        }
    };

    afterApplySettings() {
        // create the flattened "all" view
        if ( this._oParent ) {
            this._aAllPublicMethods = this._oParent._aAllPublicMethods.concat(this._aPublicMethods);
            this._bInterfacesUnique = false;
        } else {
            this._aAllPublicMethods = this._aPublicMethods;
        }
    };

    getStereotype() { return this._sStereotype; };
    getName() { return this._sClassName; };
    getClass() { return this._oClass; };
    getParent() { return this._oParent; };
    getPublicMethods() { return this._aPublicMethods; };
    getAllPublicMethods() { return this._aAllPublicMethods; };
    getInterfaces() { return this._aInterfaces; };

    /**
     * Checks whether the described class or one of its ancestor classes implements the given interface.
     *
     * @param {string} sInterface name of the interface to test for (in dot notation)
     * @return {boolean} whether this class implements the interface
     * @public
     */
    isInstanceOf(sInterface) {
        if ( this._oParent ) {
            if ( this._oParent.isInstanceOf(sInterface) ) {
                return true;
            }
        }

        var a = this._aInterfaces;
        for (var i = 0,l = a.length; i < l; i++) {
            // FIXME doesn't handle interface inheritance (requires object representation for interfaces)
            if ( a[i] === sInterface ) {
                return true;
            }
        }

        return false;
    };

    /*
	* Lazy calculation of the set of implemented types.
	*
	* A calculation function is configured as getter for the <code>_mImplementedTypes</code>
	* on the prototype object. On first call for a metadata instance, it collects
	* the implemented types (classes, interfaces) from the described class and
	* any base classes and writes it to the property <code>_mImplementedTypes</code> of the
	* current instance of metadata. Future read access to the property will immediately
	* return the instance property and not call the calculation function again.
	*/
    getImplementedTypes() {
        if ( this === Metadata.prototype ) {
            throw new Error("sap.ui.base.Metadata: The '_mImplementedTypes' property must not be accessed on the prototype");
        }

        // create map of types, including inherited types
        // Note: to save processing time and memory, the inherited types are merged via the prototype chain of 'result'
        var result = Object.create(this._oParent ? this._oParent._mImplementedTypes : null);

        // add own class
        result[this._sClassName] = true;

        // additionally collect interfaces
        var aInterfaces = this._aInterfaces,
            i = aInterfaces.length;
        while ( i-- > 0 ) {
            if ( !result[aInterfaces[i]] ) {
                // take care to write property only if it hasn't been set already
                result[aInterfaces[i]] = true;
            }
        }

        // write instance property, hiding the getter on the prototype
        Object.defineProperty(this, "_mImplementedTypes", {
            value: Object.freeze(result),
            writable: false,
            configurable: false
        });

        return result;
    }

    isA(vTypeName) {
        var mTypes = this._mImplementedTypes;
        if ( Array.isArray(vTypeName) ) {
            for ( var i = 0; i < vTypeName.length; i++ ) {
                if ( vTypeName[i] in mTypes ) {
                    return true;
                }
            }
            return false;
        }
        // Note: the check with 'in' also finds inherited types via the prototype chain of mTypes
        return vTypeName in mTypes;
    };

    isAbstract() { return this._bAbstract; };
    isFinal() { return this._bFinal; };
    isDeprecated() { return this._bDeprecated; };

    addPublicMethods(sMethod) {
        var aNames = (sMethod instanceof Array) ? sMethod : arguments;
        Array.prototype.push.apply(this._aPublicMethods, aNames);
        Array.prototype.push.apply(this._aAllPublicMethods, aNames);
        this._bInterfacesUnique = false;
    };

    createClass(fnBaseClass, sClassName, oClassInfo, FNMetaImpl) {
        if ( typeof fnBaseClass === "string" ) {
            FNMetaImpl = oClassInfo;
            oClassInfo = sClassName;
            sClassName = fnBaseClass;
            fnBaseClass = null;
        }

        assert(!fnBaseClass || isFunction(fnBaseClass));
        assert(typeof sClassName === "string" && !!sClassName);
        assert(!oClassInfo || typeof oClassInfo === "object");
        assert(!FNMetaImpl || isFunction(FNMetaImpl));

        // allow metadata class to preprocess
        FNMetaImpl = FNMetaImpl || Metadata;
        if ( isFunction(FNMetaImpl.preprocessClassInfo) ) {
            oClassInfo = FNMetaImpl.preprocessClassInfo(oClassInfo);
        }

        // normalize oClassInfo
        oClassInfo = oClassInfo || {};
        oClassInfo.metadata = oClassInfo.metadata || {};
        if ( !oClassInfo.hasOwnProperty('constructor') ) {
            oClassInfo.constructor = undefined;
        }

        var fnClass = oClassInfo.constructor;
        assert(!fnClass || isFunction(fnClass));

        // ensure defaults
        if ( fnBaseClass ) {
            // default constructor just delegates to base class
            if ( !fnClass ) {
                if ( oClassInfo.metadata.deprecated ) {
                    // create default factory with deprecation warning
                    fnClass = function() {
                        Log.warning("Usage of deprecated class: " + sClassName);
                        fnBaseClass.apply(this, arguments);
                    };
                } else {
                    // create default factory
                    fnClass = function() {
                        fnBaseClass.apply(this, arguments);
                    };
                }
            }
            // create prototype chain
            fnClass.prototype = Object.create(fnBaseClass.prototype);
            fnClass.prototype.constructor = fnClass;
            // enforce correct baseType
            oClassInfo.metadata.baseType = fnBaseClass;
        } else {
            // default constructor does nothing
            fnClass = fnClass || function() { };
            // enforce correct baseType
            delete oClassInfo.metadata.baseType;
        }
        oClassInfo.constructor = fnClass;

        // make the class visible as JS Object
        ObjectPath.set(sClassName, fnClass);

        // add metadata
        var oMetadata = new FNMetaImpl(sClassName, oClassInfo);
        fnClass.getMetadata = fnClass.prototype.getMetadata = function() {
            return oMetadata;
        };

        // enrich function
        if ( !fnClass.getMetadata().isFinal() ) {
            fnClass.extend = function(sSCName, oSCClassInfo, fnSCMetaImpl) {
                return Metadata.createClass(fnClass, sSCName, oSCClassInfo, fnSCMetaImpl || FNMetaImpl);
            };
        }

        return fnClass;
    };
}
