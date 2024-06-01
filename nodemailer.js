const nm = require("nodemailer");
require("dotenv").config();

const nodemailer = nm.createTransport({
  service: "gmail",
  secure: false,
  auth: {
    user: "namankatewa@gmail.com",
    pass: "shax fwoa qmqu jopb",
  },
  debug: false,
  logger: true,
});

module.exports = nodemailer;
