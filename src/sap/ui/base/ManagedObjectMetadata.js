import { Metadata } from "./Metadata.js";
import { Element } from "../core/Element.js";

"use strict";

var Kind = {
	SPECIAL_SETTING: -1,
	PROPERTY: 0,
	SINGLE_AGGREGATION: 1,
	MULTIPLE_AGGREGATION: 2,
	SINGLE_ASSOCIATION: 3,
	MULTIPLE_ASSOCIATION: 4,
	EVENT: 5
};

export class ManagedObjectMetadata extends Metadata {
	constructor(sClassName, oClassInfo) {
		super(this, arguments);
	}

	static #rPlural = /(children|ies|ves|oes|ses|ches|shes|xes|s)$/i;
	static #mSingular = {'children' : -3, 'ies' : 'y', 'ves' : 'f', 'oes' : -2, 'ses' : -2, 'ches' : -2, 'shes' : -2, 'xes' : -2, 's' : -1 };

	guessSingularName(sName) {
		return sName.replace(ManagedObjectMetadata.#rPlural, function($, sPlural) {
			var vRepl = ManagedObjectMetadata.#mSingular[sPlural.toLowerCase()];
			return typeof vRepl === "string" ? vRepl : sPlural.slice(0, vRepl);
		});
	}

	deprecation(fn, name) {
		return function() {
			Log.warning("Usage of deprecated feature: " + name);
			return fn.apply(this, arguments);
		};
	}

	remainder(obj, info) {
		var result = null;
		for (var n in info) {
			if ( Object.hasOwn(info, n) && typeof obj[n] === 'undefined' ) {
				result = result || {};
				result[n] = info[n];
			}
		}
		return result;
	}

	static addAPIParentInfoBegin(oAggregatedObject, oParent, sAggregationName) {
		if (!oAggregatedObject) {
			return;
		}

		var oNewAPIParentInfo = {parent: oParent, aggregationName: sAggregationName};

		if (oAggregatedObject.aAPIParentInfos) {
			if (oAggregatedObject.aAPIParentInfos.forwardingCounter) { // defined and >= 1
				// this is another forwarding step from an element that was already the target of forwarding
				oAggregatedObject.aAPIParentInfos.forwardingCounter++;
			} else {
				// this is a fresh new round of aggregation forwarding, remove any previous forwarding info
				delete oAggregatedObject.aAPIParentInfos;
			}
		}

		// update API parent of oAggregatedObject
		if (!oAggregatedObject.aAPIParentInfos) {
			oAggregatedObject.aAPIParentInfos = [oNewAPIParentInfo];
			oAggregatedObject.aAPIParentInfos.forwardingCounter = 1;
		} else {
			oAggregatedObject.aAPIParentInfos.push(oNewAPIParentInfo);
		}
	}

	static addAPIParentInfoEnd(oAggregatedObject) {
		oAggregatedObject && oAggregatedObject.aAPIParentInfos && oAggregatedObject.aAPIParentInfos.forwardingCounter--;
	}

	static isGeneratedId(sId) {
		rGeneratedUID = rGeneratedUID || new RegExp( "(^|-{1,3})" + escapeRegExp(ManagedObjectMetadata.getUIDPrefix()) );
		return rGeneratedUID.test(sId);
	}

	static uid() {
		var sId = this._sUIDToken;
		if ( typeof sId !== "string" ) {
			// start with qualified class name
			sId = this.getName();
			// reduce to unqualified name
			sId = sId.slice(sId.lastIndexOf('.') + 1);
			// reduce a camel case, multi word name to the last word
			sId = sId.replace(/([a-z])([A-Z])/g, "$1 $2").split(" ").slice(-1)[0];
			// remove unwanted chars (and no trailing digits!) and convert to lower case
			sId = this._sUIDToken = sId.replace(/([^A-Za-z0-9-_.:])|([0-9]+$)/g,"").toLowerCase();
		}

		return uid(sId);
	}

	uid() { return ManagedObjectMetadata.uid.call(this); }

	getUIDPrefix() {
		if (sUIDPrefix === undefined) {
			sUIDPrefix = BaseConfig.get({
				name: "sapUiUidPrefix",
				type: BaseConfig.Type.String,
				defaultValue: "__",
				freeze: true
			});
		}
		return sUIDPrefix;
	}

	mUIDCounts = {};
	sUIDPrefix;

	uid(sId) {
		assert(!/[0-9]+$/.exec(sId), "AutoId Prefixes must not end with numbers");

		sId = ManagedObjectMetadata.getUIDPrefix() + sId;

		// read counter (or initialize it)
		var iCount = mUIDCounts[sId] || 0;

		// increment counter
		mUIDCounts[sId] = iCount + 1;

		// combine prefix + counter
		// concatenating sId and a counter is only safe because we don't allow trailing numbers in sId!
		return sId + iCount;
	}


	applySettings(oClassInfo) {
		var that = this,
			oStaticInfo = oClassInfo.metadata;

		Metadata.prototype.applySettings.call(this, oClassInfo);

		function normalize(mInfoMap, FNClass) {
			var mResult = {}, sName;
			if ( mInfoMap ) {
				for (sName in mInfoMap) {
					if ( Object.hasOwn(mInfoMap, sName) ) {
						mResult[sName] = new FNClass(that, sName, mInfoMap[sName]);
					}
				}
			}
			return mResult;
		}

		function filter(mInfoMap, bPublic) {
			var mResult = {},sName;
			for (sName in mInfoMap) {
				if ( bPublic === (mInfoMap[sName].visibility === 'public') ) {
					mResult[sName] = mInfoMap[sName];
				}
			}
			return mResult;
		}

		var rLibName = /([a-z][^.]*(?:\.[a-z][^.]*)*)\./;

		function defaultLibName(sName) {
			var m = rLibName.exec(sName);
			return (m && m[1]) || "";
		}

		// init basic metadata from static information and fallback to defaults
		this._sLibraryName = oStaticInfo.library || defaultLibName(this.getName());
		this._mSpecialSettings = normalize(oStaticInfo.specialSettings, this.metaFactorySpecialSetting);
		var mAllProperties = normalize(oStaticInfo.properties, this.metaFactoryProperty);
		this._mProperties = filter(mAllProperties, true);
		this._mPrivateProperties = filter(mAllProperties, false);
		var mAllAggregations = normalize(oStaticInfo.aggregations, this.metaFactoryAggregation);
		this._mAggregations = filter(mAllAggregations, true);
		this._mPrivateAggregations = filter(mAllAggregations, false);
		this._sDefaultAggregation = oStaticInfo.defaultAggregation || null;
		this._sDefaultProperty = oStaticInfo.defaultProperty || null;
		var mAllAssociations = normalize(oStaticInfo.associations, this.metaFactoryAssociation);
		this._mAssociations = filter(mAllAssociations, true);
		this._mPrivateAssociations = filter(mAllAssociations, false);
		this._mEvents = normalize(oStaticInfo.events, this.metaFactoryEvent);

		// as oClassInfo is volatile, we need to store the info
		this._oDesignTime = oClassInfo.metadata["designtime"] || oClassInfo.metadata["designTime"];
		this._sProvider = oClassInfo.metadata["provider"];

		if ( oClassInfo.metadata.__version > 1.0 ) {
			this.generateAccessors();
		}
	}

	afterApplySettings() {
		Metadata.prototype.afterApplySettings.call(this);

		// if there is a parent class, produce the flattened "all" views for the element specific metadata
		// PERFOPT: this could be done lazily
		var oParent = this.getParent();
		if ( oParent instanceof ManagedObjectMetadata ) {
			this._mAllEvents = Object.assign({}, oParent._mAllEvents, this._mEvents);
			this._mAllPrivateProperties = Object.assign({}, oParent._mAllPrivateProperties, this._mPrivateProperties);
			this._mAllProperties = Object.assign({}, oParent._mAllProperties, this._mProperties);
			this._mAllPrivateAggregations = Object.assign({}, oParent._mAllPrivateAggregations, this._mPrivateAggregations);
			this._mAllAggregations = Object.assign({}, oParent._mAllAggregations, this._mAggregations);
			this._mAllPrivateAssociations = Object.assign({}, oParent._mAllPrivateAssociations, this._mPrivateAssociations);
			this._mAllAssociations = Object.assign({}, oParent._mAllAssociations, this._mAssociations);
			this._sDefaultAggregation = this._sDefaultAggregation || oParent._sDefaultAggregation;
			this._sDefaultProperty = this._sDefaultProperty || oParent._sDefaultProperty;
			this._mAllSpecialSettings = Object.assign({}, oParent._mAllSpecialSettings, this._mSpecialSettings);
			this._sProvider = this._sProvider || oParent._sProvider;
		} else {
			this._mAllEvents = this._mEvents;
			this._mAllPrivateProperties = this._mPrivateProperties;
			this._mAllProperties = this._mProperties;
			this._mAllPrivateAggregations = this._mPrivateAggregations;
			this._mAllAggregations = this._mAggregations;
			this._mAllPrivateAssociations = this._mPrivateAssociations;
			this._mAllAssociations = this._mAssociations;
			this._mAllSpecialSettings = this._mSpecialSettings;
		}
	}


	static Kind = Kind;

	getLibraryName() {
		return this._sLibraryName;
	}

	addProperty(sName, oInfo) {
		var oProp = this._mProperties[sName] = new Property(this, sName, oInfo);
		if (!this._mAllProperties[sName]) {// ensure extended AllProperties meta-data is also enriched
			this._mAllProperties[sName] = oProp;
		}

		if (this._fnPropertyBagFactory) {
			// after the property bag class is already created that has the default values of the properties, the
			// default value of the added property needs to be added to the property bag class as well
			this._fnPropertyBagFactory.prototype[sName] = oProp.getDefaultValue();
		}
		// TODO notify listeners (subclasses) about change
	}

	hasProperty(sName) {
		return !!this._mAllProperties[sName];
	}

	getProperty(sName) {
		var oProp = this._mAllProperties[sName];
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oProp === 'object' ? oProp : undefined;
	}

	getProperties() {
		return this._mProperties;
	}

	getAllProperties() {
		return this._mAllProperties;
	}

	getAllPrivateProperties() {
		return this._mAllPrivateProperties;
	}

	getManagedProperty(sName) {
		sName = sName || this._sDefaultProperty;
		var oProp = sName ? this._mAllProperties[sName] || this._mAllPrivateProperties[sName] : undefined;
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oProp === 'object' ? oProp : undefined;
	}

	getDefaultPropertyName() {
		return this._sDefaultProperty;
	}

	getDefaultProperty() {
		return this.getProperty(this.getDefaultPropertyName());
	}

	hasAggregation(sName) {
		return !!this._mAllAggregations[sName];
	}

	getAggregation(sName) {
		sName = sName || this._sDefaultAggregation;
		var oAggr = sName ? this._mAllAggregations[sName] : undefined;
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oAggr === 'object' ? oAggr : undefined;
	}

	getAggregations() {
		return this._mAggregations;
	}

	getAllAggregations() {
		return this._mAllAggregations;
	}

	getAllPrivateAggregations() {
		return this._mAllPrivateAggregations;
	}

	getManagedAggregation(sAggregationName) {
		sAggregationName = sAggregationName || this._sDefaultAggregation;
		var oAggr = sAggregationName ? this._mAllAggregations[sAggregationName] || this._mAllPrivateAggregations[sAggregationName] : undefined;
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oAggr === 'object' ? oAggr : undefined;
	}

	getDefaultAggregationName() {
		return this._sDefaultAggregation;
	}

	getDefaultAggregation() {
		return this.getAggregation();
	}

	forwardAggregation(sForwardedSourceAggregation, mOptions) {
		var oAggregation = this.getAggregation(sForwardedSourceAggregation);
		if (!oAggregation) {
			throw new Error("aggregation " + sForwardedSourceAggregation + " does not exist");
		}

		if (!mOptions || !mOptions.aggregation || !(mOptions.idSuffix || mOptions.getter) || (mOptions.idSuffix && mOptions.getter)) {
			throw new Error("an 'mOptions' object with 'aggregation' property and either 'idSuffix' or 'getter' property (but not both) must be given"
				+ " but does not exist");
		}

		if (oAggregation._oParent === this) {
			// store the information on the aggregation
			oAggregation.forwarding = mOptions;
			oAggregation._oForwarder = new AggregationForwarder(oAggregation);
		} else {
			// aggregation is defined on superclass; clone&modify the aggregation info to contain the forwarding information
			oAggregation = new this.metaFactoryAggregation(this, sForwardedSourceAggregation, {
				type: oAggregation.type,
				altTypes: oAggregation.altTypes,
				multiple: oAggregation.multiple,
				singularName: oAggregation.singularName,
				bindable: oAggregation.bindable,
				deprecated: oAggregation.deprecated,
				visibility: oAggregation.visibility,
				selector: oAggregation.selector,
				forwarding: mOptions
			});
			this._mAggregations[sForwardedSourceAggregation] =
			this._mAllAggregations[sForwardedSourceAggregation] = oAggregation;
		}
	}

	getAggregationForwarder(sAggregationName) {
		var oAggregation = this._mAllAggregations[sAggregationName];
		return oAggregation ? oAggregation._oForwarder : undefined;
	}

	getDefaultPropertyName() {
		return this._sDefaultProperty;
	}

	getDefaultProperty() {
		return this.getProperty(this.getDefaultPropertyName());
	}

	getPropertyLikeSetting(sName) {
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		var oProp = this._mAllProperties[sName];
		if ( typeof oProp === 'object' ) {
			return oProp;
		}
		oProp = this._mAllAggregations[sName];
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return ( typeof oProp === 'object' && oProp.altTypes && oProp.altTypes.length > 0 ) ? oProp : undefined;
	}

	hasAssociation(sName) {
		return !!this._mAllAssociations[sName];
	}

	getAssociation(sName) {
		var oAssoc = this._mAllAssociations[sName];
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oAssoc === 'object' ? oAssoc : undefined;
	}

	getAssociations() {
		return this._mAssociations;
	}

	getAllAssociations() {
		return this._mAllAssociations;
	}

	getAllPrivateAssociations() {
		return this._mAllPrivateAssociations;
	}

	getManagedAssociation(sName) {
		var oAggr = this._mAllAssociations[sName] || this._mAllPrivateAssociations[sName];
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oAggr === 'object' ? oAggr : undefined;
	}

	hasEvent(sName) {
		return !!this._mAllEvents[sName];
	}

	getEvent(sName) {
		var oEvent = this._mAllEvents[sName];
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oEvent === 'object' ? oEvent : undefined;
	}

	getEvents() {
		return this._mEvents;
	}

	getAllEvents() {
		return this._mAllEvents;
	}

	addSpecialSetting = function (sName, oInfo) {
		var oSS = new SpecialSetting(this, sName, oInfo);
		this._mSpecialSettings[sName] = oSS;
		if (!this._mAllSpecialSettings[sName]) {
			this._mAllSpecialSettings[sName] = oSS;
		}
	}

	hasSpecialSetting = function (sName) {
		return !!this._mAllSpecialSettings[sName];
	}

	getPropertyDefaults() {
		var mDefaults = this._mDefaults, s;

		if ( mDefaults ) {
			return mDefaults;
		}

		if ( this.getParent() instanceof ManagedObjectMetadata ) {
			mDefaults = Object.assign({}, this.getParent().getPropertyDefaults());
		} else {
			mDefaults = {};
		}

		for (s in this._mProperties) {
			mDefaults[s] = this._mProperties[s].getDefaultValue();
		}
		//Add the default values for private properties
		for (s in this._mPrivateProperties) {
			mDefaults[s] = this._mPrivateProperties[s].getDefaultValue();
		}
		this._mDefaults = mDefaults;
		return mDefaults;
	}

	createPropertyBag() {
		if ( !this._fnPropertyBagFactory ) {
			this._fnPropertyBagFactory = function PropertyBag() {};
			this._fnPropertyBagFactory.prototype = this.getPropertyDefaults();
		}
		return new (this._fnPropertyBagFactory)();
	}

	getJSONKeys() {
		if ( this._mJSONKeys ) {
			return this._mJSONKeys;
		}

		var mAllSettings = {},
			mJSONKeys = {};

		function addKeys(m) {
			var sName, oInfo, oPrevInfo;
			for (sName in m) {
				oInfo = m[sName];
				oPrevInfo = mAllSettings[sName];
				if ( !oPrevInfo || oInfo._iKind < oPrevInfo._iKind ) {
					mAllSettings[sName] = mJSONKeys[sName] = oInfo;
				}
				mJSONKeys[oInfo._sUID] = oInfo;
			}
		}

		addKeys(this._mAllSpecialSettings);
		addKeys(this.getAllProperties());
		addKeys(this.getAllAggregations());
		addKeys(this.getAllAssociations());
		addKeys(this.getAllEvents());

		this._mJSONKeys = mJSONKeys;
		this._mAllSettings = mAllSettings;
		return this._mJSONKeys;
	}

	getAllSettings() {
		if ( !this._mAllSettings ) {
			this.getJSONKeys();
		}
		return this._mAllSettings;
	}

	removeUnknownSettings(mSettings) {

		assert(mSettings == null || typeof mSettings === 'object', "mSettings must be null or undefined or an object");

		if ( mSettings == null ) {
			return mSettings;
		}

		var mValidKeys = this.getJSONKeys(),
			mResult = {},
			sName;

		for ( sName in mSettings ) {
			if ( Object.hasOwn(mValidKeys, sName) ) {
				mResult[sName] = mSettings[sName];
			}
		}

		return mResult;
	}

	generateAccessors() {

		var proto = this.getClass().prototype,
			prefix = this.getName() + ".",
			methods = this._aPublicMethods,
			n;

		function add(name, fn, info) {
			if ( !proto[name] ) {
				proto[name] = (info && info.deprecated) ? deprecation(fn, prefix + info.name) : fn;
			}
			methods.push(name);
		}

		for (n in this._mProperties) {
			this._mProperties[n].generate(add);
		}
		for (n in this._mAggregations) {
			this._mAggregations[n].generate(add);
		}
		for (n in this._mAssociations) {
			this._mAssociations[n].generate(add);
		}
		for (n in this._mEvents) {
			this._mEvents[n].generate(add);
		}
	}

	loadDesignTime(oManagedObject, sScopeKey) {
		sScopeKey = typeof sScopeKey === "string" && sScopeKey || "default";

		var oInstanceDesigntimeLoaded = loadInstanceDesignTime(oManagedObject);

		if (!this._oDesignTimePromise) {
			// Note: parent takes care of merging its ancestors
			var oWhenParentLoaded;
			var oParent = this.getParent();
			// check if the mixin is applied to the parent
			if (oParent instanceof ManagedObjectMetadata) {
				oWhenParentLoaded = oParent.loadDesignTime(null, sScopeKey);
			} else {
				oWhenParentLoaded = Promise.resolve({});
			}
			// Note that the ancestor designtimes and the own designtime will be loaded 'in parallel',
			// only the merge is done in sequence by chaining promises
			this._oDesignTimePromise = loadOwnDesignTime(this).then(function(mOwnDesignTime) {
				return oWhenParentLoaded.then(function(mParentDesignTime) {
					return mergeDesignTime(mOwnDesignTime, mParentDesignTime, sScopeKey);
				});
			});
		}

		return Promise.all([oInstanceDesigntimeLoaded, this._oDesignTimePromise])
			.then(function(aData){
				var oInstanceDesigntime = aData[0],
					oDesignTime = aData[1];
				return merge(
					{},
					oDesignTime,
					getScopeBasedDesignTime(oInstanceDesigntime || {}, sScopeKey)
				);
			});
	}

	static setDesignTimeDefaultMapping(mPredefinedDesignTime) {
		mPredefinedDesignTimeModules = mPredefinedDesignTime;
	}
	
}


export class SpecialSetting {
	 constructor(oClass, name, info) {
		info = typeof info !== 'object' ? { type: info } : info;
		this.name = name;
		this.type = info.type || 'any';
		this.visibility = info.visibility || 'public';
		this.defaultValue = info.defaultValue;
		this.appData = remainder(this, info);
		this._oParent = oClass;
		this._sUID = "special:" + name;
		this._iKind = Kind.SPECIAL_SETTING;
	 }
}

export class Property {
	constructor(oClass, name, info) {
		info = typeof info !== 'object' ? { type: info } : info;
		this.name = name;
		this.type = info.type || 'string';
		this.group = info.group || 'Misc';
		this.defaultValue = info.defaultValue !== null ? info.defaultValue : null;
		this.bindable = !!info.bindable;
		this.deprecated = !!info.deprecated || false;
		this.visibility = info.visibility || 'public';
		this.byValue = info.byValue === true; // non-boolean values reserved for the future
		this.selector = typeof info.selector === "string" ? info.selector : null;
		this.appData = remainder(this, info);
		this._oParent = oClass;
		this._sUID = name;
		this._iKind = Kind.PROPERTY;
		var N = capitalize(name);
		this._sMutator = 'set' + N;
		this._sGetter = 'get' + N;
		if ( this.bindable ) {
			this._sBind =  'bind' + N;
			this._sUnbind = 'unbind' + N;
		} else {
			this._sBind =
			this._sUnbind = undefined;
		}
		this._oType = null;
	}

	generate(add) {
		var that = this,
			n = that.name;

		add(that._sGetter, function() { return this.getProperty(n); });
		add(that._sMutator, function(v) { this.setProperty(n,v); return this; }, that);
		if ( that.bindable ) {
			add(that._sBind, function(p,fn,m) { this.bindProperty(n,p,fn,m); return this; }, that);
			add(that._sUnbind, function(p) { this.unbindProperty(n,p); return this; });
		}
	}

	getType() {
		if (!this._oType) {
			this._oType = DataType.getType(this.type);
		}
		return this._oType;
	}

	getDefaultValue() {
		var oDefaultValue = this.defaultValue,
			oType;

		if ( oDefaultValue === null ) {
			oType = this.getType();
			if ( oType instanceof DataType ) {
				oDefaultValue = oType.getDefaultValue();
			}
		}

		return oDefaultValue;
	}

	get(instance) {
		if ( this.visibility !== 'public' ) {
			return instance.getProperty(this.name);
		}
		return instance[this._sGetter]();
	}

	set(instance, oValue) {
		if ( this.visibility !== 'public' ) {
			return instance.setProperty(this.name, oValue);
		}
		return instance[this._sMutator](oValue);
	}
}

export class Aggregation {
	constructor(oClass, name, info) {
		info = typeof info !== 'object' ? { type: info } : info;
		this.name = name;
		this.type = info.type || 'sap.ui.core.Control';
		this.altTypes = Array.isArray(info.altTypes) ? info.altTypes : undefined;
		this.multiple = typeof info.multiple === 'boolean' ? info.multiple : true;
		this.singularName = this.multiple ? info.singularName || guessSingularName(name) : undefined;
		this.bindable = !!info.bindable;
		this.deprecated = info.deprecated || false;
		this.visibility = info.visibility || 'public';
		this.selector = info.selector || null;
		this.forwarding = info.forwarding;
		this._doesNotRequireFactory = !!info._doesNotRequireFactory; // TODO clarify if public
		this.appData = remainder(this, info);
		this._oParent = oClass;
		this._sUID = 'aggregation:' + name;
		this._iKind = this.multiple ? Kind.MULTIPLE_AGGREGATION : Kind.SINGLE_AGGREGATION;
		this._oForwarder = this.forwarding ? new AggregationForwarder(this) : undefined;
		var N = capitalize(name);
		this._sGetter = 'get' + N;
		if ( this.multiple ) {
			var N1 = capitalize(this.singularName);
			this._sMutator = 'add' + N1;
			this._sInsertMutator = 'insert' + N1;
			this._sRemoveMutator = 'remove' + N1;
			this._sRemoveAllMutator = 'removeAll' + N;
			this._sIndexGetter = 'indexOf' + N1;
			this._sUpdater = 'update' + N;
			this._sRefresher = 'refresh' + N;
		} else {
			this._sMutator = 'set' + N;
			this._sInsertMutator =
			this._sRemoveMutator =
			this._sRemoveAllMutator =
			this._sIndexGetter =
			this._sUpdater =
			this._sRefresher = undefined;
		}
		this._sDestructor = 'destroy' + N;
		if ( this.bindable ) {
			this._sBind = 'bind' + N;
			this._sUnbind = 'unbind' + N;
		} else {
			this._sBind =
			this._sUnbind = undefined;
		}
	}

	generate(add) {
		var that = this,
			n = that.name;

		if ( !that.multiple ) {
			add(that._sGetter, function() { return this.getAggregation(n); });
			add(that._sMutator, function(v) { this.setAggregation(n,v); return this; }, that);
		} else {
			add(that._sGetter, function() { return this.getAggregation(n,[]); });
			add(that._sMutator, function(a) { this.addAggregation(n,a); return this; }, that);
			add(that._sInsertMutator, function(i,a) { this.insertAggregation(n,i,a); return this; }, that);
			add(that._sRemoveMutator, function(a) { return this.removeAggregation(n,a); });
			add(that._sRemoveAllMutator, function() { return this.removeAllAggregation(n); });
			add(that._sIndexGetter, function(a) { return this.indexOfAggregation(n,a); });
		}
		add(that._sDestructor, function() { this.destroyAggregation(n); return this; });
		if ( that.bindable ) {
			add(that._sBind, function(p,t,s,f) { this.bindAggregation(n,p,t,s,f); return this; }, that);
			add(that._sUnbind, function(p) { this.unbindAggregation(n,p); return this; });
		}
	}

	getType() {
		if (!this._oType) {
			this._oType = DataType.getType(this.type);
		}
		return this._oType;
	}

	get(instance) {
		if ( this.visibility !== 'public' ) {
			return instance.getAggregation(this.name, this.multiple ? [] : undefined);
		}
		return instance[this._sGetter]();
	}

	set(instance, oValue) {
		if ( this.visibility !== 'public' ) {
			return instance.setAggregation(this.name, oValue);
		}
		return instance[this._sMutator](oValue);
	}

	add(instance, oValue) {
		if ( this.visibility !== 'public' ) {
			return instance.addAggregation(this.name, oValue);
		}
		return instance[this._sMutator](oValue);
	}

	insert(instance, oValue, iPos) {
		if ( this.visibility !== 'public' ) {
			return instance.insertAggregation(this.name, oValue, iPos);
		}
		return instance[this._sInsertMutator](oValue, iPos);
	}

	remove(instance, vValue) {
		if ( this.visibility !== 'public' ) {
			return instance.removeAggregation(this.name, vValue);
		}
		return instance[this._sRemoveMutator](vValue);
	}

	removeAll(instance) {
		if ( this.visibility !== 'public' ) {
			return instance.removeAllAggregation(this.name);
		}
		return instance[this._sRemoveAllMutator]();
	}

	indexOf(instance, oValue) {
		if ( this.visibility !== 'public' ) {
			return instance.indexOfAggregation(this.name, oValue);
		}
		return instance[this._sIndexGetter](oValue);
	}

	destroy(instance) {
		return instance[this._sDestructor]();
	}

	update(instance, sChangeReason, oEventInfo) {
		if (instance[this._sUpdater]) {
			instance[this._sUpdater](sChangeReason, oEventInfo);
		} else {
			instance.updateAggregation(this.name, sChangeReason, oEventInfo);
		}
	}

	refresh(instance, sChangeReason) {
		if (instance[this._sRefresher]) {
			instance[this._sRefresher](sChangeReason);
		} else {
			//fallback there was no refresher before
			this.update(instance, sChangeReason);
		}
	}
}


export class AggregationForwarder {
	constructor(oAggregation) {
		var oForwardTo = oAggregation.forwarding;
		this.aggregation = oAggregation; // source aggregation info
		this.targetAggregationName = oForwardTo.aggregation;
		this.forwardBinding = oForwardTo.forwardBinding;
		this.targetAggregationInfo = null; // resolve lazily

		// make sure we have a way to get the target control
		if (oForwardTo.getter) {
			if (typeof oForwardTo.getter === "function") {
				this._getTarget = oForwardTo.getter;

			} else { // name of the function which returns the target element
				this._getTarget = (function(sGetterName) {
					return function() {
						return this[sGetterName](); // "this" context is the ManagedObject instance
					};
				})(oForwardTo.getter);
			}

		} else if (oForwardTo.idSuffix) { // target given by ID
			this._getTarget = (function(sIdSuffix) {
				return function() {
					return Element.registry.get(this.getId() + sIdSuffix); // "this" context is the ManagedObject instance
				};
			})(oForwardTo.idSuffix);

		} else {
			throw new Error("Either getter or idSuffix must be given for forwarding the aggregation " + oAggregation.name
				+ " to the aggregation " + oForwardTo.aggregation + " in " + oAggregation._oParent.getName());
		}
	}

	_getTargetAggregationInfo(oTarget) {
		var oTargetAggregationInfo = this.targetAggregationInfo;
		if (!oTargetAggregationInfo && oTarget) {
			oTargetAggregationInfo = this.targetAggregationInfo = oTarget.getMetadata().getAggregation(this.targetAggregationName);

			if (!oTargetAggregationInfo) {
				throw new Error("Target aggregation " + this.targetAggregationName + " not found on " + oTarget);
			}

			if (this.aggregation.multiple && !oTargetAggregationInfo.multiple) { // cannot forward multi-to-single
				throw new Error("Aggregation " + this.aggregation + " (multiple: " + this.aggregation.multiple + ") cannot be forwarded to aggregation "
						+ this.targetAggregationName + " (multiple: " + oTargetAggregationInfo.multiple + ")");
			}
			if (!this.aggregation.multiple && oTargetAggregationInfo.multiple && this.aggregation.forwarding.forwardBinding) { // cannot forward bindings for single-to-multi
				throw new Error("Aggregation " + this.aggregation + " (multiple: " + this.aggregation.multiple + ") cannot be forwarded to aggregation "
						+ this.targetAggregationName + " (multiple: " + oTargetAggregationInfo.multiple + ") with 'forwardBinding' set to 'true'");
			}
		}
		return oTargetAggregationInfo;
	}

	getTarget(oInstance, bConnectTargetInfo) {
		var oTarget = this._getTarget.call(oInstance);
		this._getTargetAggregationInfo(oTarget);

		if (oTarget) {
			oInstance.mForwardedAggregations = oInstance.mForwardedAggregations || {};

			if (oInstance.mForwardedAggregations[this.aggregation.name] === undefined || bConnectTargetInfo) {
				// once the target is there, connect the aggregations:
				// Make mForwardedAggregations[name] a pointer to mAggregations[name] of the target, so the former always has the same elements,
				// without the need to update when elements are added/removed and without increasing memory for pointers per aggregated element
				// which would be required in a copy of the map
				var vTargetAggregation = oTarget.mAggregations[this.targetAggregationInfo.name];
				if (vTargetAggregation // target aggregation may not exist yet ... but an empty array is ok
						&& !bConnectTargetInfo
						&& !this.aggregation.forwarding.forwardBinding
						&& !(Array.isArray(vTargetAggregation) && vTargetAggregation.length === 0)) {
					// there should not be any content in the target at the time when the target has been found for the first time
					throw new Error("There is already content in aggregation " + this.targetAggregationInfo.name + " of " + oTarget + " to which forwarding is being set up now.");
				} else {
					var vInitial = oTarget.mAggregations[this.targetAggregationInfo.name] || (this.targetAggregationInfo.multiple ? [] : null); // initialize aggregation for the target
					oInstance.mForwardedAggregations[this.aggregation.name] = oTarget.mAggregations[this.targetAggregationInfo.name] = vInitial;
				}
			}
		}

		return oTarget;
	}

	get(oInstance) {
		var oTarget = this.getTarget(oInstance);
		if (oTarget) {
			var result = this.targetAggregationInfo.get(oTarget);
			if (!this.aggregation.multiple && this.targetAggregationInfo.multiple) { // single-to-multi forwarding
				result = result[0]; // unwrap the element or return undefined if empty array was returned
			}
			return result;
		} else { // before target of forwarding exists
			return this.aggregation.multiple ? [] : null;
		}
	}

	indexOf(oInstance, oAggregatedObject) {
		var oTarget = this.getTarget(oInstance);
		return this.targetAggregationInfo.indexOf(oTarget, oAggregatedObject);
	}

	set(oInstance, oAggregatedObject) {
		var oTarget = this.getTarget(oInstance);
		// TODO oInstance.observer

		oInstance.mForwardedAggregations[this.aggregation.name] = oAggregatedObject;

		if (this.targetAggregationInfo.multiple) {
			// target aggregation is multiple, but should behave like single (because the source aggregation is single)
			var oPreviousElement = this.targetAggregationInfo.get(oTarget);
			if (oPreviousElement && oPreviousElement[0]) {
				if (oPreviousElement[0] === oAggregatedObject) { // no modification if same element is set
					return oInstance;
				}
				this.targetAggregationInfo.removeAll(oTarget);
			}
			ManagedObjectMetadata.addAPIParentInfoBegin(oAggregatedObject, oInstance, this.aggregation.name);
			this.targetAggregationInfo.add(oTarget, oAggregatedObject);
		} else {
			ManagedObjectMetadata.addAPIParentInfoBegin(oAggregatedObject, oInstance, this.aggregation.name);
			this.targetAggregationInfo.set(oTarget, oAggregatedObject);
		}
		ManagedObjectMetadata.addAPIParentInfoEnd(oAggregatedObject);

		return oInstance;
	}

	add(oInstance, oAggregatedObject) {
		var oTarget = this.getTarget(oInstance);
		// TODO oInstance.observer

		ManagedObjectMetadata.addAPIParentInfoBegin(oAggregatedObject, oInstance, this.aggregation.name);
		this.targetAggregationInfo.add(oTarget, oAggregatedObject);
		ManagedObjectMetadata.addAPIParentInfoEnd(oAggregatedObject);

		return oInstance;
	}

	insert(oInstance, oAggregatedObject, iIndex) {
		var oTarget = this.getTarget(oInstance);
		// TODO oInstance.observer

		ManagedObjectMetadata.addAPIParentInfoBegin(oAggregatedObject, oInstance, this.aggregation.name);
		this.targetAggregationInfo.insert(oTarget, oAggregatedObject, iIndex);
		ManagedObjectMetadata.addAPIParentInfoEnd(oAggregatedObject);

		return oInstance;
	}

	remove(oInstance, vAggregatedObject) {
		var oTarget = this.getTarget(oInstance);
		// TODO oInstance.observer
		var result = this.targetAggregationInfo.remove(oTarget, vAggregatedObject);
		// remove API parent of removed element (if any)
		if (result /* && result.aAPIParentInfos */) {
			// the second part should always be true when added via forwarding, but MultiInput still has a function "setTokens"
			// that forwards directly. That one now also sets the API parent info.
			// When aAPIParentInfos is there, then the other conditions are always true:
			// && result.aAPIParentInfos.length && result.aAPIParentInfos[result.aAPIParentInfos.length-1].parent === oInstance
			result.aAPIParentInfos && result.aAPIParentInfos.pop();
		}
		return result;
	}

	removeAll(oInstance) {
		var oTarget = this.getTarget(oInstance);
		// TODO oInstance.observer

		delete oInstance.mForwardedAggregations[this.aggregation.name];

		var aRemoved = this.targetAggregationInfo.removeAll(oTarget);
		// update API parent of removed objects
		for (var i = 0; i < aRemoved.length; i++) {
			if (aRemoved[i].aAPIParentInfos) {
				aRemoved[i].aAPIParentInfos.pop();
			}
		}
		return aRemoved;
	}

	destroy(oInstance) {
		var oTarget = this.getTarget(oInstance);
		// TODO oInstance.observer

		delete oInstance.mForwardedAggregations[this.aggregation.name];

		if (oTarget) {
			this.targetAggregationInfo.destroy(oTarget);
		}
		// API parent info of objects being destroyed is removed in ManagedObject.prototype.destroy()
		return oInstance;
	}
}


export class Association {
	constructor(oClass, name, info) {
		info = typeof info !== 'object' ? { type: info } : info;
		this.name = name;
		this.type = info.type || 'sap.ui.core.Control';
		this.multiple = info.multiple || false;
		this.singularName = this.multiple ? info.singularName || guessSingularName(name) : undefined;
		this.deprecated = info.deprecated || false;
		this.visibility = info.visibility || 'public';
		this.appData = remainder(this, info);
		this._oParent = oClass;
		this._sUID = 'association:' + name;
		this._iKind = this.multiple ? Kind.MULTIPLE_ASSOCIATION : Kind.SINGLE_ASSOCIATION;
		var N = capitalize(name);
		this._sGetter = 'get' + N;
		if ( this.multiple ) {
			var N1 = capitalize(this.singularName);
			this._sMutator = 'add' + N1;
			this._sRemoveMutator = 'remove' + N1;
			this._sRemoveAllMutator = 'removeAll' + N;
		} else {
			this._sMutator = 'set' + N;
			this._sRemoveMutator =
			this._sRemoveAllMutator = undefined;
		}
	}

	generate(add) {
		var that = this,
			n = that.name;

		if ( !that.multiple ) {
			add(that._sGetter, function() { return this.getAssociation(n); });
			add(that._sMutator, function(v) { this.setAssociation(n,v); return this; }, that);
		} else {
			add(that._sGetter, function() { return this.getAssociation(n,[]); });
			add(that._sMutator, function(a) { this.addAssociation(n,a); return this; }, that);
			add(that._sRemoveMutator, function(a) { return this.removeAssociation(n,a); });
			add(that._sRemoveAllMutator, function() { return this.removeAllAssociation(n); });
			if ( n !== that.singularName ) {
				add('removeAll' + capitalize(that.singularName), function() {
					Log.warning("Usage of deprecated method " +
						that._oParent.getName() + ".prototype." + 'removeAll' + capitalize(that.singularName) + "," +
						" use method " + that._sRemoveAllMutator  + " (plural) instead.");
					return this[that._sRemoveAllMutator]();
				});
			}
		}
	}

	getType() {
		if (!this._oType) {
			this._oType = DataType.getType(this.type);
		}
		return this._oType;
	}

	get(instance) {
		if ( this.visibility !== 'public' ) {
			return instance.getAssociation(this.name, this.multiple ? [] : undefined);
		}
		return instance[this._sGetter]();
	}

	set(instance, oValue) {
		if ( this.visibility !== 'public' ) {
			return instance.setAssociation(this.name, oValue);
		}
		return instance[this._sMutator](oValue);
	}

	add(instance, oValue) {
		if ( this.visibility !== 'public' ) {
			return instance.addAssociation(this.name, oValue);
		}
		return instance[this._sMutator](oValue);
	}

	remove(instance, vValue) {
		if ( this.visibility !== 'public' ) {
			return instance.removeAssociation(this.name, vValue);
		}
		return instance[this._sRemoveMutator](vValue);
	}

	removeAll(instance) {
		if ( this.visibility !== 'public' ) {
			return instance.removeAllAssociation(this.name);
		}
		return instance[this._sRemoveAllMutator]();
	}
}


export class Event {
	constructror(oClass, name, info) {
		this.name = name;
		this.allowPreventDefault = info.allowPreventDefault || false;
		this.deprecated = info.deprecated || false;
		this.visibility = 'public';
		this.allowPreventDefault = !!info.allowPreventDefault;
		this.enableEventBubbling = !!info.enableEventBubbling;
		this.appData = remainder(this, info);
		this._oParent = oClass;
		this._sUID = 'event:' + name;
		this._iKind = Kind.EVENT;
		var N = capitalize(name);
		this._sMutator = 'attach' + N;
		this._sDetachMutator = 'detach' + N;
		this._sTrigger = 'fire' + N;
	}

	generate(add) {
		var that = this,
			n = that.name,
			allowPreventDefault = that.allowPreventDefault,
			enableEventBubbling = that.enableEventBubbling;

		add(that._sMutator, function(d,f,o) { this.attachEvent(n,d,f,o); return this; }, that);
		add(that._sDetachMutator, function(f,o) { this.detachEvent(n,f,o); return this; });
		add(that._sTrigger, function(p) { return this.fireEvent(n,p, allowPreventDefault, enableEventBubbling); });
	}

	attach(instance,data,fn,listener) {
		return instance[this._sMutator](data,fn,listener);
	}

	detach(instance,fn,listener) {
		return instance[this._sDetachMutator](fn,listener);
	}

	fire(instance,params) {
		return instance[this._sTrigger](params, this.allowPreventDefault, this.enableEventBubbling);
	}
}


// ---- Design Time capabilities -------------------------------------------------------------

function preloadDesigntimeLibrary(oMetadata) {
	//preload the designtime data for the library
	var sLibrary = oMetadata.getLibraryName(),
		sPreload = Configuration.getPreload(),
		oLibrary = Library.all()[sLibrary];
	if (oLibrary && oLibrary.designtime) {
		var oPromise;
		if (sPreload === "async" || sPreload === "sync") {
			//ignore errors _loadJSResourceAsync is true here, do not break if there is no preload.
			oPromise = sap.ui.loader._.loadJSResourceAsync(oLibrary.designtime.replace(/\.designtime$/, "-preload.designtime.js"), true);
		} else {
			oPromise = Promise.resolve();
		}
		return new Promise(function(fnResolve, fnReject) {
			oPromise.then(function() {
				sap.ui.require([oLibrary.designtime], function(oLib) {
					fnResolve(oLib);
				}, fnReject);
			});
		});
	}
	return Promise.resolve(null);
}

function loadOwnDesignTime(oMetadata) {
	if (isPlainObject(oMetadata._oDesignTime) || !oMetadata._oDesignTime) {
		return Promise.resolve(oMetadata._oDesignTime || {});
	}

	return new Promise(function(fnResolve, fnReject) {
		var sModule;
		if (typeof oMetadata._oDesignTime === "string") {
			//oMetadata._oDesignTime points to resource path to another file, for example: "sap/ui/core/designtime/<control>.designtime"
			sModule = oMetadata._oDesignTime;
		} else {
			sModule = oMetadata.getName().replace(/\./g, "/") + ".designtime";
		}
		preloadDesigntimeLibrary(oMetadata).then(function(oLib) {
			sap.ui.require([sModule], function(mDesignTime) {
				mDesignTime.designtimeModule = sModule;
				oMetadata._oDesignTime = mDesignTime;
				mDesignTime._oLib = oLib;
				fnResolve(mDesignTime);
			}, fnReject);
		});
	});
}

var mPredefinedDesignTimeModules = {};


function loadInstanceDesignTime(oInstance) {
	var sInstanceSpecificModule =
		BaseObject.isA(oInstance, "sap.ui.base.ManagedObject")
		&& typeof oInstance.data === "function"
		&& oInstance.data("sap-ui-custom-settings")
		&& oInstance.data("sap-ui-custom-settings")["sap.ui.dt"]
		&& oInstance.data("sap-ui-custom-settings")["sap.ui.dt"].designtime;

	if (typeof sInstanceSpecificModule === "string") {
		sInstanceSpecificModule = mPredefinedDesignTimeModules[sInstanceSpecificModule] || sInstanceSpecificModule;

		return new Promise(function(fnResolve, fnReject) {
			sap.ui.require([sInstanceSpecificModule], function(vDesignTime) {
				if (typeof vDesignTime === "function") {
					fnResolve(vDesignTime(oInstance));
				} else {
					fnResolve(vDesignTime);
				}
			}, fnReject);
		});
	} else {
		return Promise.resolve({});
	}
}

function getScopeBasedDesignTime(mMetadata, sScopeKey) {
	var mResult = mMetadata;

	if ("default" in mMetadata) {
		mResult = merge(
			{},
			mMetadata.default,
			sScopeKey !== "default" && mMetadata[sScopeKey] || null
		);
	}

	return mResult;
}

function mergeDesignTime(mOwnDesignTime, mParentDesignTime, sScopeKey){
	// we use "sap/base/util/merge" to be able to also overwrite properties with null or undefined
	// using deep extend to inherit full parent designtime, unwanted inherited properties have to be overwritten with undefined
	return merge(
		{},
		getScopeBasedDesignTime(mParentDesignTime, sScopeKey),
		//non inherited DT properties
		{
			templates: {
				create: null //create template will not be inherited, they are special to the current type.
			}
		},
		getScopeBasedDesignTime(mOwnDesignTime, sScopeKey), {
			designtimeModule: mOwnDesignTime.designtimeModule || undefined,
			_oLib: mOwnDesignTime._oLib
		}
	);
}
