const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const userSchema = new Schema({
	user_id: {
		type: String,
		required: true,
	},
	firstName: {
		type: String,
		required: true,
		max: 100,
	},
	lastName: {
		type: String,
		required: true,
		max: 100,
	},
	email: {
		type: String,
		required: true,
		match:
			/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
		unique: true,
	},
	emailConfirmed: {
		type: Boolean,
		required: true,
		default: false,
	},
	password: {
		type: String,
		required: true,
	},
	type: {
		type: String,
		enum: ['customer', 'vendor'],
		required: true,
	},
	vendorName: String,
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const User = model('User', userSchema);

module.exports = User;
