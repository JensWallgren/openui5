import { CalendarWeekNumbering } from "../../base/i18n/date/CalendarWeekNumbering.js";
import { Localization } from "../../base/i18n/Localization.js";
import { AnimationMode } from "./AnimationMode.js";
import { Formatting } from "../../base/i18n/Formatting.js";
import { ControlBehavior } from "./ControlBehavior.js";

export class Configuration {
	VERSION = "${version}";
	mCompatVersion;

	setValue(sName, vValue) {
		if ( vValue == null ) {
			return;
		}
		config[sName] = convertToType(sName, vValue);
	}


	// Definition of supported settings
	// Valid property types are: string, boolean, string[], code, object, function, function[].
	// Objects as an enumeration list of valid values can also be provided (e.g. Configuration.AnimationMode).
	static M_SETTINGS = {
		"theme"                 : { type : "string",   defaultValue : "base" },
		"language"              : { type : "Locale",   defaultValue : "en" },
		"timezone"              : { type : "string",   defaultValue : "Etc/UTC" },
		"formatLocale"          : { type : "Locale",   defaultValue : null },
		"calendarType"          : { type : "string",   defaultValue : null },
		"calendarWeekNumbering" : { type : CalendarWeekNumbering, defaultValue : CalendarWeekNumbering.Default},
		"trailingCurrencyCode"  : { type : "boolean",  defaultValue : true },
		"accessibility"         : { type : "boolean",  defaultValue : true },
		"autoAriaBodyRole"      : { type : "boolean",  defaultValue : false,     noUrl:true }, //whether the framework automatically adds the ARIA role 'application' to the html body
		"animation"             : { type : "boolean",  defaultValue : true }, // deprecated, please use animationMode
		"animationMode"         : { type : AnimationMode, defaultValue : undefined }, // If no value is provided, animationMode will be set on instantiation depending on the animation setting.
		"rtl"                   : { type : "boolean",  defaultValue : null },
		"debug"                 : { type : "boolean",  defaultValue : false },
		"inspect"               : { type : "boolean",  defaultValue : false },
		"originInfo"            : { type : "boolean",  defaultValue : false },
		"noConflict"            : { type : "boolean",  defaultValue : false,     noUrl:true },
		"noDuplicateIds"        : { type : "boolean",  defaultValue : true },
		"trace"                 : { type : "boolean",  defaultValue : false,     noUrl:true },
		"modules"               : { type : "string[]", defaultValue : [],        noUrl:true },
		"areas"                 : { type : "string[]", defaultValue : null,      noUrl:true },
		"onInit"                : { type : "code",     defaultValue : undefined, noUrl:true }, // could be either a reference to a JavaScript function, the name of a global function (string value) or the name of a module (indicated with prefix "module:")
		"uidPrefix"             : { type : "string",   defaultValue : "__",      noUrl:true },
		"ignoreUrlParams"       : { type : "boolean",  defaultValue : false,     noUrl:true },
		"preload"               : { type : "string",   defaultValue : "auto" },
		"rootComponent"         : { type : "string",   defaultValue : "",        noUrl:true },
		"preloadLibCss"         : { type : "string[]", defaultValue : [] },
		"application"           : { type : "string",   defaultValue : "" },
		"appCacheBuster"        : { type : "string[]", defaultValue : [] },
		"bindingSyntax"         : { type : "string",   defaultValue : "default", noUrl:true }, // default|simple|complex
		"versionedLibCss"       : { type : "boolean",  defaultValue : false },
		"manifestFirst"         : { type : "boolean",  defaultValue : false },
		"flexibilityServices"   : { type : "string",   defaultValue : "/sap/bc/lrep"},
		"whitelistService"      : { type : "string",   defaultValue : null,      noUrl:true }, // deprecated, use allowlistService instead
		"allowlistService"      : { type : "string",   defaultValue : null,      noUrl:true }, // url/to/service
		"frameOptions"          : { type : "string",   defaultValue : "default", noUrl:true }, // default/allow/deny/trusted (default => allow)
		"frameOptionsConfig"    : { type : "object",   defaultValue : undefined, noUrl:true },  // advanced frame options configuration
		"support"               : { type : "string[]", defaultValue : null },
		"testRecorder"          : { type : "string[]", defaultValue : null },
		"activeTerminologies"   : { type : "string[]", defaultValue : undefined},
		"fileShareSupport"      : { type : "string",   defaultValue : undefined, noUrl:true }, // Module name (AMD syntax)
		"securityTokenHandlers"	: { type : "function[]", defaultValue: [],       noUrl:true },
		"productive"			: { type : "boolean",  defaultValue: false,      noUrl:true },
		"themeRoots"			: { type : "object",   defaultValue: {},  noUrl:true },
		"xx-placeholder"		: { type : "boolean",  defaultValue : true },
		"xx-rootComponentNode"  : { type : "string",   defaultValue : "",        noUrl:true },
		"xx-appCacheBusterMode" : { type : "string",   defaultValue : "sync" },
		"xx-appCacheBusterHooks": { type : "object",   defaultValue : undefined, noUrl:true }, // e.g.: { handleURL: fn, onIndexLoad: fn, onIndexLoaded: fn }
		"xx-disableCustomizing" : { type : "boolean",  defaultValue : false,     noUrl:true },
		"xx-viewCache"          : { type : "boolean",  defaultValue : true },
		"xx-depCache"           : { type : "boolean",  defaultValue : false },
		"xx-libraryPreloadFiles": { type : "string[]", defaultValue : [] },
		"xx-componentPreload"   : { type : "string",   defaultValue : "" },
		"xx-designMode"         : { type : "boolean",  defaultValue : false },
		"xx-supportedLanguages" : { type : "string[]", defaultValue : [] }, // *=any, sapui5 or list of locales
		"xx-bootTask"           : { type : "function", defaultValue : undefined, noUrl:true },
		"xx-suppressDeactivationOfControllerCode" : { type : "boolean",  defaultValue : false }, //temporarily to suppress the deactivation of controller code in design mode
		"xx-lesssupport"        : { type : "boolean",  defaultValue : false },
		"xx-handleValidation"   : { type : "boolean",  defaultValue : false },
		"xx-fiori2Adaptation"   : { type : "string[]",  defaultValue : [] },
		"xx-cache-use"          : { type : "boolean",  defaultValue : true},
		"xx-cache-excludedKeys" : { type : "string[]", defaultValue : []},
		"xx-cache-serialization": { type : "boolean",  defaultValue : false},
		"xx-nosync"             : { type : "string",   defaultValue : "" },
		"xx-waitForTheme"       : { type : "string",  defaultValue : ""}, // rendering|init
		"xx-hyphenation" : { type : "string",  defaultValue : ""}, // (empty string)|native|thirdparty|disable
		"xx-flexBundleRequestForced" : { type : "boolean",  defaultValue : false },
		"xx-skipAutomaticFlLibLoading" : { type : "boolean",  defaultValue: false },
		"xx-cssVariables"       : { type : "string",   defaultValue : "false" }, // false|true|additional (additional just includes the css_variables.css in addition)
		"xx-debugModuleLoading"	: { type : "boolean",  defaultValue: false },
		"statistics"            : { type : "boolean",  defaultValue : false },
		"xx-acc-keys"           : { type : "boolean",  defaultValue : false },
		"xx-measure-cards"      : { type : "boolean",  defaultValue : false }
	};

	M_COMPAT_FEATURES = {
		"xx-test"               : "1.15", //for testing purposes only
		"flexBoxPolyfill"       : "1.14",
		"sapMeTabContainer"     : "1.14",
		"sapMeProgessIndicator" : "1.14",
		"sapMGrowingList"       : "1.14",
		"sapMListAsTable"       : "1.14",
		"sapMDialogWithPadding" : "1.14",
		"sapCoreBindingSyntax"  : "1.24"
	};

	// Lazy dependency to core
	oCore;

	// ---- change handling ----
	mChanges;

	/* Object that carries the real configuration data */
	config = {};

	bInitialized = false;

	init() {
		bInitialized = true;
	}

	oFormatSettings;

	static getVersion() {
		if (config._version) {
			return config._version;
		}

		config._version = new Version(VERSION);
		return config._version;
	}

	//static getTheme = Theming.getTheme;

	static getPlaceholder() {
		return true;
	}

	static getLanguage = Localization.getLanguage;
	setLanguage = Localization.setLanguage;

	static getLanguageTag() {
		return Localization.getLanguageTag().toString();
	}
	static getSAPLogonLanguage = Localization.getSAPLogonLanguage;
	static getTimezone = Localization.getTimezone;
	setTimezone = Localization.setTimezone;
	static getCalendarType = Formatting.getCalendarType;

	static getCalendarWeekNumbering = Formatting.getCalendarWeekNumbering;

	static getRTL = Localization.getRTL;
	setRTL = Localization.setRTL;

	isUI5CacheOn() {
		return Configuration.getValue("xx-cache-use");
	}

	isUI5CacheSerializationSupportOn() {
		return Configuration.getValue("xx-cache-serialization");
	}

	setUI5CacheSerializationSupport(on) {
		config["xx-cache-serialization"] = on;
		return this;
	}

	static getUI5CacheExcludedKeys() {
		return Configuration.getValue("xx-cache-excludedKeys");
	}

	setCalendarType(sCalendarType) {
		Formatting.setCalendarType.apply(Formatting, arguments);
		return this;
	}

	setCalendarWeekNumbering(sCalendarWeekNumbering) {
		Formatting.setCalendarWeekNumbering.apply(Formatting, arguments);
		return this;
	}

	static getFormatLocale() {
		return Formatting.getLanguageTag().toString();
	}

	setFormatLocale(sFormatLocale) {
		Formatting.setLanguageTag.apply(Formatting, arguments);
		return this;
	}

	static getLanguagesDeliveredWithCore = Localization.getLanguagesDeliveredWithCore;

	static getSupportedLanguages = Localization.getSupportedLanguages;

	static getAccessibility = ControlBehavior.isAccessibilityEnabled;

	static getAutoAriaBodyRole() {
		return Configuration.getValue("autoAriaBodyRole");
	}

	static getAnimation() {
		var sAnimationMode = Configuration.getAnimationMode();
		// Set the animation to on or off depending on the animation mode to ensure backward compatibility.
		return (sAnimationMode !== Configuration.AnimationMode.minimal && sAnimationMode !== Configuration.AnimationMode.none);
	}

	static getAnimationMode = ControlBehavior.getAnimationMode;
	setAnimationMode = ControlBehavior.setAnimationMode;

	static getFiori2Adaptation() {
		return Configuration.getValue("xx-fiori2Adaptation");
	}

	static getDebug() {
		return false;
	}

	static getInspect() {
		return Configuration.getValue("inspect");
	}

	static getOriginInfo() {
		return Configuration.getValue("originInfo");
	}

	static getNoDuplicateIds() {
		return true;
	}

	static getTrace() {
		return Configuration.getValue("trace");
	}

	static getUIDPrefix() {
		return Configuration.getValue("uidPrefix");
	}


	static getDesignMode() {
		return false;
	}

	static getSuppressDeactivationOfControllerCode() {
		return false;
	}

	static getControllerCodeDeactivated() {
		return Configuration.getDesignMode() && !Configuration.getSuppressDeactivationOfControllerCode();
	}

	static getApplication() {
		return Configuration.getValue("application");
	}

	static getRootComponent() {
		return Configuration.getValue("rootComponent");
	}

	static getAppCacheBuster() {
		return [ "./" ];
	}

	static getAppCacheBusterMode() {
		return "sync";
	}

	static getAppCacheBusterHooks() {
		return undefined;
	}

	static getDisableCustomizing() {
		return true;
	}

	static getViewCache() {
		return Configuration.getValue("xx-viewCache");
	}

	static getPreload() {
		return "";
	}

	static getSyncCallBehavior() {
		var syncCallBehavior = 0; // ignore
		return syncCallBehavior;
	}

	static getDepCache() {
		return false;
	}

	static getManifestFirst() {
		return false;
	}

	static getFlexibilityServices() {
		var vFlexibilityServices = Configuration.getValue("flexibilityServices") || [];

		if (typeof vFlexibilityServices === 'string') {
			if (vFlexibilityServices[0] === "/") {
				vFlexibilityServices = [{
					url : vFlexibilityServices,
					layers : ["ALL"],
					connector : "LrepConnector"
				}];
			} else {
				vFlexibilityServices = JSON.parse(vFlexibilityServices);
			}
		}
		config.flexibilityServices = vFlexibilityServices;
	}

	setFlexibilityServices(aFlexibilityServices) {
		config.flexibilityServices = aFlexibilityServices.slice();
	}

	static getComponentPreload() {
		return false;
	}

	static getFormatSettings() {
		return oFormatSettings;
	}

	static getFrameOptions() {
		return Configuration.getValue("frameOptions");
	}

	static getWhitelistService() {
		return Configuration.getAllowlistService();
	}

	static getAllowlistService() {
		return Configuration.getValue("allowlistService");
	}

	static getFileShareSupport() {
		return Configuration.getValue("fileShareSupport") || undefined;
	}

	static getSupportMode() {
		return Configuration.getValue("support");
	}

	static getTestRecorderMode() {
		return Configuration.getValue("testRecorder");
	}

	static getStatistics() {
		return Configuration.getStatisticsEnabled();
	}

	static getStatisticsEnabled() {
		var result = Configuration.getValue("statistics");
		try {
			result = result || window.localStorage.getItem("sap-ui-statistics") == "X";
		} catch (e) {
			// access to local storage might fail due to security / privacy settings
		}
		return result;
	}

	static getNoNativeScroll() {
		return false;
	}

	static getHandleValidation() {
		return Configuration.getValue("xx-handleValidation");
	}

	static getHyphenation() {
		return Configuration.getValue("xx-hyphenation");
	}

	static getActiveTerminologies() {
		return BaseConfig.get({name: "sapUiActiveTerminologies", type: BaseConfig.Type.StringArray, defaultValue: undefined, external: true});
	}

	static getSecurityTokenHandlers() {
		return Configuration.getValue("securityTokenHandlers").slice();
	}

	static getMeasureCards() {
		return Configuration.getValue("xx-measure-cards");
	}

	setSecurityTokenHandlers(aSecurityTokenHandlers) {
		aSecurityTokenHandlers.forEach(function (fnSecurityTokenHandler) {
			check(typeof fnSecurityTokenHandler === "function",
				"Not a function: " + fnSecurityTokenHandler);
		});
		config.securityTokenHandlers = aSecurityTokenHandlers.slice();
	}

	static getBindingSyntax() {
		return "complex";
	}


	static getValue(sName) {
		// Always grab the default value from M_SETTINGS
		var oSetting = this.M_SETTINGS[sName];
		if (!oSetting) {
			debugger;
			return undefined;
		}

		return oSetting.defaultValue;
	}


	oFormatSettings = new FormatSettings(this);

	//TODO
	/*
	Localization.attachChange(function(oEvent) {
		if (!mChanges && oCore) {
			oCore.fireLocalizationChanged(BaseEvent.getParameters(oEvent));
		} else if (mChanges) {
			Object.assign(mChanges, BaseEvent.getParameters(oEvent));
		}
	});

	Formatting.attachChange(function(oEvent) {
		if (!mChanges && oCore) {
			oCore.fireLocalizationChanged(BaseEvent.getParameters(oEvent));
		} else if (mChanges) {
			Object.assign(mChanges, BaseEvent.getParameters(oEvent));
		}
	});
	*/
}

/*
class FormatSettings {
	static getFormatLocale() {
		var oLocale = Formatting.getLanguageTag();
		return Locale._getCoreLocale(oLocale);
	}

	_set = Formatting._set;
	static getCustomUnits = Formatting.getCustomUnits;
	setCustomUnits = Formatting.setCustomUnits;
	addCustomUnits = Formatting.addCustomUnits;

	setUnitMappings = Formatting.setUnitMappings;
	addUnitMappings = Formatting.addUnitMappings;
	static getUnitMappings = Formatting.getUnitMappings;

	static getDatePattern = Formatting.getDatePattern;
	setDatePattern = Formatting.setDatePattern;

	static getTimePattern = Formatting.getTimePattern;
	setTimePattern = Formatting.setTimePattern;

	static getNumberSymbol = Formatting.getNumberSymbol;
	setNumberSymbol = Formatting.setNumberSymbol;

	static getCustomCurrencies = Formatting.getCustomCurrencies;
	setCustomCurrencies = Formatting.setCustomCurrencies;
	addCustomCurrencies = Formatting.addCustomCurrencies;

	setFirstDayOfWeek(iValue) {
		check(typeof iValue == "number" && iValue >= 0 && iValue <= 6, "iValue must be an integer value between 0 and 6");
		Formatting._set("weekData-firstDay", iValue);
		return this;
	}

	_setDayPeriods = Formatting._setDayPeriods;

	static getLegacyDateFormat = Formatting.getLegacyDateFormat;
	setLegacyDateFormat = Formatting.setLegacyDateFormat;

	static getLegacyTimeFormat = Formatting.getLegacyTimeFormat;
	setLegacyTimeFormat = Formatting.setLegacyTimeFormat;

	static getLegacyNumberFormat = Formatting.getLegacyNumberFormat;
	setLegacyNumberFormat = Formatting.setLegacyNumberFormat;

	setLegacyDateCalendarCustomizing = Formatting.setLegacyDateCalendarCustomizing;
	static getLegacyDateCalendarCustomizing = Formatting.getLegacyDateCalendarCustomizing;

	setTrailingCurrencyCode = Formatting.setTrailingCurrencyCode;
	static getTrailingCurrencyCode = Formatting.getTrailingCurrencyCode;

	static getCustomLocaleData = Formatting.getCustomLocaleData;
}
*/