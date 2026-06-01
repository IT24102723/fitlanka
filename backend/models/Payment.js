const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: { type: Number, required: true },
  websiteFee: { type: Number, default: 500 },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  payhereOrderId: { type: String },
  payherePaymentId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
