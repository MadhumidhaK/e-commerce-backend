const express = require('express');

const user = require('../controllers/user');
const { isAuth } = require('../middleware/isAuth');

const route = express.Router();

route.post("/signup", user.createUser);
route.post("/verifyemail", user.emailVerification);
route.post("/login", user.login);
route.post("/update", isAuth, user.updateUser);
route.post("/requestverifyemail", user.requestEmailVerification);
route.post("/forgotpassword", user.forgotPassword);
route.post("/resetpassword", user.resetPassword);
route.get("/logout", user.logout);
route.get("/verifytoken", isAuth ,user.getUserData);



module.exports = route;
