const Sequelize = require('sequelize');
const UserModel = require('./app/models/user.model');
const EcommStoreModel = require('./app/models/ecomm_store.model');

const sequelize = new Sequelize('levAR', 'contractor', 'contract22', {
    host: 'levarrds.cfnewtqbosoi.us-east-1.rds.amazonaws.com',
    port: 3306,
    logging: console.log,
    maxConcurrentQueries: 100,
    dialect: 'mysql',
    dialectOptions: {
        ssl:'Amazon RDS'
    },
    pool: {
      maxConnections: 5,
      maxIdleTime: 30,
      max: 5,
      min: 0,
      idle: 20000,
      acquire: 20000
    },
    language: 'en'
})

sequelize
  .authenticate()
  .then(() => console.log('Connection has been established successfully.'))
  .catch(err => console.error('Unable to connect to the database:', err));


const User = UserModel(sequelize, Sequelize);
User.sync()
  .then(() => console.log('Connected to user table successfully'))
  .catch(err => console.log('Failed to connect to user table'));

const EcommStore = EcommStoreModel(sequelize, Sequelize);
EcommStore.sync()
  .then(() => console.log('Connected to ecomm_store table successfully'))
  .catch(err => console.log('Failed to connect to ecomm_store table'));


module.exports = {
  User,
  EcommStore,
  sequelize
}
