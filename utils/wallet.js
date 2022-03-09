const QrCode = require('qrcode');
const Wallet = require('../models/Wallet');
const QrcodeModel = require('../models/Qrcode');
const { v4: uuid } = require('uuid');

/**
 *
 * @param {string} user_id
 * @returns {Promise<string>}
 */
const createWallet = async (user_id, type) => {
	const walletData = {
		address: uuid(),
		user_id,
	};

	const wallet = await Wallet.create(walletData);

	if (type === 'vendor') {
		await generateQrCode(wallet.address);
	}

	return wallet.address;
};

const generateQrCode = async (address) => {
	// generate wallet qr code
	const qrCodeUrl = await QrCode.toDataURL(address, {
		type: 'image/png',
	});

	const qrCodeData = {
		qrcode_id: uuid(),
		url: qrCodeUrl,
		wallet_id: wallet._id,
	};

	const qrcode = await QrcodeModel.create(qrCodeData);
	return qrcode;
};

module.exports = {
	createWallet,
};
