const asyncHandler = require('../middleware/async');
const Transaction = require('../models/Transaction');
const ErrorResponse = require('../utils/errorResponse');

const getSingleTransaction = asyncHandler(async (req, res, next) => {
	const { id } = req.params;

	if (!id) return next(new ErrorResponse('id is required', 400));

	const transaction = await Transaction.findById(id);

	if (!transaction)
		return next(new ErrorResponse('invalid transaction id', 400));

	return res.status(200).json({
		status: true,
		message: 'transaction fetched successfully',
		data: transaction,
	});
});

module.exports = {
	getSingleTransaction,
};
