import { Eventing } from "/microui5/src/sap/base/Eventing.js";

"use strict";

export class Formatting {
	construction() {
		Eventing.apply(Formatting);
		this.#init();
	}

	#mChanges;
	#mSettings = {};

	#M_ABAP_DATE_FORMAT_PATTERN = {
		"" : {pattern: null},
		"1": {pattern: "dd.MM.yyyy"},
		"2": {pattern: "MM/dd/yyyy"},
		"3": {pattern: "MM-dd-yyyy"},
		"4": {pattern: "yyyy.MM.dd"},
		"5": {pattern: "yyyy/MM/dd"},
		"6": {pattern: "yyyy-MM-dd"},
		"7": {pattern: "Gyy.MM.dd"},
		"8": {pattern: "Gyy/MM/dd"},
		"9": {pattern: "Gyy-MM-dd"},
		"A": {pattern: "yyyy/MM/dd"},
		"B": {pattern: "yyyy/MM/dd"},
		"C": {pattern: "yyyy/MM/dd"}
	};

	#M_ABAP_TIME_FORMAT_PATTERN = {
		"" : {"short": null,      medium:  null,        dayPeriods: null},
		"0": {"short": "HH:mm",   medium: "HH:mm:ss",   dayPeriods: null},
		"1": {"short": "hh:mm a", medium: "hh:mm:ss a", dayPeriods: ["AM", "PM"]},
		"2": {"short": "hh:mm a", medium: "hh:mm:ss a", dayPeriods: ["am", "pm"]},
		"3": {"short": "KK:mm a", medium: "KK:mm:ss a", dayPeriods: ["AM", "PM"]},
		"4": {"short": "KK:mm a", medium: "KK:mm:ss a", dayPeriods: ["am", "pm"]}
	};

	#M_ABAP_NUMBER_FORMAT_SYMBOLS = {
		"" : {groupingSeparator: null, decimalSeparator: null},
		" ": {groupingSeparator: ".", decimalSeparator: ","},
		"X": {groupingSeparator: ",", decimalSeparator: "."},
		"Y": {groupingSeparator: " ", decimalSeparator: ","}
	};

	#check(bCondition, sMessage) {
		if ( !bCondition ) {
			throw new Error(sMessage);
		}
	}

	#createLanguageTag(sLanguageTag) {
		var oLanguageTag;
		if (sLanguageTag && typeof sLanguageTag === 'string') {
			try {
				oLanguageTag = new LanguageTag( sLanguageTag );
			} catch (e) {
				// ignore
			}
		}
		return oLanguageTag;
	}

	#oWritableConfig = BaseConfig.getWritableInstance();

	attachChange(fnFunction) {
		Formatting.attachEvent("change", fnFunction);
	}

	detachChange(fnFunction) {
		Formatting.detachEvent("change", fnFunction);
	}

	getLanguageTag() {
		function fallback(oFormatSettings) {
			var oLanguageTag = new LanguageTag(Localization.getLanguage());
			// if any user settings have been defined, add the private use subtag "sapufmt"
			if (!isEmptyObject(this.#mSettings)
					|| oFormatSettings.getCalendarWeekNumbering() !== CalendarWeekNumbering.Default) {
				var l = oLanguageTag.toString();
				if ( l.indexOf("-x-") < 0 ) {
					l = l + "-x-sapufmt";
				} else if ( l.indexOf("-sapufmt") <= l.indexOf("-x-") ) {
					l = l + "-sapufmt";
				}
				oLanguageTag = new LanguageTag(l);
			}
			return oLanguageTag;
		}
		return this.#oWritableConfig.get({
			name: "sapUiFormatLocale",
			type: function(sFormatLocale) {return new LanguageTag(sFormatLocale);},
			defaultValue: fallback(this),
			external: true
		});
	}

	setLanguageTag(sLanguageTag) {
		var oLanguageTag = this.#createLanguageTag(sLanguageTag);
		this.#check(sLanguageTag == null || typeof sLanguageTag === "string" && oLanguageTag, "sLanguageTag must be a BCP47 language tag or Java Locale id or null");
		sLanguageTag = sLanguageTag === null ? undefined : sLanguageTag;
		var oOldLanguageTag = Formatting.getLanguageTag();
		this.#oWritableConfig.set("sapUiFormatLocale", sLanguageTag);
		var oCurrentLanguageTag = Formatting.getLanguageTag();
		if (oOldLanguageTag.toString() !== oCurrentLanguageTag.toString()) {
			var bFireEvent = !this.#mChanges;
			this.#mChanges = this.#mChanges || {};
			this.#mChanges.languageTag = oCurrentLanguageTag.toString();
			if (bFireEvent) {
				this.#fireChange();
			}
		}
		return this;
	}

	_set(sKey, oValue) {
		var oOldValue = this.#mSettings[sKey];
		if ( oValue != null ) {
			this.#mSettings[sKey] = oValue;
		} else {
			delete this.#mSettings[sKey];
		}
		// report a change only if old and new value differ (null/undefined are treated as the same value)
		if ( (oOldValue != null || oValue != null) && !deepEqual(oOldValue, oValue) ) {
			var bFireEvent = !this.#mChanges;
			this.#mChanges = this.#mChanges || {};
			this.#mChanges[sKey] = oValue;
			if (bFireEvent) {
				this.#fireChange();
			}
		}
	}

	getCustomUnits () {
		return this.#mSettings["units"] ? this.#mSettings["units"]["short"] : undefined;
	}

	setCustomUnits (mUnits) {
		// add custom units, or remove the existing ones if none are given
		var mUnitsshort = null;
		if (mUnits) {
			mUnitsshort = {
				"short": mUnits
			};
		}
		Formatting._set("units", mUnitsshort);
		return this;
	}

	addCustomUnits (mUnits) {
		// add custom units, or remove the existing ones if none are given
		var mExistingUnits = Formatting.getCustomUnits();
		if (mExistingUnits){
			mUnits = extend({}, mExistingUnits, mUnits);
		}
		Formatting.setCustomUnits(mUnits);
		return this;
	}

	setUnitMappings (mUnitMappings) {
		Formatting._set("unitMappings", mUnitMappings);
		return this;
	}

	addUnitMappings (mUnitMappings) {
		// add custom units, or remove the existing ones if none are given
		var mExistingUnits = Formatting.getUnitMappings();
		if (mExistingUnits){
			mUnitMappings = extend({}, mExistingUnits, mUnitMappings);
		}
		Formatting.setUnitMappings(mUnitMappings);
		return this;
	}

	getUnitMappings () {
		return this.#mSettings["unitMappings"];
	}

	getDatePattern(sStyle) {
		assert(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
		return this.#mSettings["dateFormats-" + sStyle];
	}

	setDatePattern(sStyle, sPattern) {
		this.#check(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
		Formatting._set("dateFormats-" + sStyle, sPattern);
		return this;
	}

	getTimePattern(sStyle) {
		assert(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
		return this.#mSettings["timeFormats-" + sStyle];
	}

	setTimePattern(sStyle, sPattern) {
		this.#check(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
		Formatting._set("timeFormats-" + sStyle, sPattern);
		return this;
	}

	getNumberSymbol(sType) {
		assert(["group", "decimal", "plusSign", "minusSign"].includes(sType), "sType must be decimal, group, plusSign or minusSign");
		return this.#mSettings["symbols-latn-" + sType];
	}

	setNumberSymbol(sType, sSymbol) {
		this.#check(["group", "decimal", "plusSign", "minusSign"].includes(sType), "sType must be decimal, group, plusSign or minusSign");
		Formatting._set("symbols-latn-" + sType, sSymbol);
		return this;
	}

	getCustomCurrencies() {
		return this.#mSettings["currency"];
	}

	setCustomCurrencies(mCurrencies) {
		this.#check(typeof mCurrencies === "object" || mCurrencies == null, "mCurrencyDigits must be an object");
		Object.keys(mCurrencies || {}).forEach(function(sCurrencyDigit) {
			this.#check(typeof sCurrencyDigit === "string");
			this.#check(typeof mCurrencies[sCurrencyDigit] === "object");
		});
		Formatting._set("currency", mCurrencies);
		return this;
	}

	addCustomCurrencies (mCurrencies) {
		// add custom units, or remove the existing ones if none are given
		var mExistingCurrencies = Formatting.getCustomCurrencies();
		if (mExistingCurrencies){
			mCurrencies = extend({}, mExistingCurrencies, mCurrencies);
		}
		Formatting.setCustomCurrencies(mCurrencies);
		return this;
	}

	_setDayPeriods(sWidth, aTexts) {
		assert(sWidth == "narrow" || sWidth == "abbreviated" || sWidth == "wide", "sWidth must be narrow, abbreviated or wide");
		Formatting._set("dayPeriods-format-" + sWidth, aTexts);
		return this;
	}

	static getLegacyDateFormat() {
		var sLegacyDateFormat = this.#oWritableConfig.get({
			name: "sapUiLegacyDateFormat",
			type: BaseConfig.Type.String,
			defaultValue: undefined,
			external: true
		});
		return sLegacyDateFormat ? sLegacyDateFormat.toUpperCase() : undefined;
	}

	setLegacyDateFormat(sFormatId) {
		sFormatId = sFormatId ? String(sFormatId).toUpperCase() : "";
		this.#check(this.#M_ABAP_DATE_FORMAT_PATTERN.hasOwnProperty(sFormatId), "sFormatId must be one of ['1','2','3','4','5','6','7','8','9','A','B','C'] or empty");
		var bFireEvent = !this.#mChanges;
		var sOldFormat = Formatting.getLegacyDateFormat();
		if (sOldFormat !== sFormatId) {
			this.#mChanges = this.#mChanges || {};
			this.#oWritableConfig.set("sapUiLegacyDateFormat", sFormatId);
			this.#mChanges.legacyDateFormat = sFormatId;
			Formatting.setDatePattern("short", this.#M_ABAP_DATE_FORMAT_PATTERN[sFormatId].pattern);
			Formatting.setDatePattern("medium", this.#M_ABAP_DATE_FORMAT_PATTERN[sFormatId].pattern);
			if (bFireEvent) {
				this.#fireChange();
			}
		}
		return this;
	}

	static getLegacyTimeFormat() {
		var sLegacyTimeFormat = this.#oWritableConfig.get({
			name: "sapUiLegacyTimeFormat",
			type: BaseConfig.Type.String,
			defaultValue: undefined,
			external: true
		});
		return sLegacyTimeFormat ? sLegacyTimeFormat.toUpperCase() : undefined;
	}

	setLegacyTimeFormat(sFormatId) {
		sFormatId = sFormatId || "";
		this.#check(this.#M_ABAP_TIME_FORMAT_PATTERN.hasOwnProperty(sFormatId), "sFormatId must be one of ['0','1','2','3','4'] or empty");
		var bFireEvent = !this.#mChanges;
		var sOldFormat = Formatting.getLegacyTimeFormat();
		if (sOldFormat !== sFormatId) {
			this.#mChanges = this.#mChanges || {};
			this.#oWritableConfig.set("sapUiLegacyTimeFormat", sFormatId);
			this.#mChanges.legacyTimeFormat = sFormatId;
			Formatting.setTimePattern("short", this.#M_ABAP_TIME_FORMAT_PATTERN[sFormatId]["short"]);
			Formatting.setTimePattern("medium", this.#M_ABAP_TIME_FORMAT_PATTERN[sFormatId]["medium"]);
			Formatting._setDayPeriods("abbreviated", this.#M_ABAP_TIME_FORMAT_PATTERN[sFormatId].dayPeriods);
			if (bFireEvent) {
				this.#fireChange();
			}
		}
		return this;
	}

	static getLegacyNumberFormat() {
		var sLegacyNumberFormat = this.#oWritableConfig.get({
			name: "sapUiLegacyNumberFormat",
			type: BaseConfig.Type.String,
			defaultValue: undefined,
			external: true
		});
		return sLegacyNumberFormat ? sLegacyNumberFormat.toUpperCase() : undefined;
	}

	setLegacyNumberFormat(sFormatId) {
		sFormatId = sFormatId ? sFormatId.toUpperCase() : "";
		this.#check(this.#M_ABAP_NUMBER_FORMAT_SYMBOLS.hasOwnProperty(sFormatId), "sFormatId must be one of [' ','X','Y'] or empty");
		var bFireEvent = !this.#mChanges;
		var sOldFormat = Formatting.getLegacyNumberFormat();
		if (sOldFormat !== sFormatId) {
			this.#mChanges = this.#mChanges || {};
			this.#oWritableConfig.set("sapUiLegacyNumberFormat", sFormatId);
			this.#mChanges.legacyNumberFormat = sFormatId;
			Formatting.setNumberSymbol("group", this.#M_ABAP_NUMBER_FORMAT_SYMBOLS[sFormatId].groupingSeparator);
			Formatting.setNumberSymbol("decimal", this.#M_ABAP_NUMBER_FORMAT_SYMBOLS[sFormatId].decimalSeparator);
			if (bFireEvent) {
				this.#fireChange();
			}
		}
		return this;
	}

	setLegacyDateCalendarCustomizing(aMappings) {
		this.#check(Array.isArray(aMappings), "aMappings must be an Array");
		var bFireEvent = !this.#mChanges;
		this.#mChanges = this.#mChanges || {};
		Formatting.aLegacyDateCalendarCustomizing = this.#mChanges.legacyDateCalendarCustomizing = aMappings.slice();
		if (bFireEvent) {
			this.#fireChange();
		}
		return this;
	}

	getLegacyDateCalendarCustomizing() {
		var aLegacyDateCalendarCustomizing = Formatting.aLegacyDateCalendarCustomizing;
		if (aLegacyDateCalendarCustomizing) {
			aLegacyDateCalendarCustomizing = aLegacyDateCalendarCustomizing.slice();
		}
		return aLegacyDateCalendarCustomizing;
	}

	setTrailingCurrencyCode(bTrailingCurrencyCode) {
		this.#check(typeof bTrailingCurrencyCode === "boolean", "bTrailingCurrencyCode must be a boolean");
		this.#oWritableConfig.set("sapUiTrailingCurrencyCode", bTrailingCurrencyCode);
		return this;
	}

	getTrailingCurrencyCode() {
		return this.#oWritableConfig.get({
			name: "sapUiTrailingCurrencyCode",
			type: BaseConfig.Type.Boolean,
			defaultValue: true,
			external: true
		});
	}

	getCustomLocaleData() {
		return this.#mSettings;
	}

	getCalendarWeekNumbering() {
		var oCalendarWeekNumbering = CalendarWeekNumbering.Default;

		try {
			oCalendarWeekNumbering = this.#oWritableConfig.get({
				name: "sapUiCalendarWeekNumbering",
				type: CalendarWeekNumbering,
				defaultValue: CalendarWeekNumbering.Default,
				external: true
			});
		} catch  (err) {
			//nothing to do, return default;
		}
		return oCalendarWeekNumbering;
	}

	setCalendarWeekNumbering(sCalendarWeekNumbering) {
		BaseConfig._.checkEnum(CalendarWeekNumbering, sCalendarWeekNumbering, "calendarWeekNumbering");
		var sCurrentWeekNumbering = this.#oWritableConfig.get({
			name: "sapUiCalendarWeekNumbering",
			type: CalendarWeekNumbering,
			defaultValue: CalendarWeekNumbering.Default,
			external: true
		});
		if (sCurrentWeekNumbering !== sCalendarWeekNumbering) {
			var bFireEvent = !this.#mChanges;
			this.#mChanges = this.#mChanges || {};
			this.#oWritableConfig.set("sapUiCalendarWeekNumbering", sCalendarWeekNumbering);
			this.#mChanges.calendarWeekNumbering = sCalendarWeekNumbering;
			if (bFireEvent) {
				this.#fireChange();
			}
		}
		return this;
	}

	getCalendarType() {
		var sName,
			sCalendarType = this.#oWritableConfig.get({
				name: "sapUiCalendarType",
				type: BaseConfig.Type.String,
				defaultValue: null,
				external: true
			});

		if (sCalendarType) {
			for (sName in CalendarType) {
				if (sName.toLowerCase() === sCalendarType.toLowerCase()) {
					return sName;
				}
			}
			Log.warning("Parameter 'calendarType' is set to " + sCalendarType + " which isn't a valid value and therefore ignored. The calendar type is determined from format setting and current locale");
		}

		var sLegacyDateFormat = Formatting.getLegacyDateFormat();

		switch (sLegacyDateFormat) {
			case "1":
			case "2":
			case "3":
			case "4":
			case "5":
			case "6":
				return CalendarType.Gregorian;
			case "7":
			case "8":
			case "9":
				return CalendarType.Japanese;
			case "A":
			case "B":
				return CalendarType.Islamic;
			case "C":
				return CalendarType.Persian;
			default:
				return Localization.getPreferredCalendarType();
		}
	}

	setCalendarType(sCalendarType) {
		var sOldCalendarType = Formatting.getCalendarType();
		this.#oWritableConfig.set("sapUiCalendarType", sCalendarType);
		var sCurrentCalendarType = Formatting.getCalendarType();
		if (sOldCalendarType !== sCurrentCalendarType) {
			var bFireEvent = !this.#mChanges;
			this.#mChanges = this.#mChanges || {};
			this.#mChanges.calendarType = sCurrentCalendarType;
			if (bFireEvent) {
				this.#fireChange();
			}
		}
		return this;
	}

	#fireChange() {
		Formatting.fireEvent("change", this.#mChanges);
		this.#mChanges = undefined;
	}

	#init() {
		// init legacy formats
		var sLegacyDateFormat = Formatting.getLegacyDateFormat();
		if (sLegacyDateFormat !== undefined) {
			Formatting.setLegacyDateFormat(sLegacyDateFormat);
		}
		var sLegacyNumberFormat = Formatting.getLegacyNumberFormat();
		if (sLegacyNumberFormat !== undefined) {
			Formatting.setLegacyNumberFormat(sLegacyNumberFormat);
		}
		var sLegacyTimeFormat = Formatting.getLegacyTimeFormat();
		if (sLegacyTimeFormat !== undefined) {
			Formatting.setLegacyTimeFormat(sLegacyTimeFormat);
		}
	}
}
