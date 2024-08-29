const jwt = require("jsonwebtoken");
const dotenv = require('dotenv')
dotenv.config()

const generateToken = async (userDoc) => {
  try {
    const token =  jwt.sign({ id: userDoc._id },process.env.JWT_SECRET , {
      expiresIn: "1h",
    });
 ; // Log the token to verify
    return token;
  } catch (error) {
    console.error("Token generation failed:", error);
    throw error;
  }
};




module.exports = generateToken;
