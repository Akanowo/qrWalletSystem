const mongoose = require('mongoose');

const { Types, Schema, model } = mongoose;

const virtualAccountSchema = new Schema(
	{
		id: String,
		response_code: String,
		response_message: String,
		flw_ref: String,
		order_ref: String,
		account_number: String,
		frequency: String,
		bank_name: String,
		created_at: String,
		expiry_date: String,
		note: String,
		amount: String,
		user: {
			type: Types.ObjectId,
			ref: 'User',
			required: true,
		},
	},
	{ strict: false }
);

const VirtualAccount = model('VirtualAccount', virtualAccountSchema);

module.exports = VirtualAccount;
