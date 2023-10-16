import { ManagedObjectMetadata, Aggregation as FactoryAggregation } from "../base/ManagedObjectMetadata.js";

"use strict";

 export class ElementMetadata extends ManagedObjectMetadata {
	constructor(sClassName, oClassInfo) {
		super(arguments);
	}

	getElementName = function() {
		return this._sClassName;
	}

	getRendererName = function() {
		return this._sRendererName;
	}

	getRenderer = function() {
		if ( this._oRenderer ) {
			return this._oRenderer;
		}

		// determine name via function for those legacy controls that override getRendererName()
		var sRendererName = this.getRendererName();

		if ( !sRendererName ) {
			return undefined;
		}

		// check if renderer class exists already, in case it was passed inplace,
		// and written to the global namespace during applySettings().
		this._oRenderer =
			sap.ui.require(sRendererName.replace(/\./g, "/"))
			|| ObjectPath.get(sRendererName);
		if (this._oRenderer) {
			return this._oRenderer;
		}

		// if not, try to load a module with the same name
		Log.warning("Synchronous loading of Renderer for control class '" + this.getName() + "', due to missing Renderer dependency.", "SyncXHR", null, function() {
			return {
				type: "SyncXHR",
				name: sRendererName
			};
		});

		// Relevant for all controls that don't maintain the renderer module in their dependencies
		this._oRenderer =
			sap.ui.requireSync(sRendererName.replace(/\./g, "/")) // legacy-relevant
			|| ObjectPath.get(sRendererName);

		return this._oRenderer;
	}

	applySettings = function(oClassInfo) {
		var oStaticInfo = oClassInfo.metadata;

		this._sVisibility = oStaticInfo.visibility || "public";

		// remove renderer stuff before calling super.
		var vRenderer = Object.hasOwn(oClassInfo, "renderer") ? (oClassInfo.renderer || "") : undefined;
		delete oClassInfo.renderer;

		ManagedObjectMetadata.prototype.applySettings.call(this, oClassInfo);

		var oParent = this.getParent();
		this._sRendererName = this.getName() + "Renderer";
		this.dnd = Object.assign({
			draggable: false,
			droppable: false
		}, oParent.dnd, (typeof oStaticInfo.dnd == "boolean") ? {
			draggable: oStaticInfo.dnd,
			droppable: oStaticInfo.dnd
		} : oStaticInfo.dnd);

		if ( typeof vRenderer !== "undefined" ) {

			if ( typeof vRenderer === "string" ) {
				this._sRendererName = vRenderer || undefined;
				return;
			}

			// try to identify fully built renderers
			if ( (typeof vRenderer === "object" || typeof vRenderer === "function") && typeof vRenderer.render === "function" ) {
				var oRenderer = sap.ui.require(this.getRendererName().replace(/\./g, "/")) || ObjectPath.get(this.getRendererName());
				if ( oRenderer === vRenderer ) {
					// the given renderer has been exported globally already, it can be used without further action
					this._oRenderer = vRenderer;
					return;
				}
				if ( oRenderer === undefined && typeof vRenderer.extend === "function" ) {
					// the given renderer has an 'extend' method, so it most likely has been created by one of the
					// extend methods and it is usable already; it just has to be exported globally
					ObjectPath.set(this.getRendererName(), vRenderer);
					this._oRenderer = vRenderer;
					return;
				}
			}

			if ( typeof vRenderer === "function" ) {
				vRenderer = { render : vRenderer };
			}

			var oBaseRenderer;
			if ( oParent instanceof ElementMetadata ) {
				oBaseRenderer = oParent.getRenderer();
			}
			this._oRenderer = Renderer.extend.call(oBaseRenderer || Renderer, this.getRendererName(), vRenderer);
		}
	}

	afterApplySettings = function() {
		ManagedObjectMetadata.prototype.afterApplySettings.apply(this, arguments);
		this.register && this.register(this);
	}

	isHidden = function() {
		return this._sVisibility === "hidden";
	}

	getDragDropInfo(sAggregationName) {
		if (!sAggregationName) {
			return this.dnd;
		}

		var oAggregation = this._mAllAggregations[sAggregationName] || this._mAllPrivateAggregations[sAggregationName];
		if (!oAggregation) {
			return {};
		}
		return oAggregation.dnd;
	}
}

// ---- Aggregation -----------------------------------------------------------------------
export class Aggregation extends FactoryAggregation {
	constructor(oClass, name, info) {
		FactoryAggregation(arguments);
		this.dnd = Object.assign({
			draggable: false,
			droppable: false,
			layout: "Vertical"
		}, (typeof info.dnd == "boolean") ? {
			draggable: info.dnd,
			droppable: info.dnd
		} : info.dnd);
	}
}