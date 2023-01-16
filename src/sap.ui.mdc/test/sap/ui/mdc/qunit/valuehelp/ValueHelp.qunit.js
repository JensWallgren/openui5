// Use this test page to test the API and features of the ValueHelp.
// The interaction with the Field is tested on the field test page.

/* global QUnit, sinon */
/*eslint max-nested-callbacks: [2, 5]*/

sap.ui.define([
	"sap/ui/mdc/ValueHelp",
	"sap/ui/mdc/ValueHelpDelegate",
	"sap/ui/mdc/valuehelp/base/Container",
	"sap/ui/mdc/condition/Condition",
	"sap/ui/mdc/condition/ConditionModel",
	"sap/ui/mdc/condition/FilterOperatorUtil",
	"sap/ui/mdc/condition/Operator",
	"sap/ui/mdc/enum/ConditionValidated",
	"sap/ui/mdc/enum/SelectType",
	"sap/ui/core/Icon",
	"sap/ui/model/Context",
	"sap/ui/model/FormatException",
	"sap/ui/model/ParseException",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/odata/type/String",
	"sap/m/library",
	"sap/m/Popover",
	"sap/ui/core/Core"
], function (
		ValueHelp,
		ValueHelpDelegate,
		Container,
		Condition,
		ConditionModel,
		FilterOperatorUtil,
		Operator,
		ConditionValidated,
		SelectType,
		Icon,
		Context,
		FormatException,
		ParseException,
		JSONModel,
		Filter,
		StringType,
		mLibrary,
		Popover,
		oCore
	) {
	"use strict";

	var oValueHelp;
	var oContainer;
//	var iPopoverDuration = 355;
	var oField;
	var oField2;
	var iDisconnect = 0;
	var iSelect = 0;
	var aSelectConditions;
	var bSelectAdd;
	var bSelectClose;

	var _myDisconnectHandler = function(oEvent) {
		iDisconnect++;
	};

	var _mySelectHandler = function(oEvent) {
		iSelect++;
		aSelectConditions = oEvent.getParameter("conditions");
		bSelectAdd = oEvent.getParameter("add");
		bSelectClose = oEvent.getParameter("close");
	};

	var _fPressHandler = function(oEvent) {}; // just dummy handler to make Icon focusable

	var iNavigate = 0;
	var oNavigateCondition;
	var sNavigateItemId;
	var bNavigateLeaveFocus;
	var _myNavigateHandler = function(oEvent) {
		iNavigate++;
		oNavigateCondition = oEvent.getParameter("condition");
		sNavigateItemId = oEvent.getParameter("itemId");
		bNavigateLeaveFocus = oEvent.getParameter("leaveFocus");
	};

	var iClosed;
	var _myClosedHandler = function(oEvent) {
		iClosed++;
	};

	var oModel;

	/* use dummy control to simulate Field */

//	var oClock;
	var _initFields = function() {
		oField = new Icon("I1", {src:"sap-icon://sap-ui5", decorative: false, press: _fPressHandler});
		oField2 = new Icon("I2", {src:"sap-icon://sap-ui5", decorative: false, press: _fPressHandler});

		oField.placeAt("content");
		oField2.placeAt("content");
		oCore.applyChanges();
		oField.focus();
//		oClock = sinon.useFakeTimers();
	};

	var _teardown = function() {
//		if (oClock) {
//			oClock.restore();
//			oClock = undefined;
//		}
		oValueHelp.destroy();
		oValueHelp = undefined;
		oContainer = undefined;
		oField.destroy();
		oField = undefined;
		oField2.destroy();
		oField2 = undefined;
		iDisconnect = 0;
		iSelect = 0;
		aSelectConditions = undefined;
		bSelectAdd = undefined;
		bSelectClose = undefined;
		iNavigate = 0;
		oNavigateCondition = undefined;
		sNavigateItemId = undefined;
		bNavigateLeaveFocus = undefined;
		iClosed = 0;
		if (oModel) {
			oModel.destroy();
			oModel = undefined;
		}
	};

	QUnit.module("basic features", {
		beforeEach: function() {
			oValueHelp = new ValueHelp("F1-H", {
				disconnect: _myDisconnectHandler
			});
			_initFields();
		},
		afterEach: _teardown
	});

	QUnit.test("default values", function(assert) {

		assert.equal(oValueHelp.getConditions().length, 0, "Conditions");
		assert.equal(oValueHelp.getFilterValue(), "", "FilterValue");
		assert.notOk(oValueHelp.shouldOpenOnClick(), "shouldOpenOnClick");
		assert.notOk(oValueHelp.isFocusInHelp(), "isFocusInHelp");
		assert.notOk(oValueHelp.valueHelpEnabled(), "valueHelpEnabled");

	});

	QUnit.test("isTypeaheadSupported", function(assert) {

		var oPromise = oValueHelp.isTypeaheadSupported();
		assert.ok(oPromise instanceof Promise, "isTypeaheadSupported returns promise");

		if (oPromise) {
			var fnDone = assert.async();
			oPromise.then(function(bSupported) {
				assert.strictEqual(bSupported, false, "TypeAhead not supported per default");
				fnDone();
			}).catch(function(oError) {
				assert.notOk(true, "Promise Catch called");
				fnDone();
			});
		}

	});

	QUnit.test("getTextForKey", function(assert) {

		sinon.spy(oValueHelp, "getItemForValue");

		var vKey = "A";
		var oConfig = {
			parsedValue: vKey,
			value: vKey,
			bindingContext: undefined,
			conditionModel: undefined,
			conditionModelName: undefined,
			checkKey: true,
			exception: FormatException,
			caseSensitive: true,
			context: undefined
		};

		var oPromise = oValueHelp.getTextForKey(vKey);
		assert.ok(oPromise instanceof Promise, "getTextForKey returns promise");
		assert.ok(oValueHelp.getItemForValue.calledWith(oConfig), "getItemForValue called with Config");

		if (oPromise) {
			var fnDone = assert.async();
			oPromise.then(function(sText) {
				assert.notOk(true, "Promise Then must not be called");
				fnDone();
			}).catch(function(oError) {
				assert.ok(true, "Promise Catch called");
				fnDone();
			});
		}

	});

	QUnit.test("getKeyForText", function(assert) {

		sinon.spy(oValueHelp, "getItemForValue");

		var sText = "A";
		var oConfig = {
				value: sText,
				context: undefined,
				checkDescription: true,
				exception: ParseException,
				caseSensitive: true
		};
		var oPromise = oValueHelp.getKeyForText(sText);
		assert.ok(oPromise instanceof Promise, "getKeyForText returns promise");
		assert.ok(oValueHelp.getItemForValue.calledWith(oConfig), "getItemForValue called with Config");

		if (oPromise) {
			var fnDone = assert.async();
			oPromise.then(function(vKey) {
				assert.notOk(true, "Promise Then must not be called");
				fnDone();
			}).catch(function(oError) {
				assert.ok(true, "Promise Catch called");
				fnDone();
			});
		}

	});

	QUnit.test("getIcon", function(assert) {

		assert.notOk(oValueHelp.getIcon(), "without Container no icon returned");

	});

	QUnit.test("isValidationSupported", function(assert) {

		assert.notOk(oValueHelp.isValidationSupported(), "without Typeahed Container not supported");

	});

	QUnit.test("connect", function(assert) {

		oField.setFieldGroupIds(["myFieldGroup"]);
		oField2.setFieldGroupIds(["myFieldGroup2"]);
		oValueHelp.connect(oField, {test: "X"});
		assert.equal(iDisconnect, 0, "Disconnect not fired");
		assert.deepEqual(oValueHelp.getProperty("_config"), {test: "X"}, "Config stored");
		assert.equal(oValueHelp._oControl, oField, "Field internally stored");
		assert.deepEqual(oValueHelp._getFieldGroupIds(), ["myFieldGroup"], "FieldGroupIDs of Field used"); // as _getFieldGroupIds is used in UIArea to determine current FieldGroup

		oValueHelp.setConditions([Condition.createItemCondition("1", "Test")]);
		oValueHelp.setFilterValue("A");
		oValueHelp.connect(oField2, {test: "Y"});
		assert.equal(iDisconnect, 1, "Disconnect fired");
		assert.equal(oValueHelp.getConditions().length, 0, "Conditions");
		assert.equal(oValueHelp.getFilterValue(), "", "FilterValue");
		assert.deepEqual(oValueHelp.getProperty("_config"), {test: "Y"}, "Config stored");
		assert.equal(oValueHelp._oControl, oField2, "Field internally stored");
		assert.deepEqual(oValueHelp._getFieldGroupIds(), ["myFieldGroup2"], "FieldGroupIDs of Field used"); // as _getFieldGroupIds is used in UIArea to determine current FieldGroup

	});

	QUnit.test("getAriaAttributes", function(assert) {

		var oCheckAttributes = {
			contentId: undefined,
			ariaHasPopup: null,
			role: null,
			roleDescription: null,
			valueHelpEnabled: false
		};
		var oAttributes = oValueHelp.getAriaAttributes();
		assert.ok(oAttributes, "Aria attributes returned");
		assert.deepEqual(oAttributes, oCheckAttributes, "returned attributes");

	});

	QUnit.test("getControl", function(assert) {

		oValueHelp.connect(oField);
		var oMyField = oValueHelp.getControl();
		assert.equal(oMyField.getId(), "I1", "field using connect");

	});

	QUnit.module("with Typeahed", {
		beforeEach: function() {
			oContainer = new Container("C1", {
				title: "Test"
			});
			oValueHelp = new ValueHelp("F1-H", {
				typeahead: oContainer,
				delegate: {name: "sap/ui/mdc/ValueHelpDelegate", payload: {x: "X"}},
				disconnect: _myDisconnectHandler,
				navigated: _myNavigateHandler,
				select: _mySelectHandler,
				closed: _myClosedHandler
			});
			_initFields();
		},
		afterEach: _teardown
	});

	QUnit.test("connect", function(assert) {

		oField.setFieldGroupIds(["myFieldGroup"]);
		oField2.setFieldGroupIds(["myFieldGroup2"]);
		sinon.spy(oContainer, "onConnectionChange");
		oValueHelp.connect(oField, {test: "X"});
		oValueHelp.connect(oField2, {test: "Y"});
		assert.ok(oContainer.onConnectionChange.calledOnce, "onConnectionChange called for Container");
		assert.deepEqual(oContainer._getFieldGroupIds(), ["myFieldGroup2"], "FieldGroupIDs of Field used"); // as _getFieldGroupIds is used in UIArea to determine current FieldGroup

	});

	QUnit.test("open", function(assert) {

		sinon.spy(oContainer, "open");
		sinon.spy(ValueHelpDelegate, "retrieveContent");
		sinon.spy(oValueHelp, "fireOpen");
		sinon.spy(oValueHelp, "fireOpened");


		var fnDone = assert.async();
		oValueHelp.open(false); //-> check nothing happens
		assert.notOk(oContainer.open.called, "Container open not called for Dialog opening");

		oValueHelp.open(true);
		assert.ok(oValueHelp.fireOpen.called, "ValueHelp open event fired for typeahead opening");
		assert.equal(oValueHelp.fireOpen.lastCall.args[0].container, oContainer, "ValueHelp open event carries correct container");

		setTimeout(function() { // Delegate is called async
			assert.ok(oContainer.open.called, "Container open called for typeahead opening");
			assert.ok(ValueHelpDelegate.retrieveContent.called, "ValueHelpDelegate.retrieveContent called for typeahead opening");
			oContainer._handleOpened();
			assert.ok(oValueHelp.fireOpened.called, "ValueHelp opened event fired for typeahead opening");
			assert.equal(oValueHelp.fireOpened.lastCall.args[0].container, oContainer, "ValueHelp opened event carries correct container");

			ValueHelpDelegate.retrieveContent.restore();
			oValueHelp.fireOpen.restore();
			oValueHelp.fireOpened.restore();
			fnDone();
		}, 0);

	});

	QUnit.test("do not close open/opening containers if they are the same instance", function(assert) {
		sinon.spy(oContainer, "open");
		sinon.spy(oContainer, "close");
		sinon.stub(oContainer, "getUseAsValueHelp").returns(true);
		oValueHelp.open(false);
		assert.ok(oContainer.open.called, "Container open called for dialog opening");
		sinon.stub(oContainer, "isOpen").returns(true);
		oValueHelp.open(false);
		assert.notOk(oContainer.close.called, "Container close was not called for already open container");
	});

	QUnit.test("close", function(assert) {

		sinon.spy(oContainer, "close");

		oValueHelp.close();
		assert.notOk(oContainer.close.called, "Container close not called if not open");

		sinon.stub(oContainer, "isOpen").returns(true);
		oValueHelp.close();
		assert.ok(oContainer.close.called, "Container close called if open");

	});

	QUnit.test("close handling", function(assert) {

		sinon.spy(oValueHelp, "close");
		oContainer._handleClosed(); // TODO: change to event?
		assert.equal(iClosed, 1, "Close event fired");

	});

	QUnit.test("toggleOpen", function(assert) {

		sinon.spy(oValueHelp, "open");
		sinon.spy(oValueHelp, "close");

		oValueHelp.toggleOpen(false);
		assert.notOk(oValueHelp.open.called, "ValueHelp open not called for Dialog opening");

		oValueHelp.toggleOpen(true);
		assert.ok(oValueHelp.open.calledWith(true), "ValueHelp open called for typeahead opening");

		sinon.stub(oContainer, "isOpen").returns(true);
		oValueHelp.toggleOpen(true);
		assert.ok(oValueHelp.close.called, "ValueHelp close called if open for typeahead");

		oValueHelp.close.reset();
		oValueHelp.toggleOpen(false);
		assert.notOk(oValueHelp.close.called, "ValueHelp close not called if open for dialog but no dialog exist");

		sinon.stub(oContainer, "getUseAsValueHelp").returns(true);
		oValueHelp.close.reset();
		oValueHelp.toggleOpen(false);
		assert.ok(oValueHelp.close.called, "ValueHelp close called if open for dialog and Typeahed used as valueHelp");

	});

	QUnit.test("isOpen", function(assert) {

		assert.notOk(oValueHelp.isOpen(), "ValueHelp not open per default");

		sinon.stub(oContainer, "isOpen").returns(true);
		assert.ok(oValueHelp.isOpen(), "ValueHelp open if Container open");

	});

	QUnit.test("skipOpening", function(assert) {

		sinon.spy(oContainer, "close");
		oValueHelp.skipOpening();
		assert.notOk(oContainer.close.called, "Container close not called");

		sinon.stub(oContainer, "isOpening").returns(true);
		oValueHelp.skipOpening();
		assert.ok(oContainer.close.called, "Container close called");

	});

	QUnit.test("isTypeaheadSupported - not supported(default)", function(assert) {

		sinon.spy(ValueHelpDelegate, "retrieveContent");
		var oPromise = oValueHelp.isTypeaheadSupported();
		assert.ok(oPromise instanceof Promise, "isTypeaheadSupported returns promise");

		if (oPromise) {
			var fnDone = assert.async();
			oPromise.then(function(bSupported) {
				assert.strictEqual(bSupported, false, "TypeAhead not supported");
				assert.ok(ValueHelpDelegate.retrieveContent.called, "ValueHelpDelegate.retrieveContent called to check if search supported");
				ValueHelpDelegate.retrieveContent.restore();
				fnDone();
			}).catch(function(oError) {
				assert.notOk(true, "Promise Catch called");
				ValueHelpDelegate.retrieveContent.restore();
				fnDone();
			});
		}

	});

	QUnit.test("isTypeaheadSupported - supported", function(assert) {

		sinon.spy(ValueHelpDelegate, "retrieveContent");
		sinon.stub(oContainer, "isTypeaheadSupported").returns(true);
		var oPromise = oValueHelp.isTypeaheadSupported();
		assert.ok(oPromise instanceof Promise, "isTypeaheadSupported returns promise");

		if (oPromise) {
			var fnDone = assert.async();
			oPromise.then(function(bSupported) {
				assert.strictEqual(bSupported, true, "TypeAhead supported");
				assert.ok(ValueHelpDelegate.retrieveContent.called, "ValueHelpDelegate.retrieveContent called to check if search supported");
				ValueHelpDelegate.retrieveContent.restore();
				fnDone();
			}).catch(function(oError) {
				assert.notOk(true, "Promise Catch called");
				ValueHelpDelegate.retrieveContent.restore();
				fnDone();
			});
		}

	});

	QUnit.test("getItemForValue with result", function(assert) {

		sinon.stub(oContainer, "getItemForValue").returns(Promise.resolve({key: "X", description: "Text"}));
		var oConfig = {
				parsedValue: "A",
				value: "a",
				bindingContext: "BC",
				conditionModel: "CM",
				conditionModelName: "Name",
				checkKey: true,
				checkDescription: true,
				exception: ParseException
		};
		var oCheckConfig = {
				parsedValue: "A",
				value: "a",
				bindingContext: "BC",
				conditionModel: "CM",
				conditionModelName: "Name",
				checkKey: true,
				checkDescription: true,
				exception: ParseException,
				caseSensitive: false
		};
		var oPromise = oValueHelp.getItemForValue(oConfig);
		assert.ok(oPromise instanceof Promise, "getItemForValue returns promise");

		if (oPromise) {
			var fnDone = assert.async();
			oPromise.then(function(oItem) {
				assert.ok(true, "Promise Then must be called");
				assert.ok(oContainer.getItemForValue.calledWith(oCheckConfig), "getItemForValue called on Container with Config");
				assert.deepEqual(oItem, {key: "X", description: "Text"}, "Item returned");
				fnDone();
			}).catch(function(oError) {
				assert.notOk(true, "Promise Catch called");
				fnDone();
			});
		}

	});

	QUnit.test("getItemForValue with error", function(assert) {

		sinon.stub(oContainer, "getItemForValue").returns(Promise.reject(new ParseException("Error")));
		var oConfig = {
				parsedValue: "A",
				value: "a",
				inParameters: null,
				outParameters: null,
				bindingContext: "BC",
				conditionModel: "CM",
				conditionModelName: "Name",
				checkKey: true,
				checkDescription: true,
				exception: ParseException
		};
		var oPromise = oValueHelp.getItemForValue(oConfig);
		assert.ok(oPromise instanceof Promise, "getItemForValue returns promise");

		if (oPromise) {
			var fnDone = assert.async();
			oPromise.then(function(oItem) {
				assert.notOk(true, "Promise Then must not be called");
				fnDone();
			}).catch(function(oError) {
				assert.ok(true, "Promise Catch called");
				assert.ok(oError instanceof ParseException, "Exception returned");
				assert.equal(oError.message, "Error", "Error text");
				fnDone();
			});
		}

	});

	QUnit.test("getIcon", function(assert) {

		sinon.stub(oContainer, "getValueHelpIcon").returns("X");
		var sIcon = oValueHelp.getIcon();
		assert.ok(oContainer.getValueHelpIcon(), "Container getValueHelpIcon called");
		assert.equal(sIcon, "X", "Icon of Container returned");

	});

	QUnit.test("isValidationSupported", function(assert) {

		sinon.stub(oContainer, "isValidationSupported").returns(true);
		assert.ok(oValueHelp.isValidationSupported(), "Typeahed result returned");
		assert.ok(oContainer.isValidationSupported.called, "Container.isValidationSupported called");

	});

	QUnit.test("getDomRef", function(assert) {

		sinon.stub(oContainer, "getDomRef").returns(oField.getDomRef()); // just fake
		var oDomRef = oValueHelp.getDomRef();
		assert.notOk(oContainer.getDomRef.called, "Container getDomRef not called if closed");
		assert.notOk(oDomRef, "no DomRef returned if closed");

		sinon.stub(oContainer, "isOpening").returns(true);
		oDomRef = oValueHelp.getDomRef();
		assert.ok(oContainer.getDomRef.called, "Container getDomRef called");
		assert.equal(oDomRef, oField.getDomRef(), "DomRef returned if opening");
		oContainer.isOpening.reset();

		sinon.stub(oContainer, "isOpen").returns(true);
		oDomRef = oValueHelp.getDomRef();
		assert.ok(oContainer.getDomRef.called, "Container getDomRef called");
		assert.equal(oDomRef, oField.getDomRef(), "DomRef returned if open");
		oContainer.isOpen.reset();

		oContainer.getDomRef.reset();

	});

	QUnit.test("getAriaAttributes", function(assert) {

		var oCheckAttributes = {
			contentId: undefined,
			ariaHasPopup: "listbox",
			role: "combobox",
			roleDescription: null,
			valueHelpEnabled: false
		};
		var oAttributes = oValueHelp.getAriaAttributes();
		assert.ok(oAttributes, "Aria attributes returned");
		assert.deepEqual(oAttributes, oCheckAttributes, "returned attributes on closed typeaheas");

		oCheckAttributes.contentId = null; // will only be set by content
		sinon.stub(oContainer, "isOpen").returns(true);
		oAttributes = oValueHelp.getAriaAttributes();
		assert.deepEqual(oAttributes, oCheckAttributes, "returned attributes on open typeaheas");

	});

	QUnit.test("shouldOpenOnClick", function(assert) {

		sinon.stub(oContainer, "shouldOpenOnClick").returns(true);
		assert.notOk(oValueHelp.shouldOpenOnClick(), "if only typeahed no opening on click");

		sinon.stub(oContainer, "getUseAsValueHelp").returns(true);
		assert.ok(oValueHelp.shouldOpenOnClick(), "returns value of container if used as valueHelp");

	});

	QUnit.test("isFocusInHelp", function(assert) {

		sinon.stub(oContainer, "isFocusInHelp").returns(true);
		assert.notOk(oValueHelp.isFocusInHelp(), "focus stays in field in TypeAhead");

		sinon.stub(oContainer, "getUseAsValueHelp").returns(true);
		assert.ok(oValueHelp.isFocusInHelp(), "returns value of container if used as valueHelp");

	});

	QUnit.test("valueHelpEnabled", function(assert) {

		assert.notOk(oValueHelp.valueHelpEnabled(), "no value help if only typeahead");

		sinon.stub(oContainer, "getUseAsValueHelp").returns(true);
		assert.ok(oValueHelp.valueHelpEnabled(), "valueHelp enabled if Typeahead is enabled for valueHelp");

	});

	QUnit.test("removeFocus", function(assert) {

		sinon.spy(oContainer, "removeFocus");
		oValueHelp.removeFocus();
		assert.ok(oContainer.removeFocus.called, "Container.removeFocus called");

	});

	QUnit.test("navigate", function(assert) {

		sinon.spy(oContainer, "navigate");
		sinon.spy(oContainer, "open");
		sinon.spy(ValueHelpDelegate, "retrieveContent");
		oValueHelp.navigate(1);

		var fnDone = assert.async();
		setTimeout(function() { // as Promise used inside
			assert.ok(oContainer.navigate.calledWith(1), "Container.navigate called");
			assert.ok(ValueHelpDelegate.retrieveContent.called, "ValueHelpDelegate.retrieveContent called for navigation");
			assert.notOk(oContainer.open.called, "Container not opened");

			ValueHelpDelegate.retrieveContent.restore();
			fnDone();
		}, 0);

	});

	QUnit.test("navigate with opening", function(assert) {

		sinon.spy(oContainer, "navigate");
		sinon.stub(oContainer, "open").returns(Promise.resolve());
		sinon.stub(oContainer, "shouldOpenOnNavigate").returns(true);
		sinon.spy(ValueHelpDelegate, "retrieveContent");

		oValueHelp.navigate(1);

		var fnDone = assert.async();
		setTimeout(function() { // as Promise used inside
			assert.ok(oContainer.navigate.calledWith(1), "Container.navigate called");
			assert.ok(ValueHelpDelegate.retrieveContent.called, "ValueHelpDelegate.retrieveContent called for navigation");
			assert.ok(oContainer.open.called, "Container opened");

			ValueHelpDelegate.retrieveContent.restore();
			fnDone();
		}, 0);

	});

	QUnit.test("navigated event", function(assert) {

		var oCondition = Condition.createItemCondition("Test");
		oContainer.fireNavigated({condition: oCondition, itemId: "I1", leaveFocus: true});

		assert.equal(iNavigate, 1, "Navigated Event fired");
		assert.deepEqual(oNavigateCondition, oCondition, "Navigated condition");
		assert.equal(sNavigateItemId, "I1", "Navigated itemId");
		assert.ok(bNavigateLeaveFocus, "Navigated leaveFocus");

	});

	QUnit.test("isNavigationEnabled", function(assert) {

		sinon.stub(oContainer, "isNavigationEnabled").returns("X"); // "X" - just for testing return value
		assert.equal(oValueHelp.isNavigationEnabled(1), "X", "Navigation if closed and no dialog: Result of Container returned");
		assert.ok(oContainer.isNavigationEnabled.calledWith(1), "isNavigationEnabled of Container called with step");
		sinon.stub(oContainer, "isOpen").returns(true);
		assert.equal(oValueHelp.isNavigationEnabled(2), "X", "Navigation if open and no dialog: Result of Container returned");
		assert.ok(oContainer.isNavigationEnabled.calledWith(2), "isNavigationEnabled of Container called with step");
		sinon.stub(oValueHelp, "getDialog").returns(true);
		oContainer.isOpen.returns(false);
		assert.notOk(oValueHelp.isNavigationEnabled(3), "Navigation if closed and Dialog: disabled");
		assert.notOk(oContainer.isNavigationEnabled.calledWith(3), "isNavigationEnabled of Container not called with step");
		oContainer.isOpen.returns(true);
		assert.ok(oValueHelp.isNavigationEnabled(4), "Navigation if open and dialog: Result of Container returned");
		assert.ok(oContainer.isNavigationEnabled.calledWith(4), "isNavigationEnabled of Container called with step");
		oValueHelp.getDialog.restore();

	});

	QUnit.test("Selection handling", function(assert) {

		// set
		var aSelectConditions = [
								 Condition.createCondition("EQ", ["X"]),
								 Condition.createCondition("BT", ["A", "C"])
								 ];
		oContainer.fireSelect({type: SelectType.Set, conditions: aSelectConditions});
		var aConditions = oValueHelp.getConditions();
		assert.deepEqual(aConditions, aSelectConditions, "Set: Selected condtions set on ValueHelp");

		// add
		aSelectConditions = [
							 Condition.createCondition("EQ", ["X"]),
							 Condition.createCondition("EQ", ["Y"])
							 ];
		oContainer.fireSelect({type: SelectType.Add, conditions: aSelectConditions});
		var aCheckConditions = [
								Condition.createCondition("EQ", ["X"]),
								Condition.createCondition("BT", ["A", "C"]),
								Condition.createCondition("EQ", ["X"]),
								Condition.createCondition("EQ", ["Y"])
								];
		aConditions = oValueHelp.getConditions();
		assert.deepEqual(aConditions, aCheckConditions, "Add: Conditions added");

		// remove
		aSelectConditions = [
							 Condition.createCondition("EQ", ["X"])
							 ];
		oContainer.fireSelect({type: SelectType.Remove, conditions: aSelectConditions});
		aCheckConditions = [
								Condition.createCondition("BT", ["A", "C"]),
								Condition.createCondition("EQ", ["X"]),
								Condition.createCondition("EQ", ["Y"])
								];
		aConditions = oValueHelp.getConditions();
		assert.deepEqual(aConditions, aCheckConditions, "Remove: Condition removed");

		// singleSelection
		oValueHelp.setConditions([]);
		oValueHelp.setProperty("_config", {maxConditions: 1});

		aSelectConditions = [
							 Condition.createCondition("EQ", ["X"]),
							 Condition.createCondition("EQ", ["Y"])
							 ];
		oContainer.fireSelect({type: SelectType.Add, conditions: aSelectConditions});
		aCheckConditions = [
								Condition.createCondition("EQ", ["X"])
								];
		aConditions = oValueHelp.getConditions();
		assert.deepEqual(aConditions, aCheckConditions, "SingleSelect - Add: Only first condition taken");

		oContainer.fireSelect({type: SelectType.Remove, conditions: []});
		aConditions = oValueHelp.getConditions();
		assert.deepEqual(aConditions, [], "SingleSelect - Remove: Condition removed");

	});

	QUnit.test("Confirmation handling", function(assert) {

		sinon.spy(oValueHelp, "close");
		var aConditions = [
						   Condition.createCondition("EQ", ["X", "X"], undefined, undefined, ConditionValidated.Validated),
						   Condition.createCondition("BT", ["A", "C"], undefined, undefined, ConditionValidated.NotValidated),
						   {operator: "EQ", values: [], isEmpty: true, validated: ConditionValidated.NotValidated},
						   {operator: "EQ", values: [1, undefined], isInitial: true, validated: ConditionValidated.NotValidated, isEmpty: null}
						   ];
		var aCheckConditions = [
						   Condition.createCondition("EQ", ["X", "X"], undefined, undefined, ConditionValidated.Validated),
						   Condition.createCondition("BT", ["A", "C"], undefined, undefined, ConditionValidated.NotValidated),
						   Condition.createCondition("EQ", [1], undefined, undefined, ConditionValidated.NotValidated)
						   ];

		var fnDone = assert.async();
		oValueHelp.initControlDelegate().then(function () {
			oValueHelp.setConditions(aConditions);
			oContainer.fireConfirm({});
			assert.equal(iSelect, 1, "Select event fired");
			assert.deepEqual(aSelectConditions, aCheckConditions, "conditions");
			assert.ok(bSelectAdd, "'add' property");
			assert.notOk(bSelectClose, "'close' property");
			assert.notOk(oValueHelp.close.called, "ValueHelp close not called");

			sinon.stub(oContainer, "isMultiSelect").returns(true);
			oContainer.fireConfirm({close: true});
			assert.equal(iSelect, 2, "Select event fired");
			assert.deepEqual(aSelectConditions, aCheckConditions, "conditions");
			assert.notOk(bSelectAdd, "'add' property");
			assert.ok(bSelectClose, "'close' property");
			assert.ok(oValueHelp.close.called, "ValueHelp close called");
			oValueHelp.close.reset();

			// single-select
			oContainer.isMultiSelect.restore();
			oValueHelp.setProperty("_config", {maxConditions: 1});
			oContainer.fireConfirm({});
			assert.equal(iSelect, 3, "Select event fired");
			assert.deepEqual(aSelectConditions, aCheckConditions, "conditions");
			assert.notOk(bSelectAdd, "'add' property");
			assert.ok(bSelectClose, "'close' property");
			assert.ok(oValueHelp.close.called, "ValueHelp close called");

			// no event is state is invalid
			oValueHelp.setProperty("_valid", false);
			oContainer.fireConfirm({});
			assert.equal(iSelect, 3, "Select event not fired");
			fnDone();
		});
	});

	QUnit.test("Cancelling handling", function(assert) {

		sinon.spy(oValueHelp, "close");
		oContainer.fireCancel({});
		assert.ok(oValueHelp.close.called, "ValueHelp close called");

	});

	QUnit.test("RequestDelegateContent event", function(assert) {

		sinon.spy(ValueHelpDelegate, "retrieveContent");
		oContainer.fireRequestDelegateContent({container: oContainer});

		var fnDone = assert.async();
		setTimeout(function() { // Delegate is called async
			assert.ok(ValueHelpDelegate.retrieveContent.calledWith({x: "X"}, oContainer), "ValueHelpDelegate.retrieveContent called for typeahead");

			ValueHelpDelegate.retrieveContent.restore();
			fnDone();
		}, 0);

	});

	QUnit.test("SwitchToValueHelp event", function(assert) {

		var bFired = false;
		oValueHelp.attachSwitchToValueHelp(function(oEvent) {
			bFired = true;
		});

		oContainer.fireRequestSwitchToDialog({container: oContainer});
		assert.ok(bFired, "Event fired");

	});

	QUnit.module("with Dialog", {
		beforeEach: function() {
			oContainer = new Container("C1", {
				title: "Test"
			});
			oValueHelp = new ValueHelp("F1-H", {
				dialog: oContainer,
				disconnect: _myDisconnectHandler,
				navigated: _myNavigateHandler,
				select: _mySelectHandler,
				closed: _myClosedHandler
			});
			_initFields();
		},
		afterEach: _teardown
	});

	QUnit.test("connect", function(assert) {

		oField.setFieldGroupIds(["myFieldGroup"]);
		oField2.setFieldGroupIds(["myFieldGroup2"]);
		sinon.spy(oContainer, "onConnectionChange");
		oValueHelp.connect(oField, {test: "X"});
		oValueHelp.connect(oField2, {test: "Y"});
		assert.ok(oContainer.onConnectionChange.calledOnce, "onConnectionChange called for Container");
		assert.deepEqual(oContainer._getFieldGroupIds(), ["myFieldGroup2"], "FieldGroupIDs of Field used"); // as _getFieldGroupIds is used in UIArea to determine current FieldGroup

	});

	QUnit.test("open", function(assert) {

		sinon.spy(oContainer, "open");
		sinon.spy(ValueHelpDelegate, "retrieveContent");
		sinon.spy(oValueHelp, "fireOpen");
		sinon.spy(oValueHelp, "fireOpened");

		var fnDone = assert.async();
		oValueHelp.open(true); //-> check nothing happens
		assert.notOk(oContainer.open.called, "Container open not called for typeahead opening");

		oValueHelp.open(false);
		assert.ok(oValueHelp.fireOpen.called, "ValueHelp open event fired for typeahead opening");
		assert.equal(oValueHelp.fireOpen.lastCall.args[0].container, oContainer, "ValueHelp open event carries correct container");

		setTimeout(function() { // Delegate is called async
			assert.ok(oContainer.open.called, "Container open called for dialog opening");
			assert.ok(ValueHelpDelegate.retrieveContent.called, "ValueHelpDelegate.retrieveContent called for opening");
			oContainer._handleOpened();
			assert.ok(oValueHelp.fireOpened.called, "ValueHelp opened event fired for typeahead opening");
			assert.equal(oValueHelp.fireOpened.lastCall.args[0].container, oContainer, "ValueHelp opened event carries correct container");

			ValueHelpDelegate.retrieveContent.restore();
			oValueHelp.fireOpen.restore();
			oValueHelp.fireOpened.restore();
			fnDone();
		}, 0);

	});

	QUnit.test("close open/opening containers when opening in another mode", function(assert) {
		sinon.spy(oContainer, "open");
		sinon.spy(oContainer, "close");

		//var fnDone = assert.async();
		oValueHelp.open(false);
		assert.ok(oContainer.open.called, "Container open called for dialog opening");
		oValueHelp.open(true);
		assert.ok(oContainer.close.called, "Container close called for already open container");
	});

	QUnit.test("close", function(assert) {

		sinon.spy(oContainer, "close");

		oValueHelp.close();
		assert.notOk(oContainer.close.called, "Container close not called if not open");

		sinon.stub(oContainer, "isOpen").returns(true);
		oValueHelp.close();
		assert.ok(oContainer.close.called, "Container close called if open");

	});

	QUnit.test("close handling", function(assert) {

		sinon.spy(oValueHelp, "close");
		oContainer._handleClosed(); // TODO: change to event?
		assert.equal(iClosed, 1, "Close event fired");

	});

	QUnit.test("toggleOpen", function(assert) {

		sinon.spy(oValueHelp, "open");
		sinon.spy(oValueHelp, "close");

		oValueHelp.toggleOpen(true);
		assert.notOk(oValueHelp.open.called, "ValueHelp open not called for Typeahed opening");

		oValueHelp.toggleOpen(false);
		assert.ok(oValueHelp.open.calledWith(false), "ValueHelp open called for Dialog opening");

		sinon.stub(oContainer, "isOpen").returns(true);
		oValueHelp.toggleOpen(false);
		assert.ok(oValueHelp.close.called, "ValueHelp close called if open for dialog");

		oValueHelp.close.reset();
		oValueHelp.toggleOpen(true);
		assert.notOk(oValueHelp.close.called, "ValueHelp close not called if open for typeahead but no Typeahead exist");

	});

	QUnit.test("isOpen", function(assert) {

		assert.notOk(oValueHelp.isOpen(), "ValueHelp not open per default");

		sinon.stub(oContainer, "isOpen").returns(true);
		assert.ok(oValueHelp.isOpen(), "ValueHelp open if Container open");

	});

	QUnit.test("skipOpening", function(assert) {

		sinon.spy(oContainer, "close");
		oValueHelp.skipOpening();
		assert.notOk(oContainer.close.called, "Container close not called");

		sinon.stub(oContainer, "isOpening").returns(true);
		oValueHelp.skipOpening();
		assert.ok(oContainer.close.called, "Container close called");

	});

	QUnit.test("isTypeaheadSupported", function(assert) {

		sinon.spy(ValueHelpDelegate, "retrieveContent");
		var oPromise = oValueHelp.isTypeaheadSupported();
		assert.ok(oPromise instanceof Promise, "isTypeaheadSupported returns promise");

		if (oPromise) {
			var fnDone = assert.async();
			oPromise.then(function(bSupported) {
				assert.strictEqual(bSupported, false, "TypeAhead not supported");
				assert.notOk(ValueHelpDelegate.retrieveContent.called, "ValueHelpDelegate.retrieveContent not called for dialog");
				ValueHelpDelegate.retrieveContent.restore();
				fnDone();
			}).catch(function(oError) {
				assert.notOk(true, "Promise Catch called");
				ValueHelpDelegate.retrieveContent.restore();
				fnDone();
			});
		}

	});

	QUnit.test("getItemForValue", function(assert) {

		sinon.spy(oContainer, "getItemForValue");
		var oConfig = {
				parsedValue: "A",
				value: "a",
				bindingContext: "BC",
				conditionModel: "CM",
				conditionModelName: "Name",
				checkKey: true,
				exception: ParseException,
				caseSensitive: true
		};
		var oPromise = oValueHelp.getItemForValue(oConfig);
		assert.ok(oPromise instanceof Promise, "getItemForValue returns promise");

		if (oPromise) {
			var fnDone = assert.async();
			oPromise.then(function(sText) {
				assert.notOk(true, "Promise Then must not be called");
				fnDone();
			}).catch(function(oError) {
				assert.ok(true, "Promise Catch called");
				assert.notOk(oContainer.getItemForValue.called, "getItemForValue not called on Container");
				fnDone();
			});
		}

	});

	QUnit.test("getIcon", function(assert) {

		sinon.stub(oContainer, "getValueHelpIcon").returns("X");
		var sIcon = oValueHelp.getIcon();
		assert.ok(oContainer.getValueHelpIcon(), "Container getValueHelpIcon called");
		assert.equal(sIcon, "X", "Icon of Container returned");

	});

	QUnit.test("isValidationSupported", function(assert) {

		sinon.stub(oContainer, "isValidationSupported").returns(true);
		assert.notOk(oValueHelp.isValidationSupported(), "Not supported");
		assert.notOk(oContainer.isValidationSupported.called, "Container.isValidationSupported not called");

	});

	QUnit.test("getDomRef", function(assert) {

		sinon.stub(oContainer, "getDomRef").returns(oField.getDomRef()); // just fake
		var oDomRef = oValueHelp.getDomRef();
		assert.notOk(oContainer.getDomRef.called, "Container getDomRef not called if closed");
		assert.notOk(oDomRef, "no DomRef returned if closed");

		sinon.stub(oContainer, "isOpening").returns(true);
		oDomRef = oValueHelp.getDomRef();
		assert.ok(oContainer.getDomRef.called, "Container getDomRef called");
		assert.equal(oDomRef, oField.getDomRef(), "DomRef returned if opening");
		oContainer.isOpening.reset();

		sinon.stub(oContainer, "isOpen").returns(true);
		oDomRef = oValueHelp.getDomRef();
		assert.ok(oContainer.getDomRef.called, "Container getDomRef called");
		assert.equal(oDomRef, oField.getDomRef(), "DomRef returned if open");
		oContainer.isOpen.reset();

		oContainer.getDomRef.reset();

	});

	QUnit.test("getAriaAttributes", function(assert) {

		var oCheckAttributes = {
			contentId: undefined,
			ariaHasPopup: "dialog",
			role: "combobox",
			roleDescription: null,
			valueHelpEnabled: true
		};

		sinon.stub(oContainer, "getAriaAttributes").returns({
			contentId: "X",
			ariaHasPopup: "dialog",
			role: "combobox",
			roleDescription: null
		});

		var oAttributes = oValueHelp.getAriaAttributes();
		assert.ok(oAttributes, "Aria attributes returned");
		assert.deepEqual(oAttributes, oCheckAttributes, "returned attributes on closed typeaheas");

		oCheckAttributes.contentId = "X";
		sinon.stub(oContainer, "isOpen").returns(true);
		oAttributes = oValueHelp.getAriaAttributes();
		assert.deepEqual(oAttributes, oCheckAttributes, "returned attributes on open typeaheas");

	});

	QUnit.test("shouldOpenOnClick", function(assert) {

		sinon.stub(oContainer, "shouldOpenOnClick").returns(true);
		assert.ok(oValueHelp.shouldOpenOnClick(), "returns value of container");

	});

	QUnit.test("isFocusInHelp", function(assert) {

		sinon.stub(oContainer, "isFocusInHelp").returns(true);
		assert.ok(oValueHelp.isFocusInHelp(), "returns value of container");

	});

	QUnit.test("valueHelpEnabled", function(assert) {

		assert.ok(oValueHelp.valueHelpEnabled(), "valueHelp enabled");

	});

	QUnit.test("removeFocus", function(assert) {

		sinon.spy(oContainer, "removeFocus");
		oValueHelp.removeFocus();
		assert.notOk(oContainer.removeFocus.called, "Container.removeFocus not called as only supported for Typeahead");

	});

	QUnit.test("navigate", function(assert) {

		// nothing must happen as onyl supported for Typeahead
		sinon.spy(oContainer, "navigate");
		sinon.spy(ValueHelpDelegate, "retrieveContent");
		var oPromise = oValueHelp.navigate(1);
		assert.notOk(oPromise, "navigate returns nothing");

		var fnDone = assert.async();
		setTimeout(function() { // to check if something is async called
			assert.notOk(oContainer.navigate.called, "Container.navigate not called");
			assert.notOk(ValueHelpDelegate.retrieveContent.called, "ValueHelpDelegate.retrieveContent not called");
			ValueHelpDelegate.retrieveContent.restore();
			fnDone();
		}, 0);

	});

	QUnit.test("isNavigationEnabled", function(assert) {

		assert.notOk(oValueHelp.isNavigationEnabled(1), "Navigation if closed: disabled if no typeahead");

	});

	QUnit.test("Selection handling", function(assert) {

		// Just test event is processed, Details are tested in TypeAhead (there is no check for kind of content)
		var aSelectConditions = [
								 Condition.createCondition("EQ", ["X"]),
								 Condition.createCondition("BT", ["A", "C"])
								 ];
		oContainer.fireSelect({type: SelectType.Set, conditions: aSelectConditions});
		var aConditions = oValueHelp.getConditions();
		assert.deepEqual(aConditions, aSelectConditions, "Set: Selected condtions set on ValueHelp");

	});

	QUnit.test("Confirmation handling", function(assert) {

		// Just test event is processed, Details are tested in TypeAhead (there is no check for kind of content)
		var fnDone = assert.async();
		oValueHelp.initControlDelegate().then(function () {
			sinon.spy(oValueHelp, "close");
			oContainer.fireConfirm({});
			assert.equal(iSelect, 1, "Select event fired");
			assert.deepEqual(aSelectConditions, [], "conditions");
			assert.ok(bSelectAdd, "'add' property");
			assert.notOk(bSelectClose, "'close' property");
			assert.notOk(oValueHelp.close.called, "ValueHelp close not called");
			fnDone();
		});
	});

	QUnit.test("Cancelling handling", function(assert) {

		sinon.spy(oValueHelp, "close");
		oContainer.fireCancel({});
		assert.ok(oValueHelp.close.called, "ValueHelp close called");

	});

});
