const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');

// This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
const auth = {
	auth: {
		api_key: process.env.MAILGUN_API_kEY,
		domain: process.env.MAILGUN_DOMAIN,
	},
};

const sendMail = (to, link) => {
	const nodemailerMailgun = nodemailer.createTransport(mg(auth));

	nodemailerMailgun.sendMail(
		{
			from: `Wallet System<${process.env.SENDER_EMAIL}>`,
			to,
			subject: 'Verify Email Address',
			// html: '<b>Wow Big powerful letters</b>',
			text: `To verify your email address please click this link ${link}`,
		},
		(err, info) => {
			if (err) {
				console.log(`Error: ${err}`);
			} else {
				console.log(`Response: ${info}`);
			}
		}
	);
};

module.exports = sendMail;
