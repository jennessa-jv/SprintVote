const express = require("express");

const {
    signup,
    login
} = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);  
// The frontend doesn't create the backend URL. The backend defines what URL exists, and the frontend calls that URL.
// It's similar to creating a phone number: the backend says "this is the number/path to reach me," and the frontend dials it.
//and the url should be the same
router.post("/login", login); //goes to the controller

module.exports = router;