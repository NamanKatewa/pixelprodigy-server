const express = require("express");
const cors = require("cors");

const data = require("./routes/data");
const order = require("./routes/order");

const app = express();

app.use(express.json());
app.use(cors());

const port = 5000;

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});

app.use("/data", data);
app.use("/order", order);
