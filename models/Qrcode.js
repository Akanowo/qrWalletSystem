const mongoose = require('mongoose');

const { Schema, model, Types } = mongoose;

const qrCodeSchema = new Schema({
	qrcode_id: {
		type: String,
		required: true,
	},
	url: {
		type: String,
		required: true,
	},
	wallet_id: {
		type: Types.ObjectId,
		ref: 'Wallet',
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const QrCode = model('Qrcode', qrCodeSchema);

module.exports = QrCode;
