import { EventProvider } from "../../base/EventProvider.js";

"use strict";

export class MessageManager extends EventProvider {

	constructor() {
		if (oMessageManager) {
			Log.error(
				"MessageManager is designed as a singleton and should not be created manually! " +
				"Please require 'sap/ui/core/message/MessageManager' instead and use the module export directly without using 'new'."
			);
		}
		EventProvider.apply(this, arguments);

		this.mProcessors = {};
		this.mObjects = {};
		this.mMessages = {};
	}

	_handleError(oEvent, bHandleValidation) {
		if (!this.oControlMessageProcessor) {
			this.oControlMessageProcessor = new ControlMessageProcessor();
		}
		if (bHandleValidation) {
			var oElement = oEvent.getParameter("element");
			var sProperty = oEvent.getParameter("property");
			var sTarget = oElement.getId() + '/' + sProperty;
			var sProcessorId = this.oControlMessageProcessor.getId();
			var bTechnical = oEvent.sId === "formatError";
			if (this.mMessages[sProcessorId] && this.mMessages[sProcessorId][sTarget]) {
				this._removeMessages(this.mMessages[sProcessorId][sTarget], true);
			}
			var oReference = {};
			oReference[oElement.getId()] = {
					properties:{},
					fieldGroupIds: oElement.getFieldGroupIds ? oElement.getFieldGroupIds() : undefined
			};
			oReference[oElement.getId()].properties[sProperty] = true;
			var oMessage = new Message({
					type: sap.ui.core.MessageType.Error,
					message: oEvent.getParameter("message"),
					target: sTarget,
					processor: this.oControlMessageProcessor,
					technical: bTechnical,
					references: oReference,
					validation: true
				});
			this.addMessages(oMessage);
		}
		oEvent.cancelBubble();
	}


	_handleSuccess(oEvent, bHandleValidation) {
		if (!this.oControlMessageProcessor) {
			this.oControlMessageProcessor = new ControlMessageProcessor();
		}
		if (bHandleValidation) {
			var oElement = oEvent.getParameter("element");
			var sProperty = oEvent.getParameter("property");
			var sTarget = oElement.getId() + '/' + sProperty;
			var sProcessorId = this.oControlMessageProcessor.getId();

			if (this.mMessages[sProcessorId] && this.mMessages[sProcessorId][sTarget]) {
				this._removeMessages(this.mMessages[sProcessorId][sTarget], true);
			}
		}
		oEvent.cancelBubble();
	}


	addMessages(vMessages) {
		var oMessage = vMessages,
			mProcessors = this.getAffectedProcessors(vMessages);

		if (!vMessages) {
			return;
		} else if (Array.isArray(vMessages)) {
			for (var i = 0; i < vMessages.length; i++) {
				oMessage = vMessages[i];
				this._importMessage(oMessage);
			}
		} else {
			this._importMessage(vMessages);
		}
		this._updateMessageModel(mProcessors);
	}

	_importMessage(oMessage) {
		var oProcessor = oMessage.getMessageProcessor(),
			sProcessorId = oProcessor && oProcessor.getId(),
			aTargets = oMessage.getTargets(),
			that = this;

		if (!this.mMessages[sProcessorId]) {
			this.mMessages[sProcessorId] = {};
		}
		if (!aTargets.length) { // unbound message => add it to undefined entry
			aTargets = [undefined];
		}
		aTargets.forEach(function (sTarget) {
			var aMessages = that.mMessages[sProcessorId][sTarget] ? that.mMessages[sProcessorId][sTarget] : [];
			aMessages.push(oMessage);
			that.mMessages[sProcessorId][sTarget] = aMessages;
		});
	}

	_pushMessages(mProcessors) {
		var oProcessor, sId;
		for (sId in mProcessors) {
			oProcessor = mProcessors[sId];
			var vMessages = this.mMessages[sId] ? this.mMessages[sId] : {};
			this._sortMessages(vMessages);
			//push a copy
			vMessages = Object.keys(vMessages).length === 0 ? null : merge({}, vMessages);
			oProcessor.setMessages(vMessages);
		}
	}

	_sortMessages(vMessages) {
		var sTarget, aMessages;
		if (Array.isArray(vMessages)) {
			vMessages = { "ignored": vMessages };
		}

		for (sTarget in vMessages) {
			aMessages = vMessages[sTarget];
			if (aMessages.length > 1) {
				aMessages.sort(Message.compare);
			}
		}
	}

	_updateMessageModel(mProcessors) {
		var mAllMessages = new Map(),
			sProcessorId,
			oMessageModel = this.getMessageModel(),
			sTarget;

		function setMessage(oMessage) {
			mAllMessages.set(oMessage, true);
		}

		for (sProcessorId in this.mMessages) {
			for (sTarget in this.mMessages[sProcessorId]) {
				this.mMessages[sProcessorId][sTarget].forEach(setMessage);
			}
		}
		this._pushMessages(mProcessors);
		oMessageModel.setData(Array.from(mAllMessages.keys()));
	}

	removeAllMessages() {
		var mProcessors = {};

		for (var sProcessorId in this.mMessages) {
			//use the first Message/Message array to get the processor for the update
			var sFirstKey = Object.keys(this.mMessages[sProcessorId])[0];
			var vMessages = this.mMessages[sProcessorId][sFirstKey];
			Object.assign(mProcessors, this.getAffectedProcessors(vMessages));
		}
		this.aMessages = [];
		this.mMessages = {};
		this._updateMessageModel(mProcessors);
	}

	removeMessages(vMessages) {
		// Do not expose bOnlyValidationMessages to public API
		return this._removeMessages.apply(this, arguments);
	}

	_removeMessages(vMessages, bOnlyValidationMessages) {
		var mProcessors = this.getAffectedProcessors(vMessages);

		if (!vMessages || (Array.isArray(vMessages) && vMessages.length == 0)) {
			return;
		} else if (Array.isArray(vMessages)) {
			// We need to work on a copy since the messages reference is changed by _removeMessage()
			var aOriginalMessages = vMessages.slice(0);
			for (var i = 0; i < aOriginalMessages.length; i++) {
				if (!bOnlyValidationMessages || aOriginalMessages[i].validation) {
					this._removeMessage(aOriginalMessages[i]);
				}
			}
		} else if (vMessages instanceof Message && (!bOnlyValidationMessages || vMessages.validation)){
			this._removeMessage(vMessages);
		} else {
			//map with target as key
			for (var sTarget in vMessages) {
				this._removeMessages(vMessages[sTarget], bOnlyValidationMessages);
			}
		}
		this._updateMessageModel(mProcessors);
	}

	_removeMessage(oMessage) {
		var oProcessor = oMessage.getMessageProcessor(),
			sProcessorId = oProcessor && oProcessor.getId(),
			mMessages = this.mMessages[sProcessorId],
			aTargets;

		if (!mMessages) {
			return;
		}

		aTargets = oMessage.getTargets();
		if (!aTargets.length) { // unbound message => remove it from undefined entry
			aTargets = [undefined];
		}
		aTargets.forEach(function (sTarget) {
			var aMessages = mMessages[sTarget];

			if (aMessages) {
				for (var i = 0; i < aMessages.length; i++) {
					var oMsg = aMessages[i];
					if (deepEqual(oMsg, oMessage)) {
						aMessages.splice(i,1);
						--i; // Decrease counter as one element has been removed
					}
				}
				// delete empty message array
				if (mMessages[sTarget].length === 0) {
					delete mMessages[sTarget];
				}
			}
		});
	}

	updateMessages(aOldMessages, aNewMessages) {
		this.removeMessages(aOldMessages);
		this.addMessages(aNewMessages);
		var aAllMessages = [].concat(aOldMessages || [], aNewMessages || []);
		var mProcessors = this.getAffectedProcessors(aAllMessages);
		for (var sProcessorId in mProcessors) {
			mProcessors[sProcessorId].fireEvent("messageChange", {
				newMessages: aNewMessages,
				oldMessages: aOldMessages
			});
		}
	}

	registerMessageProcessor(oProcessor) {
		var sProcessorId = oProcessor.getId(),
			mProcessors = {};

		if (!this.mProcessors[sProcessorId]) {
			this.mProcessors[sProcessorId] = sProcessorId;
			if (sProcessorId in this.mMessages) {
				mProcessors[sProcessorId] = oProcessor;
				this._pushMessages(mProcessors);
			}
			if (!MessageProcessor._isRegistered) {
				var fnDestroy = MessageProcessor.prototype.destroy;
				MessageProcessor.prototype.destroy = function() {
					fnDestroy.apply(this);
					MessageManager.unregisterMessageProcessor(this);
				};
				MessageProcessor._isRegistered = true;
			}
		}
	}

	unregisterMessageProcessor(oProcessor) {
		this.removeMessagesByProcessor(oProcessor.getId());
		delete this.mProcessors[oProcessor.getId()];
	}

	registerObject(oObject, bHandleValidation) {
		if (!(oObject && oObject.isA && (oObject.isA("sap.ui.base.ManagedObject") || oObject.isA("sap.ui.core.Core")))) {
			Log.error(this + " : " + oObject.toString() + " is not an instance of sap.ui.base.ManagedObject");
		} else {
			oObject.attachValidationSuccess(bHandleValidation, this._handleSuccess, this);
			oObject.attachValidationError(bHandleValidation, this._handleError, this);
			oObject.attachParseError(bHandleValidation, this._handleError, this);
			oObject.attachFormatError(bHandleValidation, this._handleError, this);
		}
	}

	unregisterObject(oObject) {
		if (!(oObject && oObject.isA && oObject.isA("sap.ui.base.ManagedObject"))) {
			Log.error(this + " : " + oObject.toString() + " is not an instance of sap.ui.base.ManagedObject");
		} else {
			oObject.detachValidationSuccess(this._handleSuccess, this);
			oObject.detachValidationError(this._handleError, this);
			oObject.detachParseError(this._handleError, this);
			oObject.detachFormatError(this._handleError, this);
		}
	}

	destroy() {
		Log.warning("Deprecated: Do not call destroy on a MessageManager");
	}

	getMessageModel() {
		if (!this.oMessageModel) {
			this.oMessageModel = new MessageModel(this);
			this.oMessageModel.setData([]);
		}
		return this.oMessageModel;
	}

	getAffectedProcessors(vMessages) {
		var oProcessor,
			sProcessorId,
			mProcessors = {};

		if (vMessages) {
			if (!Array.isArray(vMessages)) {
				vMessages = [vMessages];
			}
			vMessages.forEach(function(oMessage) {
				oProcessor = oMessage.getMessageProcessor();
				if (oProcessor) {
					sProcessorId = oProcessor.getId();
					mProcessors[sProcessorId] = oProcessor;
					this.registerMessageProcessor(oProcessor);
				}
			}.bind(this));
		}
		return mProcessors;
	}

	removeMessagesByProcessor(sProcessorId) {
		delete this.mMessages[sProcessorId];
		this._updateMessageModel({});
	}

}

//TODO: Used to return an instance. Now we just export the class. Do we have to do some type of singleton pattern?
/*
oMessageManager = new MessageManager();
return Object.assign(MessageManager, oMessageManager.getInterface());
*/