module.exports = (_, clean) => {
    const mapProperties = (jsonSchema, iteratee) => {
        return Object.entries(jsonSchema.properties).map(iteratee);
    };

    const isUniqueKey = column => {
        if (column.compositeUniqueKey) {
            return false;
        } else if (!column.unique) {
            return false;
        } else {
            return true;
        }
    };

    const isInlineUnique = column => {
        return isUniqueKey(column);
    };

    const isPrimaryKey = column => {
        if (column.compositeUniqueKey) {
            return false;
        } else if (column.compositePrimaryKey) {
            return false;
        } else if (!column.primaryKey) {
            return false;
        } else {
            return true;
        }
    };

    const isInlinePrimaryKey = column => {
        return isPrimaryKey(column);
    };

    const hydrateUniqueOptions = (options, columnName, isActivated, jsonSchema) =>
        clean({
            keyType: 'UNIQUE',
            columns: [
                {
                    name: columnName,
                    isActivated: isActivated,
                },
            ],
            ...options,
        });

    const hydratePrimaryKeyOptions = (options, columnName, isActivated, jsonSchema) =>
        clean({
            keyType: 'PRIMARY KEY',
            columns: [
                {
                    name: columnName,
                    isActivated: isActivated,
                },
            ],
            ...options
        });

    const findName = (keyId, properties) => {
        return Object.keys(properties).find(name => properties[name].GUID === keyId);
    };

    const checkIfActivated = (keyId, properties) => {
        return _.get(
            Object.values(properties).find(prop => prop.GUID === keyId),
            'isActivated',
            true
        );
    };

    const getKeys = (keys, jsonSchema) => {
        return _.map(keys, key => {
            return {
                name: findName(key.keyId, jsonSchema.properties),
                isActivated: checkIfActivated(key.keyId, jsonSchema.properties),
            };
        });
    };

    const getCompositePrimaryKeys = jsonSchema => {
        if (!Array.isArray(jsonSchema.primaryKey)) {
            return [];
        }

        return jsonSchema.primaryKey
            .filter(primaryKey => !_.isEmpty(primaryKey.compositePrimaryKey))
            .map(primaryKey => ({
                ...hydratePrimaryKeyOptions(primaryKey, null, null, jsonSchema),
                columns: getKeys(primaryKey.compositePrimaryKey, jsonSchema),
            }));
    };

    const getCompositeUniqueKeys = jsonSchema => {
        if (!Array.isArray(jsonSchema.uniqueKey)) {
            return [];
        }

        return jsonSchema.uniqueKey
            .filter(uniqueKey => !_.isEmpty(uniqueKey.compositeUniqueKey))
            .map(uniqueKey => ({
                ...hydrateUniqueOptions(uniqueKey, null, null, jsonSchema),
                columns: getKeys(uniqueKey.compositeUniqueKey, jsonSchema),
            }));
    };

    const getTableKeyConstraints = jsonSchema => {
        if (!jsonSchema.properties) {
            return [];
        }

        return [
            ...getCompositePrimaryKeys(jsonSchema),
            ...getCompositeUniqueKeys(jsonSchema),
        ];
    };

    return {
        getTableKeyConstraints,
        isInlineUnique,
        isInlinePrimaryKey,
        getKeys,
    };
};
