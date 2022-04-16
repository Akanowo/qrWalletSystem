const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./async');

module.exports = asyncHandler(async (req, res, next) => {
	const { authorization } = req.headers;

	if (!authorization) {
		return next(new ErrorResponse('UNAUTHORIZED', 400));
	}

	const token = authorization.split(' ')[1];

	console.log('TOKEN: ', token);

	if (!token) {
		return next(new ErrorResponse('UNAUTHORIZED', 400));
	}

	let payload = {};

	// verify token
	try {
		payload = jwt.verify(token, process.env.TOKEN_SECRET);
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

	console.log(payload);

	const user = await User.findById(payload.user_id).select(
		'firstName lastName email user_id type vendorName'
	);

	console.log(user);

	if (!user) {
		return next(new ErrorResponse('UNAUTHORIZED', 401));
	}

	req.user = user;

	next();
});
