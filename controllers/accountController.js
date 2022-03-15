const { flwClient } = require('../config/flutterwaveConfig');
const asyncHandler = require('../middleware/async');
const Account = require('../models/Account');
const Wallet = require('../models/Wallet');
const ErrorResponse = require('../utils/errorResponse');
const { v4: uuid } = require('uuid');

const handleGetBanks = asyncHandler(async (req, res, next) => {
	let response = await flwClient.Bank.country({ country: 'NG' });

	if (!response) {
		return next(new ErrorResponse('An error occured', 422));
	}

	if (response.status !== 'success') {
		return next(new ErrorResponse(response.message, 422));
	}

	return res.status(200).json({
		status: true,
		message: response.message,
		data: response.data,
	});
});

const updateAccount = asyncHandler(async (req, res, next) => {
	const response = await flwClient.Misc.verify_Account(req.body);

	console.log(response);

	if (response.status !== 'success') {
		return next(new ErrorResponse(response.message, 422));
	}

	const wallet = await Wallet.findOne({ user_id: req.user._id });

	// save or update user's account
	const update = {
		account_id: uuid(),
		bank_code: req.body.account_bank,
		bank_name: req.body.bank_name,
		account_number: req.body.account_number,
		account_name: response.data.account_name,
		wallet_id: wallet._id,
	};
	const account = await Account.findOneAndUpdate(
		{ wallet_id: wallet._id },
		{
			$set: {
				...update,
			},
		},
		{ new: true, upsert: true }
	);

	return res.status(200).json({
		status: true,
		message: 'Account Updated Successfully',
		data: account,
	});
});

module.exports = {
	handleGetBanks,
	updateAccount,
};
