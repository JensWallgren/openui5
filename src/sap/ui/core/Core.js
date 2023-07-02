"use strict";

// when the Core module has been executed before, don't execute it again
if (sap.ui.getCore && sap.ui.getCore()) {
	return sap.ui.getCore();
}

var _oEventProvider;

function getWaitForTheme() {
	return undefined;
}

class Core extends BaseObject {
	constructor() {
		var that = this;

		// when a Core instance has been created before, don't create another one
		if (sap.ui.getCore && sap.ui.getCore()) {
			console.error("Only the framework must create an instance of sap/ui/core/Core." +
						" To get access to its functionality, use sap.ui.getCore().");
			return sap.ui.getCore();
		}

		BaseObject.call(this);

		_oEventProvider = new EventProvider();

		// Generate all functions from EventProvider for backward compatibility
		["attachEvent", "detachEvent", "getEventingParent"].forEach(function (sFuncName) {
			Core.prototype[sFuncName] = _oEventProvider[sFuncName].bind(_oEventProvider);
		});

		this.oMessageManager = MessageManager;
		var bHandleValidation = Configuration.getHandleValidation();
		if (bHandleValidation) {
			MessageManager.registerObject(this, true);
		}

		this.bBooted = false;
		this.bInitialized = false;
		this.bReady = false;
		this.aPlugins = [];
		this.oModels = {};
		this.oEventBus = null;
		this.mObjects = { "template": {} };
		this.oRootComponent = null;

		// freeze Config
		//var GlobalConfigurationProvider = new GlobalConfigurationProvider();
		//GlobalConfigurationProvider.freeze();


		// let Element and Component get friend access to the respective register/deregister methods
		this._grantFriendAccess();

		var sPreloadMode = Configuration.getPreload();

		// This flag controls the core initialization flow.
		// We can switch to async when an async preload is used or the ui5loader
		// is in async mode. The latter might also happen for debug scenarios
		// where no preload is used at all.
		var bAsync = sPreloadMode === "async" || sap.ui.loader.config().async;

		// adding the following classList is done here for compatibility reasons
		document.documentElement.classList.add("sapUiTheme-" + Theming.getTheme());

		//TODO: This probably sets some css attributes that are needed for themes
		/*
		this._setupBrowser();
		this._setupOS();
		this._setupLang();
		this._setupAnimation();
		*/

		sap.ui.getCore = function() {
			return that.getInterface();
		};

		var fnContentLoadedCallback = function() {
			oSyncPoint1.finishTask(iDocumentReadyTask);
			document.removeEventListener("DOMContentLoaded", fnContentLoadedCallback);
		};

		// immediately execute callback if the ready state is already 'complete'
		if (document.readyState !== "loading") {
			fnContentLoadedCallback();
		} else {
			// task 1 is to wait for document.ready
			document.addEventListener("DOMContentLoaded", fnContentLoadedCallback);
		}

		// sync point 2 synchronizes all library preloads and the end of the bootstrap script
		var oSyncPoint2 = new SyncPoint("UI5 Core Preloads and Bootstrap Script", function(iOpenTasks, iFailures) {
		});


		jQuery.support.useFlexBoxPolyfill = false;

		this.boot = function() {
			if (this.bBooted) {
				return;
			}
			this.bBooted = true;
			postConstructorTasks.call(this);
			oSyncPoint2.finishTask(iBootstrapScriptTask);
		};

		function postConstructorTasks() {
			if ( sPreloadMode === "sync" || sPreloadMode === "async" ) {
				// determine set of libraries
				var aLibs = that.aModules.reduce(function(aResult, sModule) {
					var iPos = sModule.search(/\.library$/);
					if ( iPos >= 0 ) {
						aResult.push(sModule.slice(0, iPos));
					}
					return aResult;
				}, []);

				var pLibraryPreloaded = Library._load(aLibs, {
					sync: !bAsync,
					preloadOnly: true
				});

				if ( bAsync ) {
					var iPreloadLibrariesTask = oSyncPoint2.startTask("preload bootstrap libraries");
					pLibraryPreloaded.then(function() {
						oSyncPoint2.finishTask(iPreloadLibrariesTask);
					}, function() {
						oSyncPoint2.finishTask(iPreloadLibrariesTask, false);
					});
				}
			}

			that._boot(bAsync, function() {
				oSyncPoint1.finishTask(iCoreBootTask);
				Measurement.end("coreBoot");
			});
		}
	}

	static M_EVENTS = {
		ControlEvent: "ControlEvent",
		UIUpdated: "UIUpdated",
		ThemeChanged: "ThemeChanged",
		ThemeScopingChanged: "themeScopingChanged",
		LocalizationChanged: "localizationChanged",
		LibraryChanged: "libraryChanged",
		ValidationError: "validationError",
		ParseError: "parseError",
		FormatError: "formatError",
		ValidationSuccess: "validationSuccess",
	};

	_grantFriendAccess() {
		// grant ElementMetadata "friend" access to Core for registration
		ElementMetadata.prototype.register = function(oMetadata) {
			Library._registerElement(oMetadata);
		};
	}

	_setupBrowser() {
		//set the browser for CSS attribute selectors. do not move this to the onload function because Safari does not
		//use the classes
		var html = document.documentElement;

		var b = Device.browser;
		var id = b.name;

		if (id) {
			if (id === b.BROWSER.SAFARI && b.mobile) {
				id = "m" + id;
			}
			id = id + (b.version === -1 ? "" : Math.floor(b.version));
			html.dataset.sapUiBrowser = id;
		}
	}

	_setupOS() {
		var html = document.documentElement;
		html.dataset.sapUiOs = Device.os.name + Device.os.versionStr;
		var osCSS = null;
		switch (Device.os.name) {
			case Device.os.OS.IOS:
				osCSS = "sap-ios";
				break;
			case Device.os.OS.ANDROID:
				osCSS = "sap-android";
				break;
		}
		if (osCSS) {
			html.classList.add(osCSS);
		}
	};

	_setupLang() {
		var html = document.documentElement;

		// append the lang info to the document (required for ARIA support)
		var fnUpdateLangAttr = function() {
			var oLocale = Configuration.getLocale();
			oLocale ? html.setAttribute("lang", oLocale.toString()) : html.removeAttribute("lang");
		};
		fnUpdateLangAttr.call(this);

		// listen to localization change event to update the lang info
		this.attachLocalizationChanged(fnUpdateLangAttr, this);
	};

	_setupAnimation() {
		function adaptAnimationMode() {
			var html = document.documentElement;
			var sAnimationMode = ControlBehavior.getAnimationMode();
			html.dataset.sapUiAnimationMode = sAnimationMode;
			var bAnimation = (sAnimationMode !== AnimationMode.minimal && sAnimationMode !== AnimationMode.none);
			html.dataset.sapUiAnimation = bAnimation ? "on" : "off";
			if (typeof jQuery !== "undefined") {
				jQuery.fx.off = !bAnimation;
			}
		}
		ControlBehavior.attachChange(function(oEvent) {
			if (oEvent.animationMode) {
				adaptAnimationMode();
			}
		});
		adaptAnimationMode();
	}

	_boot(bAsync, fnCallback) {
		// add CalendarClass to list of modules
		this.aModules.push("sap/ui/core/date/" + Configuration.getCalendarType());

		// load all modules now
		if ( bAsync ) {
			return this._requireModulesAsync().then(function() {
				fnCallback();
			});
		}

		console.warning("Modules and libraries declared via bootstrap-configuration are loaded synchronously. Set preload configuration to" +
			" 'async' or switch to asynchronous bootstrap to prevent these requests.", "SyncXHR", null, function() {
			return {
				type: "SyncXHR",
				name: "legacy-module"
			};
		});

		this.aModules.forEach( function(mod) {
			var m = mod.match(/^(.*)\.library$/);
			if ( m ) {
				Library._load(m[1], {
					sync: true
				});
			} else {
				// data-sap-ui-modules might contain legacy jquery.sap.* modules
				sap.ui.requireSync( /^jquery\.sap\./.test(mod) ?  mod : mod.replace(/\./g, "/")); // legacy-relevant: Sync loading of modules and libraries
			}
		});

		fnCallback();
	};

	_requireModulesAsync() {
		var aLibs = [],
			aModules = [];

		this.aModules.forEach(function(sModule) {
			var m = sModule.match(/^(.*)\.library$/);
			if (m) {
				aLibs.push(m[1]);
			} else {
				// data-sap-ui-modules might contain legacy jquery.sap.* modules
				aModules.push(/^jquery\.sap\./.test(sModule) ? sModule : sModule.replace(/\./g, "/"));
			}
		});

		// TODO: require libs and modules in parallel or define a sequence?
		return Promise.all([
			Library._load(aLibs),
			new Promise(function(resolve) {
				sap.ui.require(aModules, function() {
					resolve(Array.prototype.slice.call(arguments));
				});
			})
		]);
	}


	applyTheme(sThemeName, sThemeBaseUrl) {
		assert(typeof sThemeName === "string", "sThemeName must be a string");
		assert(typeof sThemeBaseUrl === "string" || typeof sThemeBaseUrl === "undefined", "sThemeBaseUrl must be a string or undefined");

		if (sThemeBaseUrl) {
			Theming.setThemeRoot(sThemeName, sThemeBaseUrl);
		}
		Theming.setTheme(sThemeName);
	};

	setThemeRoot(sThemeName, aLibraryNames, sThemeBaseUrl, bForceUpdate) {
		if (typeof aLibraryNames === "string") {
			bForceUpdate = sThemeBaseUrl;
			sThemeBaseUrl  = aLibraryNames;
			aLibraryNames = undefined;
		}
		Theming.setThemeRoot(sThemeName, sThemeBaseUrl, aLibraryNames, bForceUpdate);
		return this;
	};


	/**
	 * Initializes the Core after the initial page was loaded
	 * @private
	 */
	init() {

		if (this.bInitialized) {
			return;
		}

		// provide core for event handling and UIArea creation
		UIArea.setCore(this);

		var METHOD = "sap.ui.core.Core.init()";

		console.info("Initializing",null,METHOD);

		Measurement.end("coreInit");

		this._setBodyAccessibilityRole();

		var sWaitForTheme = getWaitForTheme();

		// If there is no waitForTheme or ThemeManager is already available and theme is loaded render directly sync
		if (this.isThemeApplied() || !sWaitForTheme) {
			this._executeInitialization();
		} else {
			Rendering.suspend();


			if (sWaitForTheme === "rendering") {
				Rendering.notifyInteractionStep();
				this._executeInitialization();
				Rendering.getLogger().debug("delay initial rendering until theme has been loaded");
				Theming.attachAppliedOnce(function() {
					Rendering.resume("after theme has been loaded");
				});
			} else if (sWaitForTheme === "init") {
				Rendering.getLogger().debug("delay init event and initial rendering until theme has been loaded");
				Rendering.notifyInteractionStep();
				Theming.attachAppliedOnce(function() {
					this._executeInitialization();
					Rendering.resume("after theme has been loaded");
				}.bind(this));
			}
		}
	};

	_executeOnInit() {
		var vOnInit = Configuration.getValue("onInit");

		// execute a configured init hook
		if ( vOnInit ) {
			if ( typeof vOnInit === "function" ) {
				vOnInit();
			} else if (typeof vOnInit === "string") {
				// determine onInit being a module name prefixed via module or a global name
				var aResult = /^module\:((?:[_$.\-a-zA-Z0-9]+\/)*[_$.\-a-zA-Z0-9]+)$/.exec(vOnInit);
				if (aResult && aResult[1]) {
					// ensure that the require is done async and the Core is finally booted!
					setTimeout(sap.ui.require.bind(sap.ui, [aResult[1]]), 0);
				} else {
					// lookup the name specified in onInit and try to call the function directly
					var fn = ObjectPath.get(vOnInit);
					if (typeof fn === "function") {
						fn();
					} else {
						console.warning("[Deprecated] Do not use inline JavaScript code with the oninit attribute."
							+ " Use the module:... syntax or the name of a global function");
						/*
							* In contrast to eval(), window.eval() executes the given string
							* in the global context, without closure variables.
							* See http://www.ecma-international.org/ecma-262/5.1/#sec-10.4.2
							*/
						// eslint-disable-next-line no-eval
						window.eval(vOnInit);  // csp-ignore-legacy-api
					}
				}
			}
		}
	};

	/**
	 * Creates a "rootComponent" or "sap.ui.app.Application".
	 * Both concepts are deprecated.
	 * Called during Core initialization.
	 * @deprecated since 1.95
	 * @private
	 */
	_setupRootComponent() {
		var METHOD = "sap.ui.core.Core.init()";

		// load the root component
		// @deprecated concept, superseded by "sap/ui/core/ComponentSupport"
		var sRootComponent = Configuration.getRootComponent();
		if (sRootComponent) {

			console.info("Loading Root Component: " + sRootComponent,null,METHOD);
			var oComponent = sap.ui.component({ //legacy-relevant: Deprecated rootComponent API
				name: sRootComponent
			});
			this.oRootComponent = oComponent;

			var sRootNode = Configuration.getValue("xx-rootComponentNode");
			if (sRootNode && oComponent.isA('sap.ui.core.UIComponent')) {
				var oRootNode = document.getElementById(sRootNode);
				if (oRootNode) {
					console.info("Creating ComponentContainer for Root Component: " + sRootComponent,null,METHOD);
					var ComponentContainer = sap.ui.requireSync('sap/ui/core/ComponentContainer'), // legacy-relevant: Deprecated rootComponent API
						oContainer = new ComponentContainer({
						component: oComponent,
						propagateModel: true /* TODO: is this a configuration or do this by default? right now it behaves like the application */
					});
					oContainer.placeAt(oRootNode);
				}
			}

		} else {
			// @deprecated concept, superseded by "sap/ui/core/Component"
			var sApplication = Configuration.getApplication();
			if (sApplication) {

				console.warning("The configuration 'application' is deprecated. Please use the configuration 'component' instead! " +
				"Please migrate from sap.ui.app.Application to sap.ui.core.Component.", "SyncXHR", null, function () {
					return {
						type: "Deprecation",
						name: "sap.ui.core"
					};
				});

				console.info("Loading Application: " + sApplication,null,METHOD);
				sap.ui.requireSync(sApplication.replace(/\./g, "/")); // legacy-relevant: deprecated
				var oClass = ObjectPath.get(sApplication);
				assert(oClass !== undefined, "The specified application \"" + sApplication + "\" could not be found!");
				var oApplication = new oClass();
				assert(BaseObject.isA(oApplication, 'sap.ui.app.Application'), "The specified application \"" + sApplication + "\" must be an instance of sap.ui.app.Application!");

			}
		}
	};

	_setBodyAccessibilityRole() {
		var body = document.body;

		//Add ARIA role 'application'
		if (Configuration.getAccessibility() && Configuration.getAutoAriaBodyRole() && !body.getAttribute("role")) {
			body.setAttribute("role", "application");
		}
	};

	_executeInitialization() {
		// chain ready to be the firstone that is executed
		var METHOD = "sap.ui.core.Core.init()"; // Because it's only used from init
		if (this.bInitialized) {
			return;
		}
		this.bInitialized = true;
		console.info("Initialized",null,METHOD);

		// start the plugins
		console.info("Starting Plugins",null,METHOD);
		this.startPlugins();
		console.info("Plugins started",null,METHOD);

		this._executeOnInit();
		this._setupRootComponent(); // @legacy-relevant: private API for 2 deprecated concepts "rootComponent" & "sap.ui.app.Application"
		this.pReady.resolve();
		this.bReady = true;
	};

	isInitialized () {
		return this.bInitialized;
	};

	isThemeApplied = Theming.isApplied;

	Theming.attachApplied(function(oEvent) {
		// notify the listeners via a control event
		_oEventProvider && _oEventProvider.fireEvent(Core.M_EVENTS.ThemeChanged, BaseEvent.getParameters(oEvent));
	});

	attachInitEvent (fnFunction) {
		assert(typeof fnFunction === "function", "fnFunction must be a function");
		if (!this.bReady) {
			this.pReady.promise.then(fnFunction);
		}
	};

	attachInit (fnFunction) {
		assert(typeof fnFunction === "function", "fnFunction must be a function");
		this.ready(fnFunction);
	};

	lock () {
		// TODO clarify it the documentation is really (still?) true
		this.bLocked = true;
	};

	unlock () {
		this.bLocked = false;
	};

	isLocked () {
		return this.bLocked;
	};

	getConfiguration () {
		return Configuration;
	};

	getRenderManager() {
		return this.createRenderManager(); //this.oRenderManager;
	};

	createRenderManager() {
		assert(this.isInitialized(), "A RenderManager should be created only after the Core has been initialized");
		var oRm = new RenderManager();
		return oRm.getInterface();
	};


	getCurrentFocusedControlId() {
		if (!this.isInitialized()) {
			throw new Error("Core must be initialized");
		}
		FocusHandler = FocusHandler || sap.ui.require("sap/ui/core/FocusHandler");
		return FocusHandler ? FocusHandler.getCurrentFocusedControlId() : null;
	};


	createComponent(vComponent, sUrl, sId, mSettings) {
		// convert the parameters into a configuration object
		if (typeof vComponent === "string") {
			vComponent = {
				name: vComponent,
				url: sUrl
			};
			// parameter fallback (analog to ManagedObject)
			if (typeof sId === "object") {
				vComponent.settings = sId;
			} else {
				vComponent.id = sId;
				vComponent.settings = mSettings;
			}
		}

		// use the factory function
		if ( vComponent.async &&
			(vComponent.manifest !== undefined ||
				(vComponent.manifestFirst === undefined && vComponent.manifestUrl === undefined)) ) {
			if ( vComponent.manifest === undefined ) {
				vComponent.manifest = false;
			}
			return Component.create(vComponent);
		}

		// use deprecated factory for sync use case or when legacy options are used
		return sap.ui.component(vComponent); // legacy-relevant
	};


	getRootComponent() {
		return this.oRootComponent;
	};

	placeControlAt(oDomRef, oControl) {
		assert(typeof oDomRef === "string" || typeof oDomRef === "object", "oDomRef must be a string or object");
		assert(oControl instanceof Interface || BaseObject.isA(oControl, "sap.ui.core.Control"), "oControl must be a Control or Interface");

		if (oControl) {
			oControl.placeAt(oDomRef, "only");
		}
	}

	setRoot = placeControlAt;

	createUIArea(oDomRef) {
		if (typeof oDomRef === "string" && oDomRef === StaticArea.STATIC_UIAREA_ID) {
			return StaticArea.getUIArea();
		}
		return UIArea.create(oDomRef);
	};

	getUIArea(o) {
		assert(typeof o === "string" || typeof o === "object", "o must be a string or object");

		var sId = "";
		if (typeof (o) == "string") {
			sId = o;
		} else {
			sId = o.id;
		}

		if (sId) {
			return UIArea.registry.get(sId);
		}

		return null;
	};

	getUIDirty() {
		return Rendering.getUIDirty();
	};

	attachUIUpdated(fnFunction, oListener) {
		_oEventProvider.attachEvent(Core.M_EVENTS.UIUpdated, fnFunction, oListener);
	};

	detachUIUpdated(fnFunction, oListener) {
		_oEventProvider.detachEvent(Core.M_EVENTS.UIUpdated, fnFunction, oListener);
	};

	Rendering.attachUIUpdated(function(oEvent) {
		_oEventProvider.fireEvent(Core.M_EVENTS.UIUpdated, oEvent.getParameters());
	});

	notifyContentDensityChanged = Theming.notifyContentDensityChanged;

	attachThemeChanged(fnFunction, oListener) {
		// preparation for letting the "themeChanged" event be forwarded from the ThemeManager to the Core
		_oEventProvider.attachEvent(Core.M_EVENTS.ThemeChanged, fnFunction, oListener);
	};

	detachThemeChanged(fnFunction, oListener) {
		_oEventProvider.detachEvent(Core.M_EVENTS.ThemeChanged, fnFunction, oListener);
	};

	attachThemeScopingChanged(fnFunction, oListener) {
		_oEventProvider.attachEvent(Core.M_EVENTS.ThemeScopingChanged, fnFunction, oListener);
	};

	detachThemeScopingChanged(fnFunction, oListener) {
		_oEventProvider.detachEvent(Core.M_EVENTS.ThemeScopingChanged, fnFunction, oListener);
	};

	fireThemeScopingChanged(mParameters) {
		_oEventProvider.fireEvent(Core.M_EVENTS.ThemeScopingChanged, mParameters);
	};

	attachLocalizationChanged(fnFunction, oListener) {
		_oEventProvider.attachEvent(Core.M_EVENTS.LocalizationChanged, fnFunction, oListener);
	};

	detachLocalizationChanged(fnFunction, oListener) {
		_oEventProvider.detachEvent(Core.M_EVENTS.LocalizationChanged, fnFunction, oListener);
	};

	fireLocalizationChanged(mChanges) {
		var sEventId = Core.M_EVENTS.LocalizationChanged,
			oBrowserEvent = jQuery.Event(sEventId, {changes : mChanges}),
			fnAdapt = ManagedObject._handleLocalizationChange;

		console.info("localization settings changed: " + Object.keys(mChanges).join(","), null, "sap.ui.core.Core");

		/*
			* Notify models that are able to handle a localization change
			*/
		each(this.oModels, function (prop, oModel) {
			if (oModel && oModel._handleLocalizationChange) {
				oModel._handleLocalizationChange();
			}
		});

		/*
			* Notify all UIAreas, Components, Elements to first update their models (phase 1)
			* and then to update their bindings and corresponding data types (phase 2)
			*/
		function notifyAll(iPhase) {
			UIArea.registry.forEach(function(oUIArea) {
				fnAdapt.call(oUIArea, iPhase);
			});
			Component.registry.forEach(function(oComponent) {
				fnAdapt.call(oComponent, iPhase);
			});
			Element.registry.forEach(function(oElement) {
				fnAdapt.call(oElement, iPhase);
			});
		}

		notifyAll.call(this,1);
		notifyAll.call(this,2);

		// special handling for changes of the RTL mode
		if ( mChanges.rtl != undefined ) {
			// update the dir attribute of the document
			document.documentElement.setAttribute("dir", mChanges.rtl ? "rtl" : "ltr");

			// invalidate all UIAreas
			UIArea.registry.forEach(function(oUIArea) {
				oUIArea.invalidate();
			});
			console.info("RTL mode " + mChanges.rtl ? "activated" : "deactivated");
		}

		// notify Elements via a pseudo browser event (onlocalizationChanged, note the lower case 'l')
		Element.registry.forEach(function(oElement) {
			oElement._handleEvent(oBrowserEvent);
		});

		// notify registered Core listeners
		_oEventProvider.fireEvent(sEventId, {changes : mChanges});
	};

	attachLibraryChanged(fnFunction, oListener) {
		_oEventProvider.attachEvent(Core.M_EVENTS.LibraryChanged, fnFunction, oListener);
	};

	detachLibraryChanged(fnFunction, oListener) {
		_oEventProvider.detachEvent(Core.M_EVENTS.LibraryChanged, fnFunction, oListener);
	};

	Library.attachLibraryChanged(function(oEvent) {
		// notify registered Core listeners
		_oEventProvider.fireEvent(Core.M_EVENTS.LibraryChanged, oEvent.getParameters());
	});

	applyChanges() {
		Rendering.renderPendingUIUpdates("forced by applyChanges");
	};

	registerObject(oObject) {
		var sId = oObject.getId(),
			sType = oObject.getMetadata().getStereotype(),
			oldObject = this.getObject(sType, sId);

		if ( oldObject && oldObject !== oObject ) {
			console.error("adding object \"" + sType + "\" with duplicate id '" + sId + "'");
			throw new Error("Error: adding object \"" + sType + "\" with duplicate id '" + sId + "'");
		}

		this.mObjects[sType][sId] = oObject;
	};

	deregisterObject(oObject) {
		var sId = oObject.getId(),
			sType = oObject.getMetadata().getStereotype();
		delete this.mObjects[sType][sId];
	};


	/**
	 * Returns the registered element with the given ID, if any.
	 *
	 * The ID must be the globally unique ID of an element, the same as returned by <code>oElement.getId()</code>.
	 *
	 * When the element has been created from a declarative source (e.g. XMLView), that source might have used
	 * a shorter, non-unique local ID. A search for such a local ID cannot be executed with this method.
	 * It can only be executed on the corresponding scope (e.g. on an XMLView instance), by using the
	 * {@link sap.ui.core.mvc.View#byId View#byId} method of that scope.
	 *
	 * @param {sap.ui.core.ID|null|undefined} sId ID of the element to search for
	 * @returns {sap.ui.core.Element|undefined} Element with the given ID or <code>undefined</code>
	 * @public
	 * @function
	 */
	byId = Element.registry.get;

	/**
	 * Returns the registered element for the given ID, if any.
	 *
	 * @param {sap.ui.core.ID|null|undefined} sId ID of the control to retrieve
	 * @returns {sap.ui.core.Element|undefined} Element for the given ID or <code>undefined</code>
	 * @deprecated As of version 1.1, use <code>sap.ui.core.Core.byId</code> instead!
	 * @function
	 * @public
	 */
	getControl = Element.registry.get;

	/**
	 * Returns the registered element for the given ID, if any.
	 *
	 * @param {sap.ui.core.ID|null|undefined} sId ID of the element to retrieve
	 * @returns {sap.ui.core.Element|undefined} Element for the given ID or <code>undefined</code>
	 * @deprecated As of version 1.1, use <code>sap.ui.core.Core.byId</code> instead!
	 * @function
	 * @public
	 */
	getElementById = Element.registry.get;

	/**
	 * Returns the registered object for the given ID, if any.
	 *
	 * @param {string} sType Stereotype of the object to retrieve
	 * @param {sap.ui.core.ID|null|undefined} sId ID of the object to retrieve
	 * @returns {sap.ui.base.ManagedObject|undefined} Object of the given type and with the given ID or undefined
	 * @private
	 */
	getObject(sType, sId) {
		assert(sId == null || typeof sId === "string", "sId must be a string when defined");
		assert(this.mObjects[sType] !== undefined, "sType must be a supported stereotype");
		return sId == null ? undefined : this.mObjects[sType] && this.mObjects[sType][sId];
	};

	/**
	 * Returns the registered component for the given id, if any.
	 * @param {string} sId
	 * @return {sap.ui.core.Component} the component for the given id
	 * @function
	 * @public
	 * @deprecated Since 1.95. Please use {@link sap.ui.core.Component.get Component.get} instead.
	 */
	getComponent = Component.registry.get;

	/**
	 * Returns the registered template for the given id, if any.
	 * @param {string} sId
	 * @return {sap.ui.core.Component} the template for the given id
	 * @public
	 * @deprecated Since 1.29.1 Require 'sap/ui/core/tmpl/Template' and use {@link sap.ui.core.tmpl.Template.byId Template.byId} instead.
	 */
	getTemplate(sId) {
		console.warning("Synchronous loading of 'sap/ui/core/tmpl/Template'. Use 'sap/ui/core/tmpl/Template' module and" +
			" call Template.byId instead", "SyncXHR", null, function() {
			return {
				type: "SyncXHR",
				name: "Core.prototype.getTemplate"
			};
		});
		var Template = sap.ui.requireSync('sap/ui/core/tmpl/Template'); // legacy-relevant
		return Template.byId(sId);
	};

	getStaticAreaRef() {
		return StaticArea.getDomRef();
	};

	isStaticAreaRef(oDomRef) {
		return StaticArea.getDomRef() === oDomRef;
	};

	oIntervalTrigger;

	/**
	 * Registers a listener for control events.
	 *
	 * When called, the context of the listener (its <code>this</code>) will be bound to <code>oListener</code>
	 * if specified, otherwise it will be bound to a dummy event provider object.
	 *
	 * @param {function} fnFunction Callback to be called for each control event
	 * @param {object} [oListener] Optional context object to call the callback on
	 * @public
	 */
	attachControlEvent(fnFunction, oListener) {
		_oEventProvider.attachEvent(Core.M_EVENTS.ControlEvent, fnFunction, oListener);
	};

	/**
	 * Unregisters a listener for control events.
	 *
	 * The passed function and listener object must match the ones used for event registration.
	 *
	 * @param {function} fnFunction Function to unregister
	 * @param {object} [oListener] Context object on which the given function had to be called
	 * @public
	 */
	detachControlEvent(fnFunction, oListener) {
		_oEventProvider.detachEvent(Core.M_EVENTS.ControlEvent, fnFunction, oListener);
	};

	/**
	 * Notifies the listeners that an event on a control occurs.
	 *
	 * @param {object} oParameters Parameters to pass along with the event, e.g. <code>{ browserEvent: jQuery.Event }</code>
	 * @private
	 */
	fireControlEvent(oParameters) {
		_oEventProvider.fireEvent(Core.M_EVENTS.ControlEvent, oParameters);
	};

	/**
	 * Handles a control event and forwards it to the registered control event listeners.
	 *
	 * @param {jQuery.Event} oEvent control event
	 * @param {string} sUIAreaId id of the UIArea that received the event
	 * @private
	 */
	_handleControlEvent(/**event*/oEvent, sUIAreaId) {
		// Create a copy of the event
		var oEventClone = jQuery.Event(oEvent.type);
		Object.assign(oEventClone, oEvent);
		oEventClone.originalEvent = undefined;

		this.fireControlEvent({"browserEvent": oEventClone, "uiArea": sUIAreaId});
	};

	getApplication() {
		return sap.ui.getApplication && sap.ui.getApplication();
	};

	setModel(oModel, sName) {
		assert(oModel == null || BaseObject.isA(oModel, 'sap.ui.model.Model'), "oModel must be an instance of sap.ui.model.Model, null or undefined");
		assert(sName === undefined || (typeof sName === "string" && !/^(undefined|null)?$/.test(sName)), "sName must be a string or omitted");
		var that = this,
			oProperties;

		if (!oModel && this.oModels[sName]) {
			delete this.oModels[sName];
			if (isEmptyObject(that.oModels) && isEmptyObject(that.oBindingContexts)) {
				oProperties = ManagedObject._oEmptyPropagatedProperties;
			} else {
				oProperties = {
					oModels: Object.assign({}, that.oModels),
					oBindingContexts: {},
					aPropagationListeners: []
				};
			}
			// propagate Models to all UI areas

			UIArea.registry.forEach(function (oUIArea){
				if (oModel != oUIArea.getModel(sName)) {
					oUIArea._propagateProperties(sName, oUIArea, oProperties, false, sName);
				}
			});
		} else if (oModel && oModel !== this.oModels[sName] ) {
			this.oModels[sName] = oModel;
			// propagate Models to all UI areas
			UIArea.registry.forEach(function (oUIArea){
				if (oModel != oUIArea.getModel(sName)) {
					var oProperties = {
						oModels: Object.assign({}, this.oModels),
						oBindingContexts: {},
						aPropagationListeners: []
					};
					oUIArea._propagateProperties(sName, oUIArea, oProperties, false, sName);
				}
			}.bind(this));
		} //else nothing to do
		return this;
	};

	setMessageManager(oMessageManager) {
		this.oMessageManager = oMessageManager;
	};

	getMessageManager() {
		return this.oMessageManager;
	};

	byFieldGroupId(vFieldGroupIds) {
		return Element.registry.filter(function(oElement) {
			return oElement.isA("sap.ui.core.Control") && oElement.checkFieldGroupIds(vFieldGroupIds);
		});
	};

	getModel(sName) {
		assert(sName === undefined || (typeof sName === "string" && !/^(undefined|null)?$/.test(sName)), "sName must be a string or omitted");
		return this.oModels[sName];
	};

	hasModel() {
		return !isEmptyObject(this.oModels);
	};

	getEventBus() {
		if (!this.oEventBus) {
			var EventBus = sap.ui.require('sap/ui/core/EventBus');
			if (!EventBus) {
				console.warning("Synchronous loading of EventBus. Ensure that 'sap/ui/core/EventBus' module is loaded" +
					" before this function is called.", "SyncXHR", null, function() {
					return {
						type: "SyncXHR",
						name: "core-eventbus"
					};
				});
				EventBus = sap.ui.requireSync('sap/ui/core/EventBus'); // legacy-relevant: fallback for missing dependency
			}
			var oEventBus = this.oEventBus = new EventBus();
			this._preserveHandler = function(event) {
				// for compatibility reasons
				oEventBus.publish("sap.ui", "__preserveContent", {domNode: event.domNode});
			};
			RenderManager.attachPreserveContent(this._preserveHandler);
		}
		return this.oEventBus;
	};

	attachValidationError(oData, fnFunction, oListener) {
		if (typeof (oData) === "function") {
			oListener = fnFunction;
			fnFunction = oData;
			oData = undefined;
		}
		_oEventProvider.attachEvent(Core.M_EVENTS.ValidationError, oData, fnFunction, oListener);
		return this;
	};

	detachValidationError(fnFunction, oListener) {
		_oEventProvider.detachEvent(Core.M_EVENTS.ValidationError, fnFunction, oListener);
		return this;
	};

	attachParseError(oData, fnFunction, oListener) {
		if (typeof (oData) === "function") {
			oListener = fnFunction;
			fnFunction = oData;
			oData = undefined;
		}
		_oEventProvider.attachEvent(Core.M_EVENTS.ParseError, oData, fnFunction, oListener);
		return this;
	};

	detachParseError(fnFunction, oListener) {
		_oEventProvider.detachEvent(Core.M_EVENTS.ParseError, fnFunction, oListener);
		return this;
	};

	attachFormatError(oData, fnFunction, oListener) {
		if (typeof (oData) === "function") {
			oListener = fnFunction;
			fnFunction = oData;
			oData = undefined;
		}
		_oEventProvider.attachEvent(Core.M_EVENTS.FormatError, oData, fnFunction, oListener);
		return this;
	};

	detachFormatError(fnFunction, oListener) {
		_oEventProvider.detachEvent(Core.M_EVENTS.FormatError, fnFunction, oListener);
		return this;
	};

	attachValidationSuccess(oData, fnFunction, oListener) {
		if (typeof (oData) === "function") {
			oListener = fnFunction;
			fnFunction = oData;
			oData = undefined;
		}
		_oEventProvider.attachEvent(Core.M_EVENTS.ValidationSuccess, oData, fnFunction, oListener);
		return this;
	};

	detachValidationSuccess(fnFunction, oListener) {
		_oEventProvider.detachEvent(Core.M_EVENTS.ValidationSuccess, fnFunction, oListener);
		return this;
	};

	fireParseError(oParameters) {
		_oEventProvider.fireEvent(Core.M_EVENTS.ParseError, oParameters);
		return this;
	};

	fireValidationError(oParameters) {
		_oEventProvider.fireEvent(Core.M_EVENTS.ValidationError, oParameters);
		return this;
	};

	fireFormatError(oParameters) {
		_oEventProvider.fireEvent(Core.M_EVENTS.FormatError, oParameters);
		return this;
	};

	fireValidationSuccess(oParameters) {
		_oEventProvider.fireEvent(Core.M_EVENTS.ValidationSuccess, oParameters);
		return this;
	};

	isMobile() {
		//TODO
		return false;
		return Device.browser.mobile;
	};

	_getEventProvider() {
		return _oEventProvider;
	};

	addPrerenderingTask(fnPrerenderingTask, bFirst) {
		Rendering.addPrerenderingTask(fnPrerenderingTask, bFirst);
	};

	ready(fnReady) {
		if (fnReady) {
			if (this.bReady) {
				fnReady();
			} else {
				this.pReady.promise.then(fnReady);
			}
		}
		return this.pReady.promise;
	};

	destroy() {
		RenderManager.detachPreserveContent(this._preserveHandler);
		_oEventProvider.destroy();
		BaseObject.prototype.destroy.call(this);
	};
}

sap.ui.setRoot = placeControlAt;