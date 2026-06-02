const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Payment = require('../models/Payment');

router.post('/notify', async (req, res) => {
  try {
    const {
      merchant_id, order_id, payment_id, payhere_amount,
      payhere_currency, status_code, md5sig
    } = req.body;

    const merchantSecret = process.env.PAYHERE_SECRET;
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const localMd5sig = crypto.createHash('md5')
      .update(merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret)
      .digest('hex')
      .toUpperCase();

    if (localMd5sig !== md5sig) {
      console.error('PayHere IPN: Hash mismatch');
      return res.status(400).send('Hash mismatch');
    }

    if (status_code == '2') {
      const payment = await Payment.findOne({ payhereOrderId: order_id });
      if (payment && payment.status !== 'completed') {
        payment.status = 'completed';
        payment.payherePaymentId = payment_id;
        await payment.save();
        console.log('Payment completed:', order_id);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('PayHere IPN error:', err);
    res.status(500).send('Error');
  }
});

module.exports = router;
