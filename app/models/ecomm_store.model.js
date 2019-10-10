// create user model
module.exports = (sequelize, type) => {
    return sequelize.define('ecomm_stores', {
        store_name: {
            type: type.STRING
        },
    },
    {
        timestamps: false
    });
}
