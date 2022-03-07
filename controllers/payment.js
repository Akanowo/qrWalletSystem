const asyncHandler = require('../middleware/async');

const controllers = () => {
	const handleTopup = asyncHandler(async (req, res, next) => {
		return res.status(200).json({
			status: true,
			message: 'You have reached the topup endpoint',
		});
	});

	const handleTransfer = asyncHandler(async (req, res, next) => {
		return res.status(200).json({
			status: true,
			message: 'You have reached the transfer endpoint',
		});
	});

	const handleWithdrawal = asyncHandler(async (req, res, next) => {
		return res.status(200).json({
			status: true,
			message: 'You have reached the withdraw endpoint',
		});
	});

	return {
		handleTopup,
		handleTransfer,
		handleWithdrawal,
	};
};

module.exports = controllers();
