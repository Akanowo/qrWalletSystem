const mongoose = require('mongoose');

const { Schema, model, Types } = mongoose;

const walletSchema = new Schema({
	address: {
		type: String,
		required: true,
	},
	user_id: {
		type: Types.ObjectId,
		required: true,
		ref: 'User',
	},
	balance: {
		type: Number,
		default: 0.0,
	},
	currency: {
		type: String,
		default: 'NGN',
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const Wallet = model('Wallet', walletSchema);

module.exports = Wallet;
