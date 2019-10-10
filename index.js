const dotenv = require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const axios = require('axios');

const { sequelize, User } = require('./sequelize');

const forwardingAddress = 'https://15725d9f.ngrok.io';
const appPublicKey = process.env.SHOPIFY_API_PUBLIC_KEY;
const appSecretKey = process.env.SHOPIFY_API_SECRET_KEY



// For App Install/Connection URL >>> https://15725d9f.ngrok.io/shopify?shop=levartest-auth.myshopify.com

const app = express();
const PORT = 80;

app.get('/', (req, res) => {

  // User.findOne({ where: { id: 10 } }).then(note => {
  //     console.log(note.get({ plain: true }));
  // }).finally(() => {
  //     sequelize.close();
  // });

  const user = User.build({ email: 'test@gmail.com', password: '12354567889' });
  user.save().then(() => {
      console.log('user saved');
  }).finally(() => {
      sequelize.close();
  });

  res.send('Server Running and connected!')
});

// Step: Make Request to install app & Redirect to Shopify OAuth grant screen
app.get('/shopify', (req, res) => {

  const shop = req.query.shop;
  if (!shop) { return res.status(400).send('no shop')}

  const state = nonce();
  const redirectUri = `${forwardingAddress}/shopify/callback`;

  const shopUrl =`https://${shop}/admin/oauth/authorize?client_id=${appPublicKey}&scope=write_products&state=${state}&redirect_uri=${redirectUri}`;
  res.cookie('state', state);

  // FIRST // https://levartest-auth.myshopify.com/admin/oauth/request_grant?client_id=2bcd079c4d575c38bf2825538bc777dc&redirect_uri=https%3A%2F%2F15725d9f.ngrok.io%2Fshopify%2Fcallback&scope=write_products&state=157071858174700/
  // SECOND // https://15725d9f.ngrok.io/shopify/callback?code=8cfdda0351a18948ea34517c4a306db9&hmac=582d1bb0440268cc933e5e200b883b37d71a196425663edaf06852cd1dcf3564&shop=levartest-auth.myshopify.com&state=157071858174700&timestamp=1570718606
  // second // https://15725d9f.ngrok.io/shopify/callback?code=b477fc058be9c5077e8d712d85b36a01&hmac=dd08c9743cdf0a0b676f7f9aaee8547ca42d483105f9571fe3ba8adcca969305&shop=levartest-auth.myshopify.com&state=157072422803900&timestamp=1570724237
  res.redirect(shopUrl);
});

// Step: Confirm Installation
app.get('/shopify/callback', async (req, res) => {
  const { shop, code, state, timestamp } = req.query;
  const stateCookie = cookie.parse(req.headers.cookie).state;

  console.log('>>>> Second >>>>');
  console.log('shop', shop);
  console.log('stateCookie', stateCookie);
  console.log('state second', state);
  console.log('code', code);

  if (state !== stateCookie) { return res.status(403).send('Cannot be verified')} // Checking if nonce is same as first generated

  const { hmac, ...params } = req.query
  console.log('params', params);
  console.log('hmac second', hmac);
  const queryParams = querystring.stringify(params)

  const hash = crypto.createHmac('sha256', appSecretKey).update(queryParams).digest('hex');

  console.log('hash', hash);

  if (hash !== hmac) { return res.status(400).send('HMAC validation failed')} // Checking if hmac is signed by Shopify

  try {
    // Step: Exchange the access code for a permanent access token
    const tokenResponse = await axios(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      data: { client_id: appPublicKey, client_secret: appSecretKey, code }
    });

    // Step: Make authenticated requests
    const shopifyData = await axios(`https://${shop}/admin/shop.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': tokenResponse.data.access_token
      }
    });

    // Shopify store URL >>> Shopify SQL table (currently called ecomm_stores)
    const shopifyStoreURL = shopifyData.data.shop.domain;
    console.log('shopifyStoreURL', shopifyStoreURL);

    // Entry into integrations table - customer_integrations
    const customer_id = shopifyData.data.shop.id
    const integration_id = 'shopify=1'

    // When we receive the Password and Key
    // Save into shopify_stores > shopify_key & shopify_password

    // >>>>>>>>>>>>>>>>>
    



    // >>>>>>>>>>>>>>>>>

    res.send(shopifyData.data.shop)

  } catch(error) {
    console.log(error)
    res.status(500).send('something went wrong')
  }
});



app.listen(PORT, () => console.log(`listening on port ${PORT}`));
