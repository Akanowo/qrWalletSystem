const Transactions = require('flutterwave-node-v3/lib/rave.transactions');
const { flwClient } = require('../config/flutterwaveConfig');
const asyncHandler = require('../middleware/async');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');

const handleWebhookTransaction = asyncHandler(async (req, res, next) => {
	// verify hash
	const secretHash = process.env.FLW_WEBHOOK_HASH;
	const signature = req.headers['verif-hash'];
	if (!signature || signature !== secretHash) {
		// This request isn't from Flutterwave; discard
		return res.status(401).end();
	}

	const payload = req.body;

	console.log('WEBHOOK EVENT: ', payload);

	// handle webhook notification

	// verify transaction
	const transaction = await flwClient.Transaction.verify({
		id: payload.data.id,
	});

	if (
		transaction.data.status === 'successful' &&
		transaction.data.amount !== payload.data.amount &&
		transaction.data.currency !== payload.data.currency
	) {
		console.log('ACTUAL VALUES DOES NOT EQUAL EXPECTED VALUES');
		return res.status(200).end();
	}

	// get transaction in db
	const query = {
		$or: [
			{ id: transaction.data.id },
			{ tx_ref: transaction.data.tx_ref || transaction.data.txRef },
		],
	};
	const savedTransaction = await Transaction.findOne(query);

	if (!savedTransaction) {
		console.log('WENHOOK ERROR: TRANSACTION DOES NOT EXIST IN DB');
		return res.status(200).end();
	}

	if (savedTransaction && savedTransaction.status === transaction.data.status) {
		console.log('WEBHOOK: TRANSACTION ALREADY HANDLED!!');
		return res.status(200).end();
	}

	const charge = Math.round((1.4 / 100) * Number.parseInt(payload.data.amount));

	switch (payload.event) {
		case 'charge.completed':
			if (transaction.data.status.toLowerCase() === 'successful') {
				// update user's wallet
				const walletUpdate = await Wallet.updateOne(
					{ _id: savedTransaction.wallet_id },
					[
						{
							$set: {
								balance: {
									$add: [
										'$balance',
										Number.parseInt(payload.data.amount) - charge,
									],
								},
							},
						},
					]
				);

				// update transaction in db
				const transactionUpdate = await Transaction.findByIdAndUpdate(
					savedTransaction._id,
					{
						$set: {
							...transaction.data,
						},
					}
				);

				// TODO: Create notification

				console.log('Wallet Update', walletUpdate);
				console.log('Transaction Update', transactionUpdate);

				return res.status(200).end();
			} else {
				console.log('TRANSACTION FAILED!!');
				// TODO: Create notification
				return res.status(200).end();
			}

		case 'transfer.completed':
			if (transaction.data.status.toLowerCase() === 'successful') {
				// update user's wallet
				const walletUpdate = await Wallet.updateOne(
					{ _id: savedTransaction.wallet_id },
					[
						{
							$set: {
								balance: {
									$subtract: ['$balance', Number.parseInt(payload.data.amount)],
								},
							},
						},
					]
				);

				// update transaction in db
				const transactionUpdate = await Transaction.findByIdAndUpdate(
					savedTransaction._id,
					{
						$set: {
							...transaction.data,
						},
					}
				);

				// TODO: Create notification

				console.log('Wallet Update', walletUpdate);
				console.log('Transaction Update', transactionUpdate);

				return res.status(200).end();
			} else {
				// TODO: Create notification
				console.log('TRANSACTION FAILED!!');
				// update transaction in db
				const transactionUpdate = await Transaction.findByIdAndUpdate(
					savedTransaction._id,
					{
						$set: {
							...transaction.data,
						},
					}
				);

				console.log('Transaction Update', transactionUpdate);
				return res.status(200).end();
			}
		default:
			return res.status(200).end();
	}
});

module.exports = {
	handleWebhookTransaction,
};
