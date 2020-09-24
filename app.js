require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require("cors");
const path = require('path');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');

const db = require('./config/dbConfig');
const userRoute = require('./routes/userRoute');
const productRoute = require('./routes/productRoute');
const shopRoute = require('./routes/shopRoute');
const { verifyToken } = require('./utils/jwtService');

const app = express();

const port = 8080;
app.use(helmet());

// app.use(cors());
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || "*");
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
  });

app.use(bodyParser.json());
app.use(cookieParser());
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/uploads',express.static('uploads'));
app.use('/api/categories',express.static('categories'));

app.use("/api/user", userRoute);
app.use("/api/product", productRoute);
app.use("/api/shop", shopRoute);

app.use("/api", (req, res)=> {
    console.log("received a request")
    res.status(200).send({
        name: "Happy Shop"
    })
})

app.use(function (err, req, res, next) {
    console.error(err.stack);
    if(err instanceof multer.MulterError){
         err.statusCode = 406;
    }
    const status = err.statusCode ? err.statusCode : 500;
    if(status === 500){
        err.message = "Internal Server error";
    }
    return res.status(status).send({
        error: err.message || "Internal Server error",
        code: err.code ? err.code : null,        
        data: err.data ? err.data : null
    })
})

app.listen(process.env.PORT || port, ()=> {
    console.log("Server is listening ");
})  