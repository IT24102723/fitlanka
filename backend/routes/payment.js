const express = require('express');
const router = express.Router();
const https = require('https');
const querystring = require('querystring');
const Payment = require('../models/Payment');

const PAYPAL_IPN_URL = process.env.PAYPAL_SANDBOX === 'true'
  ? 'https://www.sandbox.paypal.com/cgi-bin/webscr'
  : 'https://www.paypal.com/cgi-bin/webscr';

router.post('/paypal-ipn', async (req, res) => {
  try {
    const body = req.body;
    const verifyBody = querystring.stringify({ ...body, cmd: '_notify-validate' });
    const options = { hostname: new URL(PAYPAL_IPN_URL).hostname, path: '/cgi-bin/webscr', method: 'POST' };

    const verifyReq = https.request(options, async (verifyRes) => {
      let data = '';
      verifyRes.on('data', chunk => data += chunk);
      verifyRes.on('end', async () => {
        if (data === 'VERIFIED' && body.payment_status === 'Completed') {
          const paymentId = body.custom;
          const payment = await Payment.findById(paymentId);
          if (payment && payment.status !== 'completed') {
            payment.status = 'completed';
            payment.paymentMethod = 'paypal';
            payment.notes = 'PayPal txn: ' + (body.txn_id || '');
            await payment.save();
            console.log('PayPal payment completed:', paymentId);
          }
        }
        res.status(200).send('OK');
      });
    });

    verifyReq.on('error', err => {
      console.error('PayPal IPN verify error:', err);
      res.status(500).send('Error');
    });

    verifyReq.write(verifyBody);
    verifyReq.end();
  } catch (err) {
    console.error('PayPal IPN error:', err);
    res.status(500).send('Error');
  }
});

module.exports = router;
