// create user model
module.exports = (sequelize, type) => {
    return sequelize.define('user_integrations', {
        levar_user_id: {
            type: type.STRING
        },
        integration_id: {
            type: type.STRING
        },
    },
    {
        timestamps: false
    });
}
