const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./async');

module.exports = asyncHandler(async (req, res, next) => {
	const { cookies } = req;

	if (!cookies) {
		return next(new ErrorResponse('UNAUTHORIZED', 403));
	}

	const { access } = cookies;

	if (!access) {
		return next(new ErrorResponse('UNAUTHORIZED', 403));
	}

	let payload = {};

	// verify token
	try {
		payload = jwt.verify(access, process.env.TOKEN_SECRET);
	} catch (error) {
		if (error.name === 'TokenExpiredError') {
			return next(new ErrorResponse('Token expired', 401));
		}

		console.log('====================================');
		console.log('TOKEN VERIFY ERR: ', error.message);
		console.log('====================================');
		if (error.message === 'jwt malformed') {
			return next(new ErrorResponse('invalid token', 403));
		}
		return next(new ErrorResponse('An unexpected error occured', 500));
	}

	const user = await User.findById(payload.user_id).select(
		'firstName lastName email user_id'
	);

	if (!user) {
		return next(new ErrorResponse('UNAUTHORIZED', 401));
	}

	req.user = user;

	next();
});
