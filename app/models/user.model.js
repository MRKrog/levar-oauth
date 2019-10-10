// create user model
module.exports = (sequelize, type) => {
    return sequelize.define('users', {
        email: {
            type: type.STRING, validate: { isEmail: true }
        },
        password: {
            type: type.STRING, validate: { len: [8, 255] },
        },
    })
}
