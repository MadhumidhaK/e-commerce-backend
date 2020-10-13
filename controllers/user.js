const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const User = require('../models/user');
const { getHashedPassword, comparePassword } = require('../utils/hashingService');
const { getCryptoToken } = require('../utils/cryptoTokenService');
const { transport } = require('../utils/nodeMailerService');
const { getToken } = require('../utils/jwtService');

exports.createUser = [
    body('email', "Please enter a valid email").isEmail(),
    body('password', "Please enter a password with atleast 8 characters").isLength({ min: 8 }).custom((value, { req }) => {
        if(value.toLowerCase().indexOf("password") > -1){
            throw new Error('Your Password should not contain the text password');
        }
        return true;
    }),
    body('confirmPassword').custom((value, { req }) => {
        if(value !== req.body.password){
            throw new Error('Please confirm your password again. Entered passwords didn\'t match.');
        }
        return true;
    }),
    body('firstName', "Please enter a valid first name with minimum 3 characters").isAlpha().isLength({min: 3}),
    body('lastName', "Please enter a valid last name").isAlpha().isLength({min: 1}),
    async (req, res, next) => {
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = new Error("Validation Error");
                error.data = errors.array();
                error.statusCode = 422
                throw error;
            }
            console.log(req.body)
            const { email, password, firstName, lastName } = req.body;
            const existingUser = await User.findOne({ email: email });
            if(existingUser){
                console.log(existingUser);
                const error = new Error("User already exists!");
                error.statusCode = 409;
                throw error;
            }
            const hashedPassword = await getHashedPassword(password);
            const token = await getCryptoToken();
            const newUser = new User({
                email,
                password: hashedPassword,
                firstName,
                lastName,
                verificationToken: token,
                verificationTokenExpiration: Date.now() + 3600000
            });
            const createdUser = await newUser.save();
            let userResponse;
            try{
                const mailSent = await sendVerificationMail(email, token, newUser.firstName);
                if(mailSent.message === 'success' ){
                    userResponse = {
                        message: "User created, Please verify your mail.",
                        mailSent: true
                    }
                }else{
                    throw new Error("Unable to send mail");
                }          
            }catch(error){
                console.log(error)
                userResponse = {
                    message: "User Created, unable to send mail. Please try again",
                    mailSent: false
                }
            }finally{
                res.status(201).send(userResponse)
            }
            console.log(createdUser)
            return;
        }catch(error){
            if(!error.statusCode){
                error.statusCode = 500;
                error.message = "Internal server Error";
            }
            console.log(error);
            next(error);
        }
    }
]

exports.requestEmailVerification = [
    body('email', "Please enter a valid email").isEmail(),
    async function(req, res, next){
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = new Error("Validation Error");
                error.data = errors.array();
                error.statusCode = 422
                throw error;
            }
            const { email }  = req.body;
            const user = await User.findOne({email: email});
            if(!user){
                const error = new Error("No existing user for this e-mail");
                error.statusCode = 404;
                throw error;
            }

            if(user.isActive){
                user.verificationToken= undefined;
                user.verificationTokenExpiration = undefined;
                await user.save();
                const error = new Error("Email is already verified!");
                error.statusCode = 409;
                throw error;
            }else{
                const token = await getCryptoToken();
                user.verificationToken = token,
                user.verificationTokenExpiration = Date.now() + 3600000;
                const updatedUser = await user.save();

                try{
                    const mailSent = await sendVerificationMail(email, token, user.firstName);
                    if(mailSent.message === 'success' ){
                        res.status(200).send({
                            message: "Mail sent, Please verify your mail.",
                            mailSent: true
                        })
                    }else{
                        const error =  new Error("Unable to send mail.");
                        throw error;
                    }          
                }catch(error){
                    console.log(error);
                    error.data ={
                        mailSent: false
                    }
                    if(!error.statusCode){
                        error.statusCode = 500;
                    }
                    next(error);
                }
            }
        }catch(error){
            console.log(error)
            if(!error.statusCode){
                error.statusCode = 500;
            }
            next(error);
        }
    }
]

const sendVerificationMail = async (email, token, name) => {
    const verificationEmail = {
        from: '"Happy Shop" <noreply@happyshop.com>',
        to: email,
        subject: 'Welcome, Please verify your email!',
        html: `
            <h3>Hi ${name},</h3>
            <h3>Welcome to Happy Shop 😊</h3>
            <p><b>Please click <a href='https://happy-shop.netlify.app/verify/${token}' target='_blank'>this</a> link below to verify your email.</b> Link will expire in an hour</p>

            <p>
            Have a Happy shopping.
            <br />Thanks.
            </p>
        `
    }

    return await transport.sendMail(verificationEmail);
}

exports.emailVerification = [
    body('email',  "Please enter a valid email").isEmail(),
    async (req, res, next) => {
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = new Error("Validation Error");
                error.data = errors.array();
                error.statusCode = 422
                throw error;
            }
            const { email, password, token } = req.body;
            const user =  await User.findOne({
                email: email
            });

            if(!user){
                const error = new Error("No existing user for this e-mail");
                error.statusCode = 404;
                throw error;
            }

            const isPasswordMatch  = await comparePassword(password, user.password);
            if(!isPasswordMatch){
                const error = new Error("Entered User ID/ Password does not match");
                error.statusCode = 401;
                throw error;
            }

            if(user.isActive){
                user.verificationToken= undefined;
                user.verificationTokenExpiration = undefined;
                await user.save();
                const error = new Error("Email is already verified! Please Log in to continue.");
                error.statusCode = 409;
                throw error;
            }
           
            if(user.verificationToken === token &&  user.verificationTokenExpiration > Date.now()){
                user.verificationToken= undefined;
                user.verificationTokenExpiration = undefined;
                user.isActive = true;
                const updatedUser = await user.save();
                const jwtToken = await getToken({
                    id: user._id,
                    email: user.email,
                    isSeller: user.isSeller
                });
                await (await user.populate('cart.items.product').execPopulate()).populate('cart.items.product.seller', 'brandName').execPopulate();
                res.cookie('iybqqz_tipqy', jwtToken, { maxAge: 360000, httpOnly: true });
                res.status(200).json({
                    isVerified: "Email is verified successfully",
                    token: jwtToken,
                    user: {
                        email: user.email,
                        isSeller: user.isSeller,
                        brandName: user.brandName,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        brand: user.brand
                    },
                    cart: user.cart
                })
            }

            const error = new Error("Your Verification URL might be expired. Please try again with a new URL.");
            error.statusCode = 410;
            throw error;
        }catch(error){
            console.log(error)
            if(!error.statusCode){
                error.statusCode = 500;
                error.message = "Internal server Error";
            }
            next(error);
        }
    }
]

exports.login = [
    body('email', "Please enter a valid email").isEmail(), 
    body('password', "Please enter valid password").isLength({min: 1}), 
    async (req, res, next) => {
        try{
            console.log("Login action")
            console.log(req.body);
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = new Error("Validation Error");
                error.data = errors.array();
                error.statusCode = 422
                throw error;
            }
            const { email, password } = req.body;
            const user =  await User.findOne({
                email: email
            });
            console.log(user)

            if(!user){
                console.log("user not found")
                const error = new Error("Entered User ID/ Password does not match");
                error.statusCode = 401;
                throw error;
            }

            const isPasswordMatch  = await comparePassword(password, user.password);
            if(isPasswordMatch){
                if(!user.isActive){
                    const error = new Error("Email is not verified. Please verify your email.");
                    error.statusCode = 406;
                    throw error;
                }

                const jwtToken = await getToken({
                    id: user._id,
                    email: user.email,
                    isSeller: user.isSeller
                })
                console.log(jwtToken);
                console.log("..");
                await (await user.populate('cart.items.product').execPopulate()).populate('cart.items.product.seller', 'brandName').execPopulate();;
                res.cookie('iybqqz_tipqy', jwtToken, { maxAge: 360000, httpOnly: true })
                return res.status(200).json({
                    message: "success",
                    token: jwtToken,
                    user: {
                        email: user.email,
                        isSeller: user.isSeller,
                        brandName: user.brandName,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        brand: user.brand
                    },
                    cart: user.cart
                });
                // return res.status(200).json({
                //     message: "success",
                //     token: jwtToken
                // })
            }
            const error = new Error("Entered User ID/ Password does not match");
            error.statusCode = 401;
            throw error;
        }catch(error){
            console.log(error)
            if(!error.statusCode){
                error.statusCode = 500;
                error.message="Internal server error"
            }
            next(error);
        }
    }
]

exports.updateUser = [
    body('firstName', "Please enter a valid first name with minimum 3 characters").isAlpha().isLength({min: 3}),
    body('lastName', "Please enter a valid last name").isAlpha().isLength({min: 1}),
    async (req, res, next) => {
        try {
            if(!req.sessionUser){
                const error = new Error("Please login to complete this action");
                error.statusCode = 401;
                throw error;
            }                
            const user = await User.findOne({email: req.sessionUser.email});
            if(!user){
                const error = new Error("Invalid User");
                error.statusCode = 400;
                throw error;
            }
            const errors = validationResult(req);
            if(!errors.isEmpty()){
                const error = new Error("Validation Error");
                error.data = errors.array();
                error.statusCode = 422
                throw error;
            }
            console.log(user)
            
            if(req.body.isSeller){
                user.isSeller = req.body.isSeller;
                if(req.body.brandName.length < 2){
                    const error = new Error("Brand name should have atleast 2 characters.");
                    error.statusCode = 409;
                    throw error;
                }
                brand = req.body.brandName.toLowerCase().replace(" ", "-");
                const existingBrand = await User.findOne({brand: brand});
                if(existingBrand){
                    console.log(existingBrand);
                    const error = new Error("Brand already exists!");
                    error.statusCode = 409;
                    throw error;
                }
                user.brandName = req.body.brandName;
                user.brand = brand;
            }
            user.firstName = req.body.firstName;
            user.lastName = req.body.lastName;
            user.save();

            return res.status(200).send({
                message: "success",
                user: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isSeller: user.isSeller,
                    brandName: user.brandName
                }
            })
        } catch (error) {
             if(!error.statusCode){
                 error.statusCode = 500;
                 error.message = "Internal Server error";
             }
             next(error);
        }
    }    
]


exports.forgotPassword = [
    body('email', "Please enter a valid email").isEmail(),   
    async (req, res, next) => {
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = new Error("Validation Error");
                error.data = errors.array();
                error.statusCode = 422
                throw error;
            }
            const { email } = req.body;
            const user = await User.findOne({email: email});
            if(!user){
                const error = new Error("No user found.");
                error.statusCode = 404
                throw error;
            }
            const token = await getCryptoToken();
            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000
            await user.save();
            const resetEmail = {
                from: '"Happy Shop" <noreply@happyshop.com>',
                to: email,
                subject: 'Reset Your Password',
                html: `
                    <h3>Hi, ${user.firstName}!</h3>
                    <p><b>Please click <a href='https://happy-shop.netlify.app/reset/${token}' target='_blank'>this</a> link to reset your password.</b> Link will expire in an hour</p>
        
                    <p>
                    Happy Day.  
                    <br />Thanks.
                    </p>
                `
            }
            try{
                const mailSent = await transport.sendMail(resetEmail);
                if(mailSent.message === 'success' ){
                    return res.status(200).send({
                            message: "Mail sent for password reset request",
                            mailSent: true
                    })
                }else{
                    throw new Error("Unable to send mail")
                }
            }catch(error){
                console.log(error)
                if(!error.statusCode){
                    error.statusCode = 500;
                }
                next(error);
            }
        }catch(error){
            console.log(error)
            if(!error.statusCode){
                error.statusCode = 500;
            }
            next(error);
        }
    }   
]



exports.resetPassword= [
    body('email', "Please enter a valid email").isEmail(),
    body('password' , "Please enter a password with atleast 8 characters").isLength({ min: 8 }).custom((value, { req }) => {

        if(value.toLowerCase().indexOf("password") > -1 ){
            throw new Error('Your Password should not contain the text password');
        }
        return true;
    }),
    body('confirmPassword').isLength({ min: 8 }).custom((value, { req }) => {
        if(value !== req.body.password){
            throw new Error('Please confirm your password again. Entered passwords didn\'t match.');
        }
        return true;
    }),
    async (req, res, next) => {
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = new Error("Validation Error");
                error.data = errors.array();
                error.statusCode = 422
                throw error;
            }
            const { email, password, token } = req.body;
            const user =  await User.findOne({
                email: email
            });

            if(!user){
                const error = new Error("No user found with the entered email.");
                error.statusCode = 404;
                throw error;
            }

            if(user.resetToken === token &&  user.resetTokenExpiration > Date.now()){
                const hashedPassword = await getHashedPassword(password);
                user.password = hashedPassword;
                user.resetToken= undefined;
                user.resetTokenExpiration = undefined;
                await user.save();
                if(!user.isActive){
                    const error = new Error("Email is not verified. Please verify your email.");
                    error.data = {
                        message: "Your password is changed successfully."
                    }
                    error.statusCode = 406;
                    throw error;
                }
                const jwtToken = await getToken({
                    id: user._id,
                    email: user.email,
                    isSeller: user.isSeller
                })
                console.log(jwtToken);
                await (await user.populate('cart.items.product').execPopulate()).populate('cart.items.product.seller', 'brandName').execPopulate();;
                console.log("..");
                // res.cookie('gwlhi12njfb', jwtToken, { maxAge: 360000, httpOnly: true })
                return res.status(200).json({
                    message: "success",
                    token: jwtToken,
                    user: {
                        email: user.email,
                        isSeller: user.isSeller,
                        brandName: user.brandName,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        brand: user.brand
                    },
                    cart: user.cart
                })
            }

            const error = new Error("Your reset request URL might be expired. Please try again with a new request.");
            error.statusCode = 410;
            throw error;

        }catch(error){
            console.log(error)
            if(!error.statusCode){
                error.statusCode = 500;
            }
            next(error);
        }
    }
]

exports.logout = (req, res, next) => {
    res.clearCookie('gwlhi12njfb');
    return res.status(200).send({
        message: "Logged out"
    });
}



exports.isLoggedIn = (req, res, next) => {
    try{
        if(req.sessionUser){
           return res.status(200).send({
                isLoggedIn: true
            })
        }
        const error = new Error("Unauthorized");
        error.statusCode = 401;
        throw error;
    }catch(error){
        console.log(error)
        if(!error.statusCode){
            error.statusCode = 500;
        }
        next(error);
    }
}


exports.getUserData = async (req, res, next) => {
    try{
        if(req.sessionUser){

            const user = await User.findOne({email: req.sessionUser.email});
            await (await user.populate('cart.items.product').execPopulate()).populate('cart.items.product.seller', 'brandName').execPopulate();
            if(user){
                return res.status(200).send({
                    isLoggedIn: true,
                    user: {
                        email: user.email,
                        isSeller: user.isSeller,
                        brandName: user.brandName,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        brand: user.brand
                    },
                    cart: user.cart
                })
            }
            
        }
        const error = new Error("Unauthorized");
        error.statusCode = 401;
        throw error;
    }catch(error){
        console.log(error)
        if(!error.statusCode){
            error.statusCode = 500;
        }
        next(error);
    }
}