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
const { log } = require("console");
const Booking = require('./Models/Booking')
// dotenv configuration
dotenv.config()

//bcrypt saltfactor
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express()

app.use('/Uploads', express.static(__dirname + '/Uploads'))
//Middlewares
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
// Database connection function called 
ConnectDB()

// register api
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

// login api

  app.post("/login", async (req, res) => {

    const { email, password } = req.body;
    const userDoc = await User.findOne({ email });
    if (userDoc && bcrypt.compareSync(password, userDoc.password)) {
      const token = await  generateToken(userDoc);
      console.log(token);
      res.status(200).json({token,userDoc});
    } else {
      res.status(422).json("Invalid credentials");
    }
  });



app.get("/profile", async (req, res) => {

    const token =  req.headers.authorization?.split(" ")[1];
    try {
      const decode = jwt.verify(token, process.env.JWT_SECRET)
      const userDoc = await User.findById(decode.id)
      if (!userDoc) {
        res.status(404).json("User not found");
      } else {
         res.status(200).json({userDoc})
      }
    } catch (error) {
      res.status(500).json({message:"error msg form catch block"})
    }
   
});

// logout api
let tokenStore = [];

app.post("/logout", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token required" });
  }

  // Invalidate the token (e.g., by removing it from the token store)
  tokenStore = tokenStore.filter((storedToken) => storedToken !== token);

  return res.status(200).json({ message: "Logout successful" });
});

  

// upload by link api
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

//Upload by files api 
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

// post places api
app.post('/places', async(req, res) => {
   const token = req.headers.authorization?.split(" ")[1];
   const { title, address, addedPhotos, description, perks, extraInfo, checkIn, checkOut,price, maxGuests } = req.body;
  try {
       const decode = jwt.verify(token, process.env.JWT_SECRET);
    const placeDoc = await PlaceModel.create({
      owner: decode.id,
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

//  get places api
app.get('/user-places', async(req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = decode
    res.status(200).json( await PlaceModel.find({owner:id})  )
  } catch (error) {
    res.status(500).json({errorMsg:"error msg from catch block"})
  }
})

// places  get id api
app.get('/places/:id',  async(req, res) => {
   const {id}=req.params
res.json( await PlaceModel.findById(id))

})
// put places api 
app.put('/places', async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const {id,title,address,addedPhotos,description,perks,extraInfo,checkIn,checkOut,price,maxGuests,} = req.body;
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const placeDoc = await PlaceModel.findById(id);
    console.log("decode",decode.id);
    console.log("placeDoc",placeDoc.owner.toString());
    if (decode.id === placeDoc.owner.toString()) {
      placeDoc.set({title,address,photos: addedPhotos,description,perks,extraInfo,checkIn,checkOut,maxGuests,price,});
      await placeDoc.save();
      res.status(200).json('ok');
    }
  } catch (error) {
    res.status(500).json("error msg from catch block")
  }
})
// get places api 
app.get('/places', async(req, res) => {
  res.json ( await  PlaceModel.find())
  
})


app.post("/bookings", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
   const decode = jwt.verify(token, process.env.JWT_SECRET);
  const { place, checkIn, checkOut, numberOfGuests, name, phone, price } =
    req.body;
 await Booking.create({
    place,
    checkIn,
    checkOut,
    numberOfGuests,
    name,
    phone,
    price,
    user: decode.id,
  })
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      throw err;
    });
});

app.get('/bookings', async(req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json(await Booking.find({ user: decode.id }).populate('place'));
  } catch (error) {
    res.status(500).json({message:"error msg from booking get api "})
  }
  
})


    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });