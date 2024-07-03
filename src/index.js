const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const { router } = require("./router");
const { UI_APP_URL } = require("./config");
const app = express();
const port = process.env.PORT || 4000;

mongoose
  .connect(process.env.DB_CONNECTION_STRING)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB", err);
  });

app.use(cors({ origin: UI_APP_URL }));
app.use(express.json());
app.use(router);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
