const mongoose = require('mongoose');

const { Schema, Types, model } = mongoose;

// const customerSchema = new Schema({
// 	id: String,
// 	name: String,
// 	phone_number: String,
// 	email: String,
// });

// const cardSchema = new Schema({
// 	first_6digits: String,
// 	last_4digits: String,
// 	issuer: String,
// 	country: String,
// 	type: String,
// 	expiry: String,
// });

const transactionSchema = new Schema(
	{
		id: String,
		type: {
			type: String,
			enum: ['topup', 'transfer', 'withdraw'],
		},
		status: {
			type: String,
			required: true,
		},
		wallet_id: {
			type: Types.ObjectId,
			ref: 'Wallet',
			required: true,
		},
		amount: {
			type: Number,
			required: true,
		},
		tx_ref: String,
		flw_ref: String,
		currency: {
			type: String,
			default: 'NGN',
		},
		charged_amount: Number,
		app_fee: Number,
		merchant_fee: Number,
		processor_response: String,
		auth_model: String,
		ip: String,
		narration: String,
		payment_type: String,
		to: {
			type: Types.ObjectId,
			ref: 'User',
		},
		from: {
			type: Types.ObjectId,
			ref: 'User',
		},
		created_at: {
			type: Date,
			default: Date.now,
		},
		account_id: Number,
		customer: Schema.Types.Mixed,
		card: Schema.Types.Mixed,
		meta: Schema.Types.Mixed,
	},
	{ strict: false }
);

module.exports = model('Transaction', transactionSchema);
