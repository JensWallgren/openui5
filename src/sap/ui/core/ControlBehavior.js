import { Eventing } from "/microui5/src/sap/base/Eventing.js";

"use strict";

export class ControlBehavior extends Eventing {
	#oWritableConfig = BaseConfig.getWritableInstance();

	#fireChange(mChanges) {
		ControlBehavior.fireEvent("change", mChanges);
	}

	attachChange(fnFunction) {
		ControlBehavior.attachEvent("change", fnFunction);
	}

	detachChange(fnFunction) {
		ControlBehavior.detachEvent("change", fnFunction);
	}

	isAccessibilityEnabled() {
		return this.#oWritableConfig.get({
			name: "sapUiAccessibility",
			type: BaseConfig.Type.Boolean,
			defaultValue: true,
			external: true
		});
	}

	getAnimationMode() {
		var sAnimationMode = this.#oWritableConfig.get({
			name: "sapUiAnimationMode",
			type: AnimationMode,
			defaultValue: undefined,
			external: true
		});
		var bAnimation = this.#oWritableConfig.get({
			name: "sapUiAnimation",
			type: BaseConfig.Type.Boolean,
			defaultValue: true,
			external: true
		});
		if (sAnimationMode === undefined) {
			if (bAnimation) {
				sAnimationMode = AnimationMode.full;
			} else {
				sAnimationMode = AnimationMode.minimal;
			}
		}
		BaseConfig._.checkEnum(AnimationMode, sAnimationMode, "animationMode");
		return sAnimationMode;
	}

	setAnimationMode(sAnimationMode) {
		BaseConfig._.checkEnum(AnimationMode, sAnimationMode, "animationMode");

		var sOldAnimationMode = this.#oWritableConfig.get({
			name: "sapUiAnimationMode",
			type: AnimationMode,
			defaultValue: undefined,
			external: true
		});

		// Set the animation mode and update html attributes.
		this.#oWritableConfig.set("sapUiAnimationMode", sAnimationMode);
		if (sOldAnimationMode != sAnimationMode) {
			this.#fireChange({animationMode: sAnimationMode});
		}
	}
};

