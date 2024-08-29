const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config()

const ConnectDB = async () => {
  try {
    const connection = await mongoose.connect(
      process.env.mongoDBConnectionString
    );
    console.log("MongoDB connected ");
    return connection;
  } catch (error) {
    console.log("not connected");
  }
};

module.exports = ConnectDB;
