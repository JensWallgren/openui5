"use strict";


// TODO: originally extended ManagedObject
export class Element /* extends ManagedObject */ {
	metadata = {
		stereotype : "element",
		"abstract" : true,
		publicMethods : [ "getId", "getMetadata", "getTooltip_AsString", "getTooltip_Text", "getModel", "setModel", "hasModel", "bindElement", "unbindElement", "getElementBinding", "prop", "getLayoutData", "setLayoutData" ],
		library : "sap.ui.core",
		aggregations : {
			tooltip : { type : "sap.ui.core.TooltipBase", altTypes : ["string"], multiple : false},
			customData : {type : "sap.ui.core.CustomData", multiple : true, singularName : "customData"},
			layoutData : {type : "sap.ui.core.LayoutData", multiple : false, singularName : "layoutData"},
			dependents : {type : "sap.ui.core.Element", multiple : true},
			dragDropConfig : {type : "sap.ui.core.dnd.DragDropBase", multiple : true, singularName : "dragDropConfig"}
		}
	}

	constructor(sId, mSettings) {
		ManagedObject.apply(this, arguments);
		this._iRenderingDelegateCount = 0;
	}

	renderer = null; // Element has no renderer

/*
// apply the registry mixin
ManagedObjectRegistry.apply(Element, {
	onDuplicate: function(sId, oldElement, newElement) {
		if ( oldElement._sapui_candidateForDestroy ) {
			Log.debug("destroying dangling template " + oldElement + " when creating new object with same ID");
			oldElement.destroy();
		} else {
			var sMsg = "adding element with duplicate id '" + sId + "'";
			// duplicate ID detected => fail or at least log a warning
			if (Configuration.getNoDuplicateIds()) {
				Log.error(sMsg);
				throw new Error("Error: " + sMsg);
			} else {
				Log.warning(sMsg);
			}
		}
	}
});
*/

	registry = {
	}


	getInterface() {
		return this;
	}

	_handleEvent(oEvent) {
		var that = this,
			sHandlerName = "on" + oEvent.type;

		function each(aDelegates) {
			var i,l,oDelegate;
			if ( aDelegates && (l = aDelegates.length) > 0 ) {
				// To be robust against concurrent modifications of the delegates list, we loop over a copy.
				// When there is only a single entry, the loop is safe without a copy (length is determined only once!)
				aDelegates = l === 1 ? aDelegates : aDelegates.slice();
				for (i = 0; i < l; i++ ) {
					if (oEvent.isImmediateHandlerPropagationStopped()) {
						return;
					}
					oDelegate = aDelegates[i].oDelegate;
					if (oDelegate[sHandlerName]) {
						oDelegate[sHandlerName].call(aDelegates[i].vThis === true ? that : aDelegates[i].vThis || oDelegate, oEvent);
					}
				}
			}
		}

		each(this.aBeforeDelegates);
		if ( oEvent.isImmediateHandlerPropagationStopped() ) {
			return;
		}
		if ( this[sHandlerName] ) {
			this[sHandlerName](oEvent);
		}
		each(this.aDelegates);

	};


	init() {
		// Before adding any implementation, please remember that this method was first implemented in release 1.54.
		// Therefore, many subclasses will not call this method at all.
	};

	exit() {
		// Before adding any implementation, please remember that this method was first implemented in release 1.54.
		// Therefore, many subclasses will not call this method at all.
	};

	toString() {
		return "Element " + this.getMetadata().getName() + "#" + this.sId;
	};

	getDomRef(sSuffix) {
		return document.getElementById(sSuffix ? this.getId() + "-" + sSuffix : this.getId());
	};

	$(sSuffix) {
		return jQuery(this.getDomRef(sSuffix));
	};

	isActive() {
		return this.oParent && this.oParent.isActive();
	};

	prop(sPropertyName, oValue) {

		var oPropertyInfo = this.getMetadata().getAllSettings()[sPropertyName];
		if (oPropertyInfo) {
			if (arguments.length == 1) {
				// getter
				return this[oPropertyInfo._sGetter]();
			} else {
				// setter
				this[oPropertyInfo._sMutator](oValue);
				return this;
			}
		}
	};

	setProperty(sPropertyName, vValue, bSuppressInvalidate) {
		if (sPropertyName != "enabled" || bSuppressInvalidate) {
			return ManagedObject.prototype.setProperty.apply(this, arguments);
		}

		var bOldEnabled = this.mProperties.enabled;
		ManagedObject.prototype.setProperty.apply(this, arguments);
		if (bOldEnabled != this.mProperties.enabled) {
			// the EnabledPropagator knows better which descendants to update
			EnabledPropagator.updateDescendants(this);
		}

		return this;
	};

	insertDependent(oElement, iIndex) {
		this.insertAggregation("dependents", oElement, iIndex, true);
		return this; // explicitly return 'this' to fix controls that override insertAggregation wrongly
	};

	addDependent(oElement) {
		this.addAggregation("dependents", oElement, true);
		return this; // explicitly return 'this' to fix controls that override addAggregation wrongly
	};

	removeDependent(vElement) {
		return this.removeAggregation("dependents", vElement, true);
	};

	removeAllDependents() {
		return this.removeAllAggregation("dependents", true);
	};

	destroyDependents() {
		this.destroyAggregation("dependents", true);
		return this; // explicitly return 'this' to fix controls that override destroyAggregation wrongly
	};

	rerender() {
		if (this.oParent) {
			this.oParent.rerender();
		}
	};


	getUIArea() {
		return this.oParent ? this.oParent.getUIArea() : null;
	};

	destroy(bSuppressInvalidate) {
		// ignore repeated calls
		if (this.bIsDestroyed) {
			return;
		}

		// determine whether parent exists or not
		var bHasNoParent = !this.getParent();

		// update the focus information (potentially) stored by the central UI5 focus handling
		Element._updateFocusInfo(this);

		ManagedObject.prototype.destroy.call(this, bSuppressInvalidate);

		// wrap custom data API to avoid creating new objects
		this.data = noCustomDataAfterDestroy;

		// exit early if there is no control DOM to remove
		var oDomRef = this.getDomRef();
		if (!oDomRef) {
			return;
		}

		// Determine whether to remove the control DOM from the DOM Tree or not:
		// If parent invalidation is not possible, either bSuppressInvalidate=true or there is no parent to invalidate then we must remove the control DOM synchronously.
		// Controls that implement marker interface sap.ui.core.PopupInterface are by contract not rendered by their parent so we cannot keep the DOM of these controls.
		// If the control is destroyed while its content is in the preserved area then we must remove DOM synchronously since we cannot invalidate the preserved area.
		var bKeepDom = (bSuppressInvalidate === "KeepDom");
		if (bSuppressInvalidate === true || (!bKeepDom && bHasNoParent) || this.isA("sap.ui.core.PopupInterface") || RenderManager.isPreservedContent(oDomRef)) {
			jQuery(oDomRef).remove();
		} else {
			// Make sure that the control DOM won't get preserved after it is destroyed (even if bSuppressInvalidate="KeepDom")
			oDomRef.removeAttribute("data-sap-ui-preserve");
			if (!bKeepDom) {
				// On destroy we do not remove the control DOM synchronously and just let the invalidation happen on the parent.
				// At the next tick of the RenderManager, control DOM nodes will be removed via rerendering of the parent anyway.
				// To make this new behavior more compatible we are changing the id of the control's DOM and all child nodes that start with the control id.
				oDomRef.id = "sap-ui-destroyed-" + this.getId();
				for (var i = 0, aDomRefs = oDomRef.querySelectorAll('[id^="' + this.getId() + '-"]'); i < aDomRefs.length; i++) {
					aDomRefs[i].id = "sap-ui-destroyed-" + aDomRefs[i].id;
				}
			}
		}
	};

	fireEvent(sEventId, mParameters, bAllowPreventDefault, bEnableEventBubbling) {
		if (this.hasListeners(sEventId)) {
			Interaction.notifyStepStart(sEventId, this);
		}

		// get optional parameters right
		if (typeof mParameters === 'boolean') {
			bEnableEventBubbling = bAllowPreventDefault;
			bAllowPreventDefault = mParameters;
			mParameters = null;
		}

		mParameters = mParameters || {};
		mParameters.id = mParameters.id || this.getId();

		if (Element._interceptEvent) {
			Element._interceptEvent(sEventId, this, mParameters);
		}

		return ManagedObject.prototype.fireEvent.call(this, sEventId, mParameters, bAllowPreventDefault, bEnableEventBubbling);
	};

	_interceptEvent = undefined;

	updateRenderingDelegate(oElement, oDelegate, iThresholdCount) {
		if (oDelegate.canSkipRendering || !(oDelegate.onAfterRendering || oDelegate.onBeforeRendering)) {
			return;
		}

		oElement._iRenderingDelegateCount += (iThresholdCount || -1);

		if (oElement.bOutput === true && oElement._iRenderingDelegateCount == iThresholdCount) {
			RenderManager.canSkipRendering(oElement, 1 /* update skip-the-rendering DOM marker, only if the apiVersion is 4 */);
		}
	}

	hasRenderingDelegate() {
		return Boolean(this._iRenderingDelegateCount);
	};

	addDelegate(oDelegate, bCallBefore, oThis, bClone) {
		assert(oDelegate, "oDelegate must be not null or undefined");

		if (!oDelegate) {
			return this;
		}

		this.removeDelegate(oDelegate);

		// shift parameters
		if (typeof bCallBefore === "object") {
			bClone = oThis;
			oThis = bCallBefore;
			bCallBefore = false;
		}

		if (typeof oThis === "boolean") {
			bClone = oThis;
			oThis = undefined;
		}

		(bCallBefore ? this.aBeforeDelegates : this.aDelegates).push({oDelegate:oDelegate, bClone: !!bClone, vThis: ((oThis === this) ? true : oThis)}); // special case: if this element is the given context, set a flag, so this also works after cloning (it should be the cloned element then, not the given one)
		updateRenderingDelegate(this, oDelegate, 1);

		return this;
	};

	removeDelegate(oDelegate) {
		var i;
		for (i = 0; i < this.aDelegates.length; i++) {
			if (this.aDelegates[i].oDelegate == oDelegate) {
				this.aDelegates.splice(i, 1);
				updateRenderingDelegate(this, oDelegate, 0);
				i--; // One element removed means the next element now has the index of the current one
			}
		}
		for (i = 0; i < this.aBeforeDelegates.length; i++) {
			if (this.aBeforeDelegates[i].oDelegate == oDelegate) {
				this.aBeforeDelegates.splice(i, 1);
				updateRenderingDelegate(this, oDelegate, 0);
				i--; // One element removed means the next element now has the index of the current one
			}
		}
		return this;
	};


	addEventDelegate(oDelegate, oThis) {
		return this.addDelegate(oDelegate, false, oThis, true);
	};

	removeEventDelegate(oDelegate) {
		return this.removeDelegate(oDelegate);
	};

	getFocusDomRef() {
		return this.getDomRef() || null;
	};

	isFocusable() {
		var oFocusDomRef = this.getFocusDomRef();

		if (!oFocusDomRef) {
			return false;
		}

		var oCurrentDomRef = oFocusDomRef;
		var oRect = oCurrentDomRef.getBoundingClientRect();

		// find the first parent element whose position is within the current view port
		// because document.elementsFromPoint can return meaningful DOM elements only when the given coordinate is
		// within the current view port
		while ((oRect.x < 0 || oRect.x > window.innerWidth ||
			oRect.y < 0 || oRect.y > window.innerHeight)) {

			if (oCurrentDomRef.assignedSlot) {
				// assigned slot's bounding client rect has all properties set to 0
				// therefore we jump to the slot's parentElement directly in the next "if...else if...else"
				oCurrentDomRef = oCurrentDomRef.assignedSlot;
			}

			if (oCurrentDomRef.parentElement) {
				oCurrentDomRef = oCurrentDomRef.parentElement;
			} else if (oCurrentDomRef.parentNode && oCurrentDomRef.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
				oCurrentDomRef = oCurrentDomRef.parentNode.host;
			} else {
				break;
			}

			oRect = oCurrentDomRef.getBoundingClientRect();
		}

		var aElements = document.elementsFromPoint(oRect.x, oRect.y);

		var iFocusDomRefIndex = aElements.findIndex(function(oElement) {
			return oElement.contains(oFocusDomRef);
		});

		var iBlockLayerIndex = aElements.findIndex(function(oElement) {
			return oElement.classList.contains("sapUiBLy") || oElement.classList.contains("sapUiBlockLayer");
		});

		if (iBlockLayerIndex !== -1 && iFocusDomRefIndex > iBlockLayerIndex) {
			// when block layer is visible and it's displayed over the Element's DOM
			return false;
		}

		return jQuery(oFocusDomRef).is(":sapFocusable");
	};

	getAncestorScrollPositions(oDomRef) {
		var oParentDomRef,
			aScrollHierarchy = [];

		oParentDomRef = oDomRef.parentNode;
		while (oParentDomRef) {
			aScrollHierarchy.push({
				node: oParentDomRef,
				scrollLeft: oParentDomRef.scrollLeft,
				scrollTop: oParentDomRef.scrollTop
			});
			oParentDomRef = oParentDomRef.parentNode;
		}

		return aScrollHierarchy;
	}

	restoreScrollPositions(aScrollHierarchy) {
		aScrollHierarchy.forEach(function(oScrollInfo) {
			var oDomRef = oScrollInfo.node;

			if (oDomRef.scrollLeft !== oScrollInfo.scrollLeft) {
				oDomRef.scrollLeft = oScrollInfo.scrollLeft;
			}

			if (oDomRef.scrollTop !== oScrollInfo.scrollTop) {
				oDomRef.scrollTop = oScrollInfo.scrollTop;
			}
		});
	}

	focus(oFocusInfo) {
		var oFocusDomRef = this.getFocusDomRef(),
			aScrollHierarchy = [];

		oFocusInfo = oFocusInfo || {};

		if (oFocusDomRef) {
			// save the scroll position of all ancestor DOM elements
			// before the focus is set, because preventScroll is not supported by the following browsers
			if (Device.browser.safari) {
				if (oFocusInfo.preventScroll === true) {
					aScrollHierarchy = getAncestorScrollPositions(oFocusDomRef);
				}
				oFocusDomRef.focus();
				if (aScrollHierarchy.length > 0) {
					// restore the scroll position if it's changed after setting focus
					// Safari needs a little delay to get the scroll position updated
					setTimeout(restoreScrollPositions.bind(null, aScrollHierarchy), 0);
				}
			} else {
				oFocusDomRef.focus(oFocusInfo);
			}
		}
	};

	getFocusInfo() {
		return {id:this.getId()};
	};

	applyFocusInfo(oFocusInfo) {
		this.focus(oFocusInfo);
		return this;
	};


	_refreshTooltipBaseDelegate(oTooltip) {
		var oOldTooltip = this.getTooltip();
		// if the old tooltip was a Tooltip object, remove it as a delegate
		if (BaseObject.isA(oOldTooltip, "sap.ui.core.TooltipBase")) {
			this.removeDelegate(oOldTooltip);
		}
		// if the new tooltip is a Tooltip object, add it as a delegate
		if (BaseObject.isA(oTooltip, "sap.ui.core.TooltipBase")) {
			oTooltip._currentControl = this;
			this.addDelegate(oTooltip);
		}
	};


	setTooltip(vTooltip) {
		this._refreshTooltipBaseDelegate(vTooltip);
		this.setAggregation("tooltip", vTooltip);
		return this;
	};

	getTooltip() {
		return this.getAggregation("tooltip");
	};

	runWithPreprocessors = ManagedObject.runWithPreprocessors;

	getTooltip_AsString() {
		var oTooltip = this.getTooltip();
		if (typeof oTooltip === "string" || oTooltip instanceof String ) {
			return oTooltip;
		}
		return undefined;
	};

	getTooltip_Text() {
		var oTooltip = this.getTooltip();
		if (oTooltip && typeof oTooltip.getText === "function" ) {
			return oTooltip.getText();
		}
		return oTooltip;
	};


	data() {
		var argLength = arguments.length;

		if (argLength == 0) {                    // return ALL data as a map
			var aData = this.getAggregation("customData"),
				result = {};
			if (aData) {
				for (var i = 0; i < aData.length; i++) {
					result[aData[i].getKey()] = aData[i].getValue();
				}
			}
			return result;

		} else if (argLength == 1) {
			var arg0 = arguments[0];

			if (arg0 === null) {                  // delete ALL data
				this.destroyAggregation("customData", true); // delete whole map
				return this;

			} else if (typeof arg0 == "string") { // return requested data element
				var dataObject = findCustomData(this, arg0);
				return dataObject ? dataObject.getValue() : null;

			} else if (typeof arg0 == "object") { // should be a map - set multiple data elements
				for (var key in arg0) { // TODO: improve performance and avoid executing setData multiple times
					setCustomData(this, key, arg0[key]);
				}
				return this;

			} else {
				// error, illegal argument
				throw new TypeError("When data() is called with one argument, this argument must be a string, an object or null, but is " + (typeof arg0) + ":" + arg0 + " (on UI Element with ID '" + this.getId() + "')");
			}

		} else if (argLength == 2) {            // set or remove one data element
			setCustomData(this, arguments[0], arguments[1]);
			return this;

		} else if (argLength == 3) {            // set or remove one data element
			setCustomData(this, arguments[0], arguments[1], arguments[2]);
			return this;

		} else {
			// error, illegal arguments
			throw new TypeError("data() may only be called with 0-3 arguments (on UI Element with ID '" + this.getId() + "')");
		}
	};

	_CustomData = CustomData;

	noCustomDataAfterDestroy() {
		// Report and ignore only write calls; read and remove calls are well-behaving
		var argLength = arguments.length;
		if ( argLength === 1 && arguments[0] !== null && typeof arguments[0] == "object"
				|| argLength > 1 && argLength < 4 && arguments[1] !== null ) {
			Log.error("Cannot create custom data on an already destroyed element '" + this + "'");
			return this;
		}
		return Element.prototype.data.apply(this, arguments);
	}


	clone(sIdSuffix, aLocalIds){
		var oClone = ManagedObject.prototype.clone.apply(this, arguments);
		// Clone delegates
		for ( var i = 0; i < this.aDelegates.length; i++) {
			if (this.aDelegates[i].bClone) {
				oClone.aDelegates.push(this.aDelegates[i]);
			}
		}
		for ( var k = 0; k < this.aBeforeDelegates.length; k++) {
			if (this.aBeforeDelegates[k].bClone) {
				oClone.aBeforeDelegates.push(this.aBeforeDelegates[k]);
			}
		}

		if (this._sapui_declarativeSourceInfo) {
			oClone._sapui_declarativeSourceInfo = Object.assign({}, this._sapui_declarativeSourceInfo);
		}

		return oClone;
	};

	findElements = ManagedObject.prototype.findAggregatedObjects;


	fireLayoutDataChange(oElement) {
		var oLayout = oElement.getParent();
		if (oLayout) {
			var oEvent = jQuery.Event("LayoutDataChange");
			oEvent.srcControl = oElement;
			oLayout._handleEvent(oEvent);
		}
	}

	setLayoutData(oLayoutData) {
		this.setAggregation("layoutData", oLayoutData, true); // No invalidate because layout data changes does not affect the control / element itself
		fireLayoutDataChange(this);
		return this;
	};

	destroyLayoutData() {
		this.destroyAggregation("layoutData", true);
		fireLayoutDataChange(this);
		return this;
	};

	bindElement = ManagedObject.prototype.bindObject;
	unbindElement = ManagedObject.prototype.unbindObject;
	getElementBinding = ManagedObject.prototype.getObjectBinding;

	_getFieldGroupIds() {
		var aFieldGroupIds;
		if (this.getMetadata().hasProperty("fieldGroupIds")) {
			aFieldGroupIds = this.getFieldGroupIds();
		}

		if (!aFieldGroupIds || aFieldGroupIds.length == 0) {
			var oParent = this.getParent();
			if (oParent && oParent._getFieldGroupIds) {
				return oParent._getFieldGroupIds();
			}
		}

		return aFieldGroupIds || [];
	};

	getDomRefForSetting(sSettingsName) {
		var oSetting = this.getMetadata().getAllSettings()[sSettingsName];
		if (oSetting && oSetting.selector) {
			var oDomRef = this.getDomRef();
			if (oDomRef) {
				oDomRef = oDomRef.parentNode;
				if (oDomRef && oDomRef.querySelector ) {
					var sSelector = oSetting.selector.replace(/\{id\}/g, this.getId().replace(/(:|\.)/g,'\\$1'));
					return oDomRef.querySelector(sSelector);
				}
			}
		}
		return null;
	};

	//*************** MEDIA REPLACEMENT ***********************//

	_getMediaContainerWidth() {
		if (typeof this._oContextualSettings === "undefined") {
			return undefined;
		}

		return this._oContextualSettings.contextualWidth;
	};

	_getCurrentMediaContainerRange(sName) {
		var iWidth = this._getMediaContainerWidth();

		sName = sName || Device.media.RANGESETS.SAP_STANDARD;

		return Device.media.getCurrentRange(sName, iWidth);
	};

	_onContextualSettingsChanged() {
		var iWidth = this._getMediaContainerWidth(),
			bShouldUseContextualWidth = iWidth !== undefined,
			bProviderChanged = bShouldUseContextualWidth ^ !!this._bUsingContextualWidth,// true, false or false, true (convert to boolean in case of default undefined)
			aListeners = this._aContextualWidthListeners || [];

		if (bProviderChanged) {

			if (bShouldUseContextualWidth) {
				// Contextual width was set for an element that was already using Device.media => Stop using Device.media
				aListeners.forEach(function (oL) {
					Device.media.detachHandler(oL.callback, oL.listener, oL.name);
				});
			} else {
				// Contextual width was unset for an element that had listeners => Start using Device.media
				aListeners.forEach(function (oL) {
					Device.media.attachHandler(oL.callback, oL.listener, oL.name);
				});
			}

			this._bUsingContextualWidth = bShouldUseContextualWidth;
		}

		// Notify all listeners, for which a media breakpoint change occurred, based on their RangeSet
		aListeners.forEach(function (oL) {
			var oMedia = this._getCurrentMediaContainerRange(oL.name);
			if (oMedia && oMedia.from !== oL.media.from) {
				oL.media = oMedia;
				oL.callback.call(oL.listener || window, oMedia);
			}
		}, this);
	};

	_attachMediaContainerWidthChange(fnFunction, oListener, sName) {
		sName = sName || Device.media.RANGESETS.SAP_STANDARD;

		// Add the listener to the list (and optionally initialize the list first)
		this._aContextualWidthListeners = this._aContextualWidthListeners || [];
		this._aContextualWidthListeners.push({
			callback: fnFunction,
			listener: oListener,
			name: sName,
			media: this._getCurrentMediaContainerRange(sName)
		});

		// Register to Device.media, unless contextual width was set
		if (!this._bUsingContextualWidth) {
			Device.media.attachHandler(fnFunction, oListener, sName);
		}
	};

	_detachMediaContainerWidthChange(fnFunction, oListener, sName) {
		var oL;

		sName = sName || Device.media.RANGESETS.SAP_STANDARD;

		// Do nothing if the Element doesn't have any listeners
		if (!this._aContextualWidthListeners) {
			return;
		}

		for (var i = 0, iL = this._aContextualWidthListeners.length; i < iL; i++) {
			oL = this._aContextualWidthListeners[i];
			if (oL.callback === fnFunction && oL.listener === oListener && oL.name === sName) {

				// De-register from Device.media, if using it
				if (!this._bUsingContextualWidth) {
					Device.media.detachHandler(fnFunction, oListener, sName);
				}

				this._aContextualWidthListeners.splice(i,1);
				break;
			}
		}
	};

	FocusHandler;
	static _updateFocusInfo(oElement) {
		FocusHandler = FocusHandler || sap.ui.require("sap/ui/core/FocusHandler");
		if (FocusHandler) {
			FocusHandler.updateControlFocusInfo(oElement);
		}
	};

	static closestTo = function(vParam, bIncludeRelated) {
		var sSelector = "[data-sap-ui]",
			oDomRef, sId;

		if (vParam === undefined || vParam === null) {
			return undefined;
		}

		if (typeof vParam === "string") {
			oDomRef = document.querySelector(vParam);
		} else if (vParam instanceof window.Element){
			oDomRef = vParam;
		} else if (vParam.jquery) {
			oDomRef = vParam[0];
			Log.error("[FUTURE] Do not call Element.closestTo() with jQuery object as parameter. \
				The function should be called with either a DOM Element or a CSS selector. \
				(future error, ignored for now)");
		} else {
			throw new TypeError("Element.closestTo accepts either a DOM element or a CSS selector string as parameter, but not '" + vParam + "'");
		}

		if (bIncludeRelated) {
			sSelector += ",[data-sap-ui-related]";
		}

		oDomRef = oDomRef && oDomRef.closest(sSelector);

		if (oDomRef) {
			if (bIncludeRelated) {
				sId = oDomRef.getAttribute("data-sap-ui-related");
			}

			sId = sId || oDomRef.getAttribute("id");
		}

		return Element.registry.get(sId);
	};

	/*
	Theming.attachApplied(function(oEvent) {
		// notify all elements/controls via a pseudo browser event
		var oJQueryEvent = jQuery.Event("ThemeChanged");
		oJQueryEvent.theme = oEvent.theme;
		Element.registry.forEach(function(oElement) {
			oElement._handleEvent(oJQueryEvent);
		});
	});
	*/
}
