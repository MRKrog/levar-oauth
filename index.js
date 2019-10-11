const dotenv = require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const axios = require('axios');

const { sequelize, User, ShopifyData } = require('./sequelize');

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
  const shopUrl =`https://${shop}/admin/oauth/authorize?client_id=${appPublicKey}&scope=read_products&state=${state}&redirect_uri=${redirectUri}`;

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

    console.log('tokenResponse', tokenResponse.data);

    // Step: Make authenticated requests
    const shopifyData = await axios(`https://${shop}/admin/shop.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': tokenResponse.data.access_token
      }
    });

    // *************#START FETCH EXAMPLE TO GET ALL PRODUCTS*************
    const shopifyProducts = await axios(`https://${shop}/admin/products.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': tokenResponse.data.access_token
      }
    })
    // *************#END FETCH EXAMPLE TO GET ALL PRODUCTS*************


    // *************#START TABLE WRITE SECTION*************
    // TODO >>>>>>>>>>
    // Still need to add correct expiration data
    // Also hash shopify_access_token before writing
    const shopifyStoreData = ShopifyData.build({ shopify_store_id: shopifyData.data.shop.id,
                                                 shopify_url: shopifyData.data.shop.domain,
                                                 shopify_access_token: tokenResponse.data.access_token,
                                                 access_token_experation: '49589485',
                                               });
    shopifyStoreData.save().then(() => {
        console.log('shopify_stores saved');
    }).finally(() => {
        sequelize.close();
    });

    // *************#END TABLE INSERT SECTION*************

    res.send(shopifyData.data.shop)

  } catch(error) {
    console.log(error)
    res.status(500).send('something went wrong')
  }
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
