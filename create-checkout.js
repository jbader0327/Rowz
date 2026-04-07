const https = require('https');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured in Netlify environment variables' }) };
  }

  try {
    const { priceId, customerEmail, successUrl, cancelUrl } = JSON.parse(event.body);

    if (!priceId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'priceId is required' }) };
    }

    const postData = new URLSearchParams({
      'mode': 'subscription',
      'payment_method_types[0]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': successUrl || 'https://rowzr.com/?payment=success&session_id={CHECKOUT_SESSION_ID}',
      'cancel_url': cancelUrl || 'https://rowzr.com/?payment=cancelled',
      'allow_promotion_codes': 'true',
    });

    if (customerEmail) {
      postData.append('customer_email', customerEmail);
    }

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.stripe.com',
        path: '/v1/checkout/sessions',
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(stripeKey + ':').toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData.toString())
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const session = JSON.parse(data);
            if (session.url) {
              resolve({ statusCode: 200, headers, body: JSON.stringify({ url: session.url, sessionId: session.id }) });
            } else {
              resolve({ statusCode: 400, headers, body: JSON.stringify({ error: session.error?.message || 'Failed to create checkout session', details: session.error }) });
            }
          } catch (e) {
            resolve({ statusCode: 500, headers, body: JSON.stringify({ error: 'Invalid response from Stripe' }) });
          }
        });
      });
      req.on('error', (e) => resolve({ statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }));
      req.write(postData.toString());
      req.end();
    });
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
