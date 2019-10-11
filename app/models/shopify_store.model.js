// create user model
module.exports = (sequelize, type) => {
    return sequelize.define('shopify_stores', {
        shopify_store_id: {
            type: type.STRING
        },
        shopify_url: {
            type: type.STRING
        },
        shopify_access_token: {
            type: type.STRING
        },
        access_token_experation: {
            type: type.STRING
        },
    },
    {
        timestamps: false
    });
}
