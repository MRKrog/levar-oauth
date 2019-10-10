const dotenv = require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const axios = require('axios');

const { sequelize, User, CustomerIntergration } = require('./sequelize');

const forwardingAddress = 'https://15725d9f.ngrok.io';
const appPublicKey = process.env.SHOPIFY_API_PUBLIC_KEY;
const appSecretKey = process.env.SHOPIFY_API_SECRET_KEY

// For App Install/Connection URL >>> https://15725d9f.ngrok.io/shopify?shop=levartest-auth.myshopify.com

const app = express();
const PORT = 80;

app.get('/', (req, res) => {
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
  res.redirect(shopUrl);
});

// Step: Confirm Installation
app.get('/shopify/callback', async (req, res) => {
  const { shop, code, state, timestamp } = req.query;
  const stateCookie = cookie.parse(req.headers.cookie).state;

  if (state !== stateCookie) { return res.status(403).send('Cannot be verified')} // Checking if nonce is same as first generated

  const { hmac, ...params } = req.query
  const queryParams = querystring.stringify(params)
  const hash = crypto.createHmac('sha256', appSecretKey).update(queryParams).digest('hex');

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

    // *************TABLE INSERT SECTION*************

    // Entry for User Intergrations Table
    const customer_id = shopifyData.data.shop.id // customer_integrations
    const integration_id = 'shopify=1' // integration_id

    // Entry for ecomm_stores Table
    const shopifyStoreURL = shopifyData.data.shop.domain;
    const shopifyPassword = ''; // What would be the password here?
    const shopifyKey = ''; // What would be the key here?

    // Example working to insert User in db
    const user = User.build({ email: 'mkrog@gmail.com', password: '12354567889' });
    user.save().then(() => {
        console.log('user saved');
    }).finally(() => {
        sequelize.close();
    });

    // *************TABLE INSERT SECTION*************

    res.send(shopifyData.data.shop)
  } catch(error) {
    console.log(error)
    res.status(500).send('something went wrong')
  }
});



app.listen(PORT, () => console.log(`listening on port ${PORT}`));
