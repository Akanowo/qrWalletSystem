const Wallet = require('../models/Wallet');
const { v4: uuid } = require('uuid');

/**
 *
 * @param {string} user_id
 * @returns {Promise<string>}
 */
const createWallet = async (user_id) => {
	const walletData = {
		address: uuid(),
		user_id,
	};

	const wallet = await Wallet.create(walletData);

	return wallet.address;
};

module.exports = {
	createWallet,
};
