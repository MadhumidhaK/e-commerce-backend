const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');

const sgOptions = {
    auth : {
        api_key: process.env.MAIL_API_KEY
    }
}

exports.transport = nodemailer.createTransport(sgTransport(sgOptions));