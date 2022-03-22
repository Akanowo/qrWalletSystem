const asyncHandler = require('../middleware/async');
const Wallet = require('../models/Wallet');
const ErrorResponse = require('../utils/errorResponse');
const { v4: uuid } = require('uuid');
const redisConnect = require('../config/redisConfig');
const { flwClient } = require('../config/flutterwaveConfig');
const Transaction = require('../models/Transaction');
const { transactionVerificationPing } = require('../utils/cronJobs');

const controllers = () => {
	const handleTopup = asyncHandler(async (req, res, next) => {
		const charge = (1.42 / 100) * req.body.amount;
		const redisClient = await redisConnect();
		// create payload
		const payload = {
			card_number: req.body.card_number,
			cvv: req.body.cvv,
			expiry_month: req.body.expiry_month,
			expiry_year: req.body.expiry_year,
			currency: 'NGN',
			amount: req.body.amount + charge,
			email: req.user.email,
			fullname: `${req.user.firstName} ${req.user.lastName}`,
			enckey: process.env.FLW_ENC_KEY,
			tx_ref: `FWL-${uuid()}`,
			redirect_url: 'http://localhost:8080/api/v1/payment/verify',
		};

		const response = await flwClient.Charge.card(payload);

		if (response.status !== 'success') {
			return next(new ErrorResponse(response.message, 400));
		}

		switch (response?.meta?.authorization?.mode) {
			case 'pin':
			case 'avs_noauth':
				const [payloadRes, authFieldRes, authModeRes] = await redisClient
					.multi()
					.set(`${req.user._id}-payload`, JSON.stringify(payload))
					.set(
						`${req.user._id}-auth_fields`,
						JSON.stringify(response.meta.authorization.fields)
					)
					.set(`${req.user._id}-flw_charge`, charge)
					.set(`${req.user._id}-auth_mode`, response.meta.authorization.mode)
					.exec();

				return res.status(200).json({
					status: true,
					message: 'charge initiated',
					data: response.meta.authorization,
				});

			case 'redirect':
				console.log('TXT REF: ', response.data.tx_ref);
				await redisClient.set(
					`txRef-${response.data.tx_ref}`,
					response.data.id
				);
				await redisClient.set(`${req.user._id}-flw_charge`, charge);
				return res.status(200).json({
					status: true,
					message: 'redirect required',
					data: {
						url: response.meta.authorization.redirect,
					},
				});

			default:
				const transaction = flwClient.Transaction.verify({
					id: response.data.id,
				});
				// get user's wallet
				const wallet = await Wallet.findOne({ user_id: req.user._id });
				if (transaction.data.status === 'success') {
					// create transaction in db
					const transactionData = {
						type: 'topup',
						operation: 'credit',
						wallet_id: wallet._id,
						...transaction.data,
					};
					const savedTransaction = await Transaction.create(transactionData);

					// update user's wallet balance
					const walletUpdate = await Wallet.updateOne(
						{
							_id: wallet._id,
						},
						[
							{
								$set: {
									balance: {
										$add: [
											'$balance',
											payload.amount - transaction.data.app_fee,
										],
									},
								},
							},
						],
						{ returnDocument: true, new: true }
					);

					return res.status(200).json({
						status: true,
						message: 'payment complete',
						data: savedTransaction,
					});
				} else if (transaction.status === 'pending') {
					const transactionData = {
						type: 'topup',
						operation: 'credit',
						wallet_id: wallet._id,
						...transaction,
					};
					const savedTransaction = await Transaction.create(transactionData);

					// add to cronjob
					transactionVerificationPing(transaction.data.id, req.user._id);
					return res.status(200).json({
						status: true,
						message: 'payment pending',
						data: transaction.data,
					});
				} else {
					return res.status(422).json({
						status: false,
						message: 'payment failed',
						data: transaction.data,
					});
				}
		}
	});

	const handleTopupAuthorization = asyncHandler(async (req, res, next) => {
		const redisClient = await redisConnect();
		const payload = JSON.parse(
			await redisClient.get(`${req.user._id}-payload`)
		);
		const auth_mode = await redisClient.get(`${req.user._id}-auth_mode`);
		const auth_fields = await JSON.parse(
			await redisClient.get(`${req.user._id}-auth_fields`)
		);

		payload.authorization = {
			mode: auth_mode,
		};

		auth_fields.forEach((field) => {
			payload.authorization[field] = req.body[field];
		});

		console.log(payload);

		const response = await flwClient.Charge.card(payload);

		console.log('Authorization response', response);

		console.log('TXT REF: ', response.data.tx_ref);

		switch (response?.meta?.authorization?.mode) {
			case 'otp':
				// Show the user a form to enter the OTP
				await redisClient.set(`${req.user._id}-flw_ref`, response.data.flw_ref);
				return res.status(200).json({
					status: true,
					message: 'otp required',
					data: {
						fields: ['otp'],
						...response.meta.authorization,
					},
				});
			case 'redirect':
				await redisClient.set(
					`txRef-${response.data.tx_ref}`,
					response.data.id
				);
				const authUrl = response.meta.authorization.redirect;
				return res.status(200).json({
					status: true,
					message: 'redirect required',
					data: {
						url: authUrl,
					},
				});
			default:
				// No validation needed; just verify the payment
				const transactionId = response.data.id;
				const transaction = await flwClient.Transaction.verify({
					id: transactionId,
				});
				const wallet = Wallet.findOne({ user_id: req.user._id });
				if (transaction.data.status == 'successful') {
					// create transaction in db
					const transactionData = {
						type: 'topup',
						operation: 'credit',
						wallet_id: wallet._id,
						...transaction.data,
					};
					const savedTransaction = await Transaction.create(transactionData);

					const charge = Number.parseInt(
						await redisClient.get(`${req.user._id}-flw_charge`)
					);

					// update user's wallet balance
					const walletUpdate = await Wallet.updateOne(
						{
							_id: wallet._id,
						},
						[
							{
								$set: {
									balance: {
										$add: [
											'$balance',
											transaction.data.amount - transaction.data.app_fee,
										],
									},
								},
							},
						],
						{ returnDocument: true, new: true }
					);

					return res.status(200).json({
						status: true,
						message: 'payment complete',
						data: savedTransaction,
					});
				} else if (transaction.data.status == 'pending') {
					const transactionData = {
						type: 'topup',
						wallet_id: wallet._id,
						...transaction,
					};
					const savedTransaction = await Transaction.create(transactionData);

					// add to cronjob
					transactionVerificationPing(transaction.data.id, req.user._id);
					return res.status(200).json({
						status: true,
						message: 'payment pending',
						data: transaction.data,
					});
				} else {
					return res.status(422).json({
						status: false,
						message: 'payment failed',
						data: transaction.data,
					});
				}
		}
	});

	const handleTopupValidation = asyncHandler(async (req, res, next) => {
		const redisClient = await redisConnect();
		const response = await flwClient.Charge.validate({
			otp: req.body.otp,
			flw_ref: await redisClient.get(`${req.user._id}-flw_ref`),
		});

		console.log(response);

		if (
			response.data.status === 'successful' ||
			response.data.status === 'pending'
		) {
			// Verify the payment
			const transactionId = response.data.id;
			const transaction = await flwClient.Transaction.verify({
				id: transactionId,
			});

			console.log('VERIFIED TRANSACTION: ', transaction);

			const wallet = await Wallet.findOne({ user_id: req.user._id });

			if (transaction.data.status == 'successful') {
				// create transaction in db
				const transactionData = {
					type: 'topup',
					operation: 'credit',
					wallet_id: wallet._id,
					...transaction.data,
				};
				const savedTransaction = await Transaction.create(transactionData);

				const charge = Number.parseFloat(
					await redisClient.get(`${req.user._id}-flw_charge`)
				);

				console.log(charge);

				// update user's wallet balance
				const walletUpdate = await Wallet.updateOne(
					{
						_id: wallet._id,
					},
					[
						{
							$set: {
								balance: {
									$add: [
										'$balance',
										transaction.data.amount - transaction.data.app_fee,
									],
								},
							},
						},
					],
					{ returnDocument: true, new: true }
				);

				return res.status(200).json({
					status: true,
					message: 'payment complete',
					data: savedTransaction,
				});
			} else if (transaction.data.status == 'pending') {
				const transactionData = {
					type: 'topup',
					operation: 'credit',
					wallet_id: wallet._id,
					...transaction,
				};
				const savedTransaction = await Transaction.create(transactionData);

				// add to cronjob
				transactionVerificationPing(transaction.data.id, req.user._id);
				return res.status(200).json({
					status: true,
					message: 'payment pending',
					data: transaction.data,
				});
			} else {
				return res.status(422).json({
					status: false,
					message: 'payment failed',
					data: transaction.data,
				});
			}
		}
	});

	const handleTopupRedirect = asyncHandler(async (req, res, next) => {
		const redisClient = await redisConnect();
		if (req.query.status === 'successful' || req.query.status === 'pending') {
			// Verify the payment
			const txRef = req.query.tx_ref;
			console.log(txRef);
			const transactionId = await redisClient.get(`txRef-${txRef}`);
			console.log('Transaction id: ', transactionId);
			const transaction = await flwClient.Transaction.verify({
				id: transactionId,
			});

			console.log('TRANSACTION ID: ', transaction);
			const wallet = await Wallet.findOne({ user_id: req.user._id });

			if (transaction.status === 'error') {
				return next(new ErrorResponse(transaction.message, 400));
			}

			if (transaction?.data?.status == 'successful') {
				// create transaction in db
				const transactionData = {
					type: 'topup',
					operation: 'credit',
					wallet_id: wallet._id,
					...transaction.data,
				};
				const savedTransaction = await Transaction.create(transactionData);

				const charge = Number.parseFloat(
					await redisClient.get(`${req.user._id}-flw_charge`)
				);
				// update user's wallet balance
				const walletUpdate = await Wallet.updateOne(
					{
						_id: wallet._id,
					},
					[
						{
							$set: {
								balance: {
									$add: [
										'$balance',
										transaction.data.amount - transaction.data.app_fee,
									],
								},
							},
						},
					],
					{ returnDocument: true, new: true }
				);

				return res.status(200).json({
					status: true,
					message: 'payment complete',
					data: savedTransaction,
				});
			} else if (transaction.data.status == 'pending') {
				const transactionData = {
					type: 'topup',
					operation: 'credit',
					wallet_id: wallet._id,
					...transaction,
				};
				const savedTransaction = await Transaction.create(transactionData);

				// add to cronjob
				transactionVerificationPing(transaction.data.id, req.user._id);
				return res.status(200).json({
					status: true,
					message: 'payment pending',
					data: transaction.data,
				});
			} else {
				return res.status(422).json({
					status: false,
					message: 'payment failed',
					data: transaction.data,
				});
			}
		}

		return res.redirect('/payment-failed');
	});

	const handleTopupTransfer = asyncHandler(async (req, res, next) => {
		const charge = Math.round((1.4 / 100) * Number.parseInt(req.body.amount));
		const payload = {
			tx_ref: `FWL-${uuid()}`,
			amount: req.body.amount + charge,
			email: req.user.email,
			currency: 'NGN',
		};

		const response = await flwClient.Charge.bank_transfer(payload);

		console.log('TOPUP TRANSFER RESPONSE: ', response);

		if (response?.status !== 'success') {
			return next(new ErrorResponse(response.message, 400));
		}

		// save transaction
		const wallet = await Wallet.findOne({ user_id: req.user._id });
		const transactionData = {
			wallet_id: wallet._id,
			amount: Number.parseInt(response.meta.authorization.transfer_amount),
			type: 'topup',
			operation: 'credit',
			status: 'pending',
			tx_ref: payload.tx_ref,
			meta: {
				originatoraccountnumber: response.meta.authorization.transfer_account,
				bankname: response.meta.authorization.transfer_bank,
			},
		};
		const savedTransaction = await Transaction.create(transactionData);

		return res.status(200).json({
			status: true,
			message: 'charge initiated',
			data: response.meta.authorization,
		});
	});

	const handleTopupUssd = asyncHandler(async (req, res, next) => {
		// const charge = Math.round((1.4 / 100) * req.body.amount);

		const payload = {
			account_bank: req.body.account_bank_code,
			amount: req.body.amount,
			currency: 'NGN',
			email: req.user.email,
			tx_ref: `FWL-${uuid()}`,
			fullname: `${req.user.firstName} ${req.user.lastName}`,
		};

		const response = await flwClient.Charge.ussd(payload);

		console.log('TOPUP USSD RESPONSE: ', response);

		if (response.status !== 'success') {
			return next(new ErrorResponse(response.message, 422));
		}

		// save transaction to db
		const wallet = await Wallet.findOne({ user_id: req.user._id });
		const transactionData = {
			type: 'topup',
			operation: 'credit',
			wallet_id: wallet._id,
			...response.data,
		};
		const savedTransaction = await Transaction.create(transactionData);

		return res.status(200).json({
			status: true,
			message: `Please dial ${response.meta.authorization.note} to complete the transaction.`,
			data: {
				ussdCode: response.meta.authorization.note,
				paymentCode: response.data.payment_code,
			},
		});
	});

	const handleTransfer = asyncHandler(async (req, res, next) => {
		const { _id } = req.user;
		const { address, amount } = req.body;

		console.log(amount);

		if (!address || !amount) {
			return next(new ErrorResponse('address and amount is required', 400));
		}

		// find sender's wallet
		const senderWallet = await Wallet.findOne({ user_id: _id }).populate(
			'user_id'
		);

		// find receiver's wallet
		const receiverWallet = await Wallet.findOne({ address }).populate(
			'user_id'
		);

		console.log('Sender wallet', senderWallet);

		if (senderWallet.balance < amount) {
			return next(new ErrorResponse('insufficient funds', 400));
		}

		// update sender's wallet

		const senderWalletUpdate = await Wallet.updateOne(
			{
				user_id: _id,
			},
			[
				{
					$set: {
						balance: { $subtract: ['$balance', amount] },
					},
				},
			],
			{ returnDocument: true, new: true }
		);

		if (
			senderWalletUpdate.matchedCount === 0 &&
			senderWalletUpdate.modifiedCount === 0
		) {
			return next(new ErrorResponse('invalid user', 403));
		}

		// const senderWalletUpdate = await Wallet.findByIdAndUpdate(
		// 	senderWallet._id,
		// 	{
		// 		$set: {
		// 			$subtract: ['$balance', amount],
		// 		},
		// 	},
		// 	{ new: true }
		// );

		// update receiver's wallet
		const receiverWalletUpdate = await Wallet.updateOne(
			{
				address,
			},
			[
				{
					$set: {
						balance: { $add: ['$balance', amount] },
					},
				},
			]
		);

		if (
			receiverWalletUpdate.matchedCount === 0 &&
			receiverWalletUpdate.modifiedCount === 0
		) {
			return next(new ErrorResponse('invalid wallet address', 403));
		}

		// create transaction
		const transactionData = [
			{
				type: 'transfer',
				operation: 'debit',
				status: 'successful',
				id: uuid(),
				wallet_id: senderWallet._id,
				amount,
				currency: 'NGN',
				to: receiverWallet.user_id,
			},
			{
				type: 'transfer',
				operation: 'credit',
				status: 'successful',
				id: uuid(),
				wallet_id: receiverWallet._id,
				amount,
				currency: 'NGN',
				from: senderWallet.user_id,
			},
		];
		const savedTransaction = await Transaction.insertMany(transactionData);

		return res.status(200).json({
			status: true,
			message: 'transfer successful',
			data: {
				transaction: savedTransaction[0],
				balance: senderWallet.balance - amount,
			},
		});
	});

	const handleWithdrawal = asyncHandler(async (req, res, next) => {
		const payload = {
			account_bank: req.body.account_bank,
			account_number: req.body.account_number,
			amount: Number.parseInt(req.body.amount),
			narration: 'Withdrawal',
			currency: 'NGN',
			reference: `FWL-${uuid()}`,
			callback_url: process.env.WEBHOOK_URL,
			debit_currency: 'NGN',
		};

		const response = await flwClient.Transfer.initiate(payload);

		if (response.status !== 'success') {
			return next(new ErrorResponse(response.message, 422));
		}

		// save transaction in db
		const wallet = await Wallet.findOne({ user_id: req.user._id });
		const transactionData = {
			wallet_id: wallet._id,
			type: 'withdraw',
			...response.data,
		};
		const savedTransaction = await Transaction.create(transactionData);

		return res.status(200).json({
			status: true,
			message: 'Withdrawal queued successfully',
			data: response.data,
		});
	});

	const generateVirtualAccount = asyncHandler(async (req, res, next) => {
		const { first_name, last_name, date_of_birth, phone_number, bvn } =
			req.body;

		console.log(req.body);

		const response = await flwClient.Misc.bvn({ bvn });

		if (!response) {
			return next(new ErrorResponse('An unexpected error occured', 422));
		}

		if (response.status !== 'success') {
			return next(new ErrorResponse(response.message, 422));
		}

		let detailsMatch = false;

		// match bvn details
		for (const [key, value] of Object.entries(req.body)) {
			if (!response.data[key]) {
				continue;
			}
			if (
				response.data[key].toLowerCase().trim() === value.toLowerCase().trim()
			) {
				detailsMatch = true;
			} else {
				detailsMatch = false;
				break;
			}
		}

		if (!detailsMatch) {
			return next(
				new ErrorResponse('BVN data does not match provided user data', 422)
			);
		}

		// Generate virtual account number for user

		const v_acc_details = {
			email: req.user.email,
			is_permanent: true,
			bvn,
			tx_ref: `FWL-${uuid()}`,
			phonenumber: phone_number,
			firstname: first_name,
			lastname: last_name,
			narration: `${first_name} ${last_name}`,
		};

		const vAcc = await flwClient.VirtualAcct.create({ data: v_acc_details });

		if (!vAcc) {
			return next(
				new ErrorResponse('An error occured generating account number', 422)
			);
		}

		if (vAcc.status !== 'success') {
			return next(new ErrorResponse(response.message, 422));
		}

		// save virtual account details to db

		const db_vAcc_details = {
			id: uuid(),
			...vAcc.data,
			user: req.user._id,
		};
		const savedVAcc = await VirtualAccount.create(db_vAcc_details);

		return res.status(200).json({
			status: true,
			message: 'Account generated successfully',
			data: {
				account_number: vAcc.data.account_number,
				bank_name: vAcc.data.bank_name,
				note: vAcc.data.note,
			},
		});
	});

	return {
		handleTopup,
		handleTopupAuthorization,
		handleTopupRedirect,
		handleTopupValidation,
		handleTopupTransfer,
		handleTopupUssd,
		handleTransfer,
		handleWithdrawal,
		generateVirtualAccount,
	};
};

module.exports = controllers();
