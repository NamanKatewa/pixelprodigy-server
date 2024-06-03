const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config;

const data = require("./routes/data");
const order = require("./routes/order");

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: "Too many requests from this IP, please try again later",
});

const app = express();

app.use(express.json());
app.use(cors());
app.use(limiter);

const port = process.env.PORT || 5000;

app.listen(port, () => console.log("server started"));

app.use("/data", data);
app.use("/order", order);
