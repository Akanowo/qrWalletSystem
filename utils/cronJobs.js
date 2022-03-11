const cron = require('node-cron');
const { flwClient } = require('../config/flutterwaveConfig');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const reddisConnect = require('../config/redisConfig');

const transactionVerificationPing = (id, user_id) => {
	const task = cron.schedule('*/10 * * * *', async () => {
		const redisClient = await reddisConnect();
		const transaction = await flwClient.Transaction.verify({ id });

		if (transaction.data.status === 'success') {
			// update transaction in db
			const transactionUpdate = await Transaction.findOneAndUpdate(
				{ transaction_id: id, type: 'topup' },
				{
					$set: {
						...transaction,
					},
				}
			);

			if (!transactionUpdate) {
				console.log('***************************************');
				console.log('CRON JOB: Invalid transaction ID');
				console.log('***************************************');
				return;
			}

			const charge = Number.parseInt(
				await redisClient.get(`${user_id}-flw_charge`)
			);
			const walletUpdate = await Wallet.updateOne(
				{
					user_id,
				},
				[
					{
						$set: {
							balance: { $add: ['$balance', transaction.data.amount - charge] },
						},
					},
				],
				{ returnDocument: true, new: true }
			);

			task.stop();
		}
	});
};

module.exports = { transactionVerificationPing };
