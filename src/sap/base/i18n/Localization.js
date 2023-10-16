import { Eventing } from "/microui5/src/sap/base/Eventing.js";

"use strict";

export class Localization {
	constructor() {
		Object.assign(this.prototype, Eventing);
	}

	#mChanges;
	#oWritableConfig = BaseConfig.getWritableInstance();
	#bLanguageWarningLogged = false;

	#_mPreferredCalendar = {
		"ar-SA": CalendarType.Islamic,
		"fa": CalendarType.Persian,
		"th": CalendarType.Buddhist,
		"default": CalendarType.Gregorian
	};

	// Note: keys must be uppercase
	#M_ABAP_LANGUAGE_TO_LOCALE = {
		"ZH" : "zh-Hans",
		"ZF" : "zh-Hant",
		"SH" : "sr-Latn",
		"6N" : "en-GB",
		"1P" : "pt-PT",
		"1X" : "es-MX",
		"3F" : "fr-CA",
		"1Q" : "en-US-x-saptrc",
		"2Q" : "en-US-x-sappsd",
		"3Q" : "en-US-x-saprigi"
	};

	#M_ISO639_OLD_TO_NEW = {
		"iw" : "he",
		"ji" : "yi"
	};

	#M_LOCALE_TO_ABAP_LANGUAGE = this.#inverse(this.#M_ABAP_LANGUAGE_TO_LOCALE);

	#inverse(obj) {
		return Object.keys(obj).reduce(function(inv, key) {
			inv[obj[key]] = key;
			return inv;
		}, {});
	}

	#getPseudoLanguageTag(sPrivateUse) {
		if ( sPrivateUse ) {
			var m = /-(saptrc|sappsd|saprigi)(?:-|$)/i.exec(sPrivateUse);
			return m && "en-US-x-" + m[1].toLowerCase();
		}
	}

	#getDesigntimePropertyAsArray(sValue) {
		var m = /\$([-a-z0-9A-Z._]+)(?::([^$]*))?\$/.exec(sValue);
		return (m && m[2]) ? m[2].split(/,/) : null;
	}

	#A_RTL_LOCALES = this.#getDesigntimePropertyAsArray("$cldr-rtl-locales:ar,fa,he$") || [];

	#_coreI18nLocales = this.#getDesigntimePropertyAsArray("$core-i18n-locales:,ar,bg,ca,cs,da,de,el,en,en_GB,es,es_MX,et,fi,fr,hi,hr,hu,it,iw,ja,kk,ko,lt,lv,ms,nl,no,pl,pt,ro,ru,sh,sk,sl,sv,th,tr,uk,vi,zh_CN,zh_TW$");

	#impliesRTL(oLanguageTag) {
		var sLanguage = oLanguageTag.language || "";
		sLanguage = Localization.getModernLanguage(oLanguageTag.language);
		var sRegion = oLanguageTag.region || "";
		if ( sRegion && this.#A_RTL_LOCALES.indexOf(sLanguage + "_" + sRegion) >= 0 ) {
			return true;
		}
		return this.#A_RTL_LOCALES.indexOf(sLanguage) >= 0;
	}

	#fromSAPLogonLanguage(sSAPLogonLanguage) {
		var oLanguageTag;
		if (sSAPLogonLanguage && typeof sSAPLogonLanguage === 'string') {
			sSAPLogonLanguage = this.#M_ABAP_LANGUAGE_TO_LOCALE[sSAPLogonLanguage.toUpperCase()] || sSAPLogonLanguage;
			try {
				oLanguageTag = new LanguageTag(sSAPLogonLanguage);
			} catch (e) {
				// ignore
			}
		}
		return {
			languageTag: oLanguageTag,
			SAPLogonLanguage: sSAPLogonLanguage
		};
	}

	#createLanguageTag(sLanguage) {
		var oLanguageTag;
		if (sLanguage) {
			oLanguageTag = new LanguageTag(sLanguage);
		}
		return oLanguageTag;
	}

	// Helper Functions
	#detectLanguage() {
		return globalThis.navigator ? (globalThis.navigator.languages && globalThis.navigator.languages[0]) || globalThis.navigator.language || "en" : new Intl.Collator().resolvedOptions().locale || "en";
	}

	#check(bCondition, sMessage) {
		if ( !bCondition ) {
			throw new Error(sMessage);
		}
	}

	#join() {
		return Array.prototype.filter.call(arguments, Boolean).join("-");
	}

	#checkTimezone(sTimezone) {
		var bIsValidTimezone = TimezoneUtils.isValidTimezone(sTimezone);
		if (!bIsValidTimezone) {
			Log.error("The provided timezone '" + sTimezone + "' is not a valid IANA timezone ID." +
				" Falling back to browser's local timezone '" + TimezoneUtils.getLocalTimezone() + "'.");
		}
		return bIsValidTimezone;
	}

	#fireChange() {
		Localization.fireEvent("change", this.#mChanges);
		this.#mChanges = undefined;
	}

	attachChange(fnFunction) {
		Localization.attachEvent("change", fnFunction);
	}

	detachChange(fnFunction) {
		Localization.detachEvent("change", fnFunction);
	}

	getLanguage() {
		var oLanguageTag,
			sDerivedLanguage;

		var sLanguage = this.#oWritableConfig.get({
			name: "sapUiLanguage",
			type: BaseConfig.Type.String,
			external: true
		});
		var sSapLocale = this.#oWritableConfig.get({
			name: "sapLocale",
			type: BaseConfig.Type.String,
			external: true
		});
		var sSapLanguage = this.#oWritableConfig.get({
			name: "sapLanguage",
			type: BaseConfig.Type.String,
			external: true
		});

		if (sSapLocale) {
			oLanguageTag = this.#createLanguageTag(sSapLocale);
			sDerivedLanguage = sSapLocale;
		} else if (sSapLanguage) {
			if (!sLanguage && !this.#bLanguageWarningLogged) {
				// only complain about an invalid sap-language if neither sap-locale nor sap-ui-language are given
				Log.warning("sap-language '" + sSapLanguage + "' is not a valid BCP47 language tag and will only be used as SAP logon language");
				// Avoid multiple logging of this warning
				this.#bLanguageWarningLogged = true;
			}
			//this.#fromSAPLogonLanguage catches errors oLanguageTag could be undefined
			var oSAPLogonLanguage = this.#fromSAPLogonLanguage(sSapLanguage);
			oLanguageTag = oSAPLogonLanguage.languageTag;
			sDerivedLanguage = oSAPLogonLanguage.languageTag && oSAPLogonLanguage.SAPLogonLanguage;
		}
		if (!oLanguageTag) {
			if (sLanguage) {
				oLanguageTag = this.#createLanguageTag(sLanguage);
				sDerivedLanguage = sLanguage;
			} else {
				sDerivedLanguage = this.#detectLanguage();
				oLanguageTag = this.#createLanguageTag(sLanguage);
			}
		}
		return sDerivedLanguage;
	}

	getModernLanguage(sLanguage) {
		return this.#M_ISO639_OLD_TO_NEW[sLanguage] || sLanguage;
	}

	setLanguage(sLanguage, sSAPLogonLanguage) {
		var oLanguageTag = this.#createLanguageTag(sLanguage),
			bOldRTL = Localization.getRTL();

		this.#check(oLanguageTag, "Configuration.setLanguage: sLanguage must be a valid BCP47 language tag");
		this.#check(sSAPLogonLanguage == null || (typeof sSAPLogonLanguage === 'string' && /^[A-Z0-9]{2,2}$/i.test(sSAPLogonLanguage)),
			"Configuration.setLanguage: sSAPLogonLanguage must be null or be a string of length 2, consisting of digits and latin characters only");

		if ( oLanguageTag.toString() != Localization.getLanguageTag().toString() ||
			sSAPLogonLanguage !== this.#oWritableConfig.get({
				name: "sapLanguage",
				type: BaseConfig.Type.String,
				defaultValue: undefined,
				external: true
			})) {
			this.#oWritableConfig.set("sapLanguage", sSAPLogonLanguage);
			this.#oWritableConfig.set("sapUiLanguage", oLanguageTag.toString());
			this.#mChanges = {};
			this.#mChanges.language = Localization.getLanguageTag().toString();
			var bRtl = Localization.getRTL();
			if ( bOldRTL != bRtl ) {
				this.#mChanges.rtl = bRtl;
			}
			this.#fireChange();
		}
	}

	getTimezone() {
		var sTimezone = this.#oWritableConfig.get({
			name: "sapTimezone",
			type: BaseConfig.Type.String,
			external: true,
			defaultValue: this.#oWritableConfig.get({
				name: "sapUiTimezone",
				type: BaseConfig.Type.String,
				external: true
			})
		});
		if (!sTimezone || !this.#checkTimezone(sTimezone)) {
			sTimezone = TimezoneUtils.getLocalTimezone();
		}
		return sTimezone;
	}

	setTimezone(sTimezone) {
		this.#check(sTimezone == null || typeof sTimezone === 'string',
			"Configuration.setTimezone: sTimezone must be null or be a string");

		var sCurrentTimezone = Localization.getTimezone();
		sTimezone = sTimezone === null || !this.#checkTimezone(sTimezone) ? undefined : sTimezone;
		this.#oWritableConfig.set("sapTimezone", sTimezone);
		if (Localization.getTimezone() !== sCurrentTimezone) {
			this.#mChanges = {};
			this.#mChanges.timezone = Localization.getTimezone();
			this.#fireChange();
		}
		return this;
	}

	getLanguageTag() {
		var oLanguageTag = new LanguageTag(Localization.getLanguage());
		var sLanguageTag = oLanguageTag.toString();
		var sLanguage = Localization.getModernLanguage(oLanguageTag.language);
		var sScript = oLanguageTag.script;
		// special case for "sr_Latn" language: "sh" should then be used
		// config method is used to set the Accept-Language HTTP Header for ODataModel
		// requests and .hdbtextbundle resource bundles.
		// It has to remain backward compatible
		if (sLanguage === "sr" && sScript === "Latn") {
			sLanguageTag = sLanguageTag.replace("sr-Latn", "sh");
		} else {
			sLanguageTag = sLanguageTag.replace(oLanguageTag.language, sLanguage);
		}
		return new LanguageTag(sLanguageTag);
	}

	getRTL() {
		// if rtl has not been set (still null), return the rtl mode derived from the language
		return  this.#oWritableConfig.get({
			name: "sapRtl",
			type: BaseConfig.Type.Boolean,
			external:true,
			defaultValue: this.#oWritableConfig.get({
				name: "sapUiRtl",
				type: BaseConfig.Type.Boolean,
				defaultValue: this.#impliesRTL(Localization.getLanguageTag()),
				external:true
			})
		});
	}

	setRTL(bRTL) {
		this.#check(bRTL === null || typeof bRTL === "boolean", "bRTL must be null or a boolean");
		bRTL = bRTL === null ? undefined : bRTL;
		var oldRTL = Localization.getRTL();
		this.#oWritableConfig.set("sapRtl", bRTL);
		var bCurrentRTL = Localization.getRTL();
		if ( oldRTL != bCurrentRTL ) { // also take the derived RTL flag into account for the before/after comparison!
			this.#mChanges = {};
			this.#mChanges.rtl = bCurrentRTL;
			this.#fireChange();
		}
		return this;
	}

	_getSAPLogonLanguage(oLanguageTag) {
		var sLanguage = oLanguageTag.language || "";

		// cut off any ext. language sub tags
		if ( sLanguage.indexOf("-") >= 0 ) {
			sLanguage = sLanguage.slice(0, sLanguage.indexOf("-"));
		}

		// convert to new ISO codes
		sLanguage = Localization.getModernLanguage(sLanguage);

		// handle special case for Chinese: region TW implies Traditional Chinese (ZF)
		if ( sLanguage === "zh" && !oLanguageTag.script && oLanguageTag.region === "TW" ) {
			return "ZF";
		}

		return (
			this.#M_LOCALE_TO_ABAP_LANGUAGE[this.#join(sLanguage, oLanguageTag.script)]
			|| this.#M_LOCALE_TO_ABAP_LANGUAGE[this.#join(sLanguage, oLanguageTag.region)]
			|| this.#M_LOCALE_TO_ABAP_LANGUAGE[this.#getPseudoLanguageTag(oLanguageTag.privateUse)]
			|| sLanguage.toUpperCase()
		);
	}

	getSAPLogonLanguage() {
		var oLanguageTag,
			sLanguage = this.#oWritableConfig.get({
			name: "sapLanguage",
			type: BaseConfig.Type.String,
			external: true
		}).toUpperCase();

		try {
			oLanguageTag = this.#fromSAPLogonLanguage(sLanguage).languageTag;
		} catch (exc) {
			//do nothing
		}

		if (sLanguage && !oLanguageTag) {
			Log.warning("sap-language '" + sLanguage + "' is not a valid BCP47 language tag and will only be used as SAP logon language");
		}

		return sLanguage || Localization._getSAPLogonLanguage(Localization.getLanguageTag());
	}

	getPreferredCalendarType() {
		var oLocale = Localization.getLanguageTag();
		return this.#_mPreferredCalendar[oLocale.language + "-" + oLocale.region] ||
		this.#_mPreferredCalendar[oLocale.language] ||
		this.#_mPreferredCalendar["default"];
	}

	getLanguagesDeliveredWithCore() {
		return this.#_coreI18nLocales;
	}

	getSupportedLanguages() {
		var aLangs = BaseConfig.get({
			name: "sapUiXxSupportedLanguages",
			type: BaseConfig.Type.StringArray,
			external: true
		});
		if ( aLangs.length === 0 || (aLangs.length === 1 && aLangs[0] === '*') ) {
			aLangs = [];
		} else if ( aLangs.length === 1 && aLangs[0] === 'default' ) {
			aLangs = this.getLanguagesDeliveredWithCore() || [];
		}
		return aLangs;
	}
}
