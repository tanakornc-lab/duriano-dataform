/*
 * Generate Surrogate Key using FARM_FINGERPRINT
 * @param {string[]} columns - Array of column names to hash
 * @returns {string} - SQL statement for generating the key
 */
function surrogate_key(columns) {
    var stringified_cols = columns.map(function(col) {
        return "COALESCE(CAST(" + col + " AS STRING), '_null_')";
    });

    return "CAST(FARM_FINGERPRINT(CONCAT(" + stringified_cols.join(", '-', ") + ")) AS STRING)";
}

module.exports = {
    surrogate_key
};
