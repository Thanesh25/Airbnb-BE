const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const ConnectDB = require("./Utils/Database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./Models/User");
const mongoose = require('mongoose')
const multer = require('multer');
const imageDownloader = require('image-downloader')
const generateToken = require("./Utils/Jwt-Uitls");
const fs = require('fs')
const PlaceModel = require('./Models/Places')
// const path = require("path");
dotenv.config()

 const bcryptSalt = bcrypt.genSaltSync(10);
const app = express()
app.use('/Uploads',express.static(__dirname+'/Uploads'))
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
ConnectDB()

  app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    try {
      const userDoc = await User.create({
        name,
        email,
        password: bcrypt.hashSync(password, bcryptSalt),
      });
      res.json(userDoc);
    } catch (e) {
      res.status(422).json(e);
    }
  });




  app.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const userDoc = await User.findOne({ email });

      if (!userDoc) {
        return res.status(422).json("Invalid credentials");
      }

      if (!userDoc.password) {
        return res.status(500).json("User password not set.");
      }

      const isPasswordCorrect = bcrypt.compareSync(password, userDoc.password);

      if (isPasswordCorrect) {
        const token = generateToken(userDoc);
     
        res.status(200).json({ userDoc, token });
      } else {
        res.status(422).json("Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error.message);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });


  // app.post("/login", async (req, res) => {

  //   const { email, password } = req.body;
  //   const userDoc = await User.findOne({ email });
  //   if (userDoc && bcrypt.compareSync(password, userDoc.password)) {
  //     const token =  generateToken(userDoc);
  //     res.status(200).json({userDoc,token});
  //   } else {
  //     res.status(422).json("Invalid credentials");
  //   }
  // });


//  app.get("/profile", (req, res) => {
   
//    const { token } = req.cookies.token;
//    if (token) {
//      jwt.verify(token, jwtSecret, {}, async (err, userData) => {
//        if (err) throw err;
//        const { name, email, _id } = await User.findById(userData.id);
//        res.json({ name, email, _id });
//      });
//    } else {
//      res.json(null);
//    }
//  });

  app.post("/logout", (req, res) => {
    res.cookie("token", "").json(true);
  });
// console.log({__dirname});
app.post("/upload-by-link", async (req, res) => {
  const { link } = req.body;
  const newName = 'Photo' + Date.now() + ".jpg";
    // const destPath = path.join(__dirname, "Uploads", newName);
  await imageDownloader.image({
    url: link,
    dest:__dirname+"/Uploads/"+newName
  })
  res.json(newName);
});

const photoMiddleware = multer({ dest: 'Uploads/' });
app.post('/upload', photoMiddleware.array('photos', 100), (req, res) => {
  const uploadedFiles =[]
  for (let i = 0; i < req.files.length; i ++){
    const { path, originalname } = req.files[i];
    const parts = originalname.split('.');
    const ext = parts[parts.length-1]
    const newPath = path + '.' +ext;
    fs.renameSync(path, newPath)
    uploadedFiles.push(newPath.replace('Uploads/', ''));
  }
  res.json(uploadedFiles);
  
})

app.post('/places', async(req, res) => {
  
    try {
      // const { id } = req.userData;
      const { title, address, addedPhotos, description, perks, extraInfo, checkIn, checkOut,price, maxGuests } = req.body;

      const placeDoc = await PlaceModel.create({
        title,
        address,
        photos: addedPhotos,
        description,
        perks,
        extraInfo,
        checkIn,
        checkOut,
        maxGuests,
        price,
    
      });

      res.status(201).json(placeDoc);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  
})
// get all places 
app.get('/places', async(req, res) => {
   
    try {
      const places = await PlaceModel.find();
      res.status(200).json(places);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  
})

app.get('/places/:id', async(req, res) => {

  try {
    const place = await PlaceModel.findById(req.params.id);
    place
      ? res.status(200).json(place)
      : res.status(404).json({ message: "Place not found" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
    
  }
})

    //get places
    // app.get('/places', async (req, res) => {
    //   const { token } = req.token
    //   jwt.verify(token, process.env.JWT_SECRET, {}, async (err, userData) => {

    //     const { id } = userData;
    //     res.json(awaitPlaces.find({owner:id}));
    //   })

    // })

    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });