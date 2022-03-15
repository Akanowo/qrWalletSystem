const mongoose = require('mongoose');

const { Types, Schema, model } = mongoose;

const accountSchema = new Schema({
	account_id: {
		type: String,
		required: true,
	},
	bank_name: {
		type: String,
		required: true,
		max: 200,
	},
	bank_code: {
		type: String,
		required: true,
		max: 4,
	},
	account_number: {
		type: String,
		required: true,
		max: 10,
	},
	account_name: {
		type: String,
		required: true,
		max: 200,
	},
	wallet_id: {
		type: Types.ObjectId,
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const Account = model('Account', accountSchema);

module.exports = Account;
