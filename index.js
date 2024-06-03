const express = require("express");
const cors = require("cors");
require("dotenv").config;

const data = require("./routes/data");
const order = require("./routes/order");

const app = express();

app.use(express.json());
app.use(cors());

const port = process.env.PORT || 5000;

app.listen(port, () => console.log("server started"));

app.use("/data", data);
app.use("/order", order);
