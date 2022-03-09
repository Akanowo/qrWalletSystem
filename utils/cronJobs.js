const cron = require('node-cron');
const { flwClient } = require('../config/flutterwaveConfig');
const Transaction = require('../models/Transaction');

const transactionVerificationPing = (id) => {
	const task = cron.schedule('10 * * * *', async () => {
		const transaction = await flwClient.Transaction.verify({ id });

		if (transaction.data.status === 'success') {
			// update transaction in db
			const transactionUpdate = Transaction.findOneAndUpdate(
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

			task.stop();
		}
	});
};

module.exports = { transactionVerificationPing };
