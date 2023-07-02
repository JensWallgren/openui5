class GlobalConfigurationProvider {
    rAlias = /^(sapUiXx|sapUi|sap)((?:[A-Z0-9][a-z]*)+)$/; //for getter
    mFrozenProperties = Object.create(null);
    bFrozen = false;

    freeze() {
        if (!bFrozen) {
            createConfig();
            bFrozen = true;
        }
    }

    get(sKey, bFreeze) {
        var vValue = oConfig[sKey];
        if (vValue === undefined) {
            var vMatch = sKey.match(rAlias);
            var sLowerCaseAlias = vMatch ? vMatch[1] + vMatch[2][0] + vMatch[2].slice(1).toLowerCase() : undefined;
            if (sLowerCaseAlias) {
                vValue = oConfig[sLowerCaseAlias];
            }
        }
        if (bFreeze) {
            mFrozenProperties[sKey] = vValue;
        }
        return vValue;
    }
}