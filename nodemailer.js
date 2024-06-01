const nm = require("nodemailer");
require("dotenv").config();

const nodemailer = nm.createTransport({
  service: "gmail",
  secure: false,
  auth: {
    user: `${process.env.EMAIL_ID}`,
    pass: `${process.env.EMAIL_PASS}`,
  },
  debug: false,
  logger: true,
});

module.exports = nodemailer;
