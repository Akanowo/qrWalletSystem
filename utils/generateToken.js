const jwt = require('jsonwebtoken');

/**
 *
 * @param {string} user_id
 */
const generateEmailVeifyToken = (user_id) => {
	const payload = { user_id };
	const token = jwt.sign(payload, process.env.TOKEN_SECRET, {
		expiresIn: '10m',
	});
	return token;
};

const generateAccessToken = (user_id) => {
	const payload = { user_id };
	const token = jwt.sign(payload, process.env.TOKEN_SECRET, {
		expiresIn: '7d',
	});
	return token;
};

module.exports = { generateEmailVeifyToken, generateAccessToken };
