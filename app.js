const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const colors = require('colors');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: './config/.env' });
const dbConnect = require('./config/dbConnect');
const v1Routes = require('./routes/index');
const ErrorResponse = require('./utils/errorResponse');
const errorHandler = require('./middleware/errorHandler');

const app = express();

dbConnect();

const port = process.env.PORT || 8080;

// app configuration
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const whitelist = [
	'http://localhost:3000',
	'http://192.168.0.170:3000',
	'https://qrwalletpay.netlify.app',
];

app.use(
	cors({
		origin: function (origin, callback) {
			if (whitelist.indexOf(origin) !== -1 || !origin) {
				callback(null, true);
			} else {
				callback(new Error('Not allowed by CORS'));
			}
		},
		credentials: true,
	})
);
app.use(cookieParser());

if (process.env.NODE_ENV.trim() === 'production') {
	app.use(helmet());
}

// routes
app.use('/api/v1', v1Routes);

app.use('**', (req, res, next) => {
	next(new ErrorResponse('NOT FOUND', 404));
});

app.use(errorHandler);

app.listen(port, () => {
	console.log(`App started on port ${port}`.yellow);
});
