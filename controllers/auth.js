const bcrypt = require('bcrypt');
const { v4: uuid } = require('uuid');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/async');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const {
	generateEmailVeifyToken,
	generateAccessToken,
} = require('../utils/generateToken');
const sendMail = require('../utils/sendMail');
const { createWallet } = require('../utils/wallet');
const Wallet = require('../models/Wallet');
const QrCode = require('../models/Qrcode');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

const controllers = () => {
	const handleLogin = asyncHandler(async (req, res, next) => {
		const { email, password } = req.body;

		const query = {
			email,
			emailConfirmed: true,
		};

		const user = await User.findOne(query);

		if (!user) {
			return next(new ErrorResponse('invalid email or password', 401));
		}

		// compare passwords
		if (!(await bcrypt.compare(password, user.password))) {
			return next(new ErrorResponse('invalid email or password', 401));
		}

		if (!user.emailConfirmed) {
			return next(new ErrorResponse('Please confirm email address', 401));
		}

		// get user's wallet details
		const walletDetails = await Wallet.findOne({ user_id: user._id }).select(
			'address balance'
		);

		// get user's qrcode if user is a vendor
		let qrcode;
		if (user.type === 'vendor') {
			qrcode = await QrCode.findOne({ wallet_id: walletDetails._id }).select(
				'url qrcode_id wallet_id'
			);
		}

		// generate accessToken
		const token = generateAccessToken(user._id);

		res.cookie('access', token, {
			maxAge: 604800000,
			httpOnly: true,
			sameSite: 'none',
			secure: true,
		});

		const userData = { ...user._doc };
		delete userData.password;
		delete userData.createdAt;

		return res.status(200).json({
			status: true,
			message: 'login successful',
			data: {
				user: userData,
				walletDetails,
				qrcode,
			},
		});
	});

	const handleSignUp = asyncHandler(async (req, res, next) => {
		const { email, password } = req.body;
		const userData = { ...req.body };

		// find user
		const user = await User.findOne({ email });

		if (user) {
			return next(new ErrorResponse('user exists', 400));
		}

		// hash password
		const hashedPassword = await bcrypt.hash(password, 10);
		userData.password = hashedPassword;
		userData.user_id = uuid();

		// create user
		const newUser = await User.create(userData);

		// create user wallet
		const userWallet = await createWallet(newUser._id, newUser.type);

		// TODO: Send user email confirmation link
		const verificationToken = generateEmailVeifyToken(newUser._id);
		const verificationLink = `https://qrwalletpay.netlify.app/verify-email?token=${verificationToken}`;
		sendMail(userData.email, verificationLink);

		return res.status(201).json({
			status: true,
			message: `To complete signup please use the verification link sent to ${newUser.email}`,
			data: {
				user: newUser._id,
				wallet: userWallet,
			},
		});
	});

	const verifyEmail = asyncHandler(async (req, res, next) => {
		const { token } = req.body;

		if (!token) {
			return next(new ErrorResponse('missing or invalid token', 400));
		}

		let payload = {};

		// verify token
		try {
			payload = jwt.verify(token, process.env.TOKEN_SECRET);
		} catch (error) {
			if (error.name === 'TokenExpiredError') {
				return next(new ErrorResponse('Token expired', 400));
			}

			console.log('====================================');
			console.log('TOKEN VERIFY ERR: ', error.message);
			console.log('====================================');
			if (error.message === 'jwt malformed') {
				return next(new ErrorResponse('invalid token', 403));
			}
			return next(new ErrorResponse('An unexpected error occured', 500));
		}

		// find user and update
		const userUpdate = await User.findByIdAndUpdate(
			payload.user_id,
			{
				$set: { emailConfirmed: true },
			},
			{ new: true }
		);

		if (!userUpdate) {
			return next(new ErrorResponse('user does not exist', 422));
		}

		return res.status(200).json({
			status: true,
			message: 'email confirmed successfully',
		});
	});

	const logout = asyncHandler(async (req, res, next) => {
		res.cookie('access', '', {
			maxAge: 0,
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
		});
		return res.status(200).end();
	});

	const getProfile = asyncHandler(async (req, res, next) => {
		const { type, _id } = req.user;

		const wallet = await Wallet.findOne({ user_id: _id });

		const transactions = await Transaction.find({
			wallet_id: wallet._id,
			status: 'successful',
		});

		const account = await Account.findOne({ wallet_id: wallet._id });

		let qrcode;

		if (type === 'vendor') {
			qrcode = await QrCode.findOne({ wallet_id: wallet._id });
		}

		return res.status(200).json({
			status: true,
			data: {
				user: req.user,
				wallet,
				qrcode,
				transactions,
				account,
			},
		});
	});

	return {
		handleLogin,
		handleSignUp,
		verifyEmail,
		getProfile,
		logout,
	};
};

module.exports = controllers();
