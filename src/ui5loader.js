import { Core } from "./sap/ui/core/Core.js";

globalThis.sap = globalThis.sap || {};

sap.ui = sap.ui || {};

sap.ui.core = new Core();
sap.ui.getCore = function() {
	return sap.ui.core;
}