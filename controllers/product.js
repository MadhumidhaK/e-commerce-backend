const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');


const Product = require('../models/product');
const User = require('../models/user');
const Category = require('../models/category');
const { deleteFile } = require('../utils/fileService');

const ITEMS_PER_PAGE = 3;


aws.config.update({ 
        secretAccessKey: process.env.AWS_SECRET_KEY,
        accessKeyId: process.env.AWS_KEY_ID,
        region: 'us-east-2' // region of your bucket
    });
    
const s3 = new aws.S3();

const storage = multer.memoryStorage();
// multerS3({
//         s3: s3,
//         bucket: 'happyshop',
//         key: function (req, file, cb) {
//             console.log(file);
//             cb(null, Date.now() + file.originalname); //use Date.now() for unique file keys
//         }
//     })

const checkFileType = function(req, file, cb){
        if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png'){
                cb(null, true);
        }
        else{
                const error = new Error("File format should be jpeg / jpg / png.");
                error.statusCode = 406;
                cb(error, false);
        }
}
var upload = multer({ storage: storage, limits: { fileSize: 1024 * 1024 * 2}, fileFilter: checkFileType });

exports.addProduct = [
        upload.single('productImage'),
        body('name', "Please enter a valid product name.").isLength({ min: 3}),
        body('availableQuantity', "Please enter a valid quantity").isInt().custom(value => {
                if(value < 1){
                        throw new Error('Quantity should be atleast 1.');
                }
                return true;
        }),
        body('category', "Please select a valid category.").isLength({ min: 1}),
        body('price', "Please enter a valid price.").isDecimal().custom(value => {
                if(value < 1){
                        throw new Error('Please enter a valid price.');
                }
                return true;
        }),
        body('description', "Please enter a description of atleast 8 characters.").isLength({ min: 8}),
        async function(req, res, next){
                try{    console.log(' Add Product')
                        const errors = validationResult(req);
                        if (!errors.isEmpty()) {
                                const error = new Error("Validation Error");
                                error.data = errors.array();
                                error.statusCode = 422
                                throw error;
                        }
                        const seller = await User.findOne({ email: req.sessionUser.email });
                        if(!seller){
                                const error = new Error("User Shoud be logged in to perform this action. Please login.");
                                error.statusCode = 401;
                                throw error; 
                        }
                        console.log(seller)
                        if(!seller.isSeller){
                                const error = new Error("You are not registered as a seller. Please register as a seller to continue.");
                                error.statusCode = 403;
                                throw error;
                        }

                        const categoryObject = await Category.findById(req.body.category);
                        if(!categoryObject){
                                const error = new Error("Validation Error");
                                error.data = [{
                                        param: "category",
                                        msg: "Please select a valid category"
                                }];
                                error.statusCode = 422
                                throw error;
                        }
                        console.log(req.file)
                        var params = {
                                ACL: 'public-read',
                                Bucket:'happyshop',
                                Body: req.file.buffer,
                                Key: `uploads/${req.file.originalname + Date.now()}`
                              };
                        s3.upload(params, async function(err, data){
                                if(err){
                                        console.log(err)
                                        const error = new Error("Error while uploading image");
                                        error.statusCode = 406;
                                        return next( error);
                                }
                                if(data){
                                        console.log("s3file");
                                        console.log(data);
                                        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>.");
                                        const locationUrl = data.Location;
                                        const newProduct = new Product({
                                                name: req.body.name,
                                                availableQuantity: req.body.availableQuantity,
                                                category: req.body.category,
                                                price: req.body.price,
                                                description: req.body.description,
                                                seller: seller._id,
                                                productImage: locationUrl
                                        });
                                        const createdProduct = await newProduct.save();
                                        console.log(createdProduct);
                                        res.status(201).json({
                                                id: createdProduct._id,
                                                name: createdProduct.name,
                                                availableQuantity: createdProduct.availableQuantity,
                                                category: createdProduct.category,
                                                price: createdProduct.price,
                                                description: createdProduct.description,
                                                seller: createdProduct.seller,
                                                productImage: createdProduct.productImage
                                        })
                                }
                                
                        });
                }catch(error){
                        next(error);
                }
        }
]


exports.getProducts = async (req, res, next) => {
        try {
                let page = req.query.page;
                
                
                if(page < 1){
                        page = 1;
                }

                let totalItems = await Product.countDocuments({});
                if(totalItems < 1){
                        const error = new Error("No Products Found");
                        error.statusCode = 404;
                        throw error; 
                 }
                let pagesCount = Math.ceil(totalItems/ITEMS_PER_PAGE);
                if(page > pagesCount){
                        page = pagesCount;
                }
                const products = await Product.find({availableQuantity: {$gt : 0}})
                                        .skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE)
                                        .populate('seller', '_id brandName brand').populate('category');  
                res.status(200).json({
                        products: products,
                        pagesCount: pagesCount
                })
        } catch (error) {
                next(error)
        }       
}


exports.getSellersProducts = async (req, res, next) => {
        try {
                const brand = req.params.brand;
                const seller = await User.findOne({ brand: brand});
                console.log(seller)
                if(!seller || !seller.isSeller){
                        const error = new Error("No Seller found!");
                        error.statusCode = 404;
                        throw error;
                }
                let page = req.query.page;
                
                
                if(page < 1){
                        page = 1;
                }

                let totalItems = await Product.countDocuments({ seller: seller._id});
                if(totalItems < 1){
                        const error = new Error("No Products Found");
                        error.statusCode = 404;
                        throw error; 
                 }
                let pagesCount = Math.ceil(totalItems/ITEMS_PER_PAGE);
                if(page > pagesCount){
                        page = pagesCount;
                }
                const sellersProducts  = await Product.find({ seller: seller._id })
                                                .skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE)
                                                .populate('seller', '_id brandName brand').populate('category');
                res.status(200).json({
                        products: sellersProducts,
                        pagesCount: pagesCount
                })
        } catch (error) {
                next(error)
        }
}



exports.getCategoryProducts = async (req, res, next) => {
        try {
                const name = req.params.name;
                const category = await Category.findOne({name: name});
                console.log(category)
                if(!category){
                        const error = new Error("No Category found!");
                        error.statusCode = 404;
                        throw error;
                }
                let page = req.query.page;
                if(page < 1){
                        page = 1;
                }
                let totalItems = await Product.countDocuments({ category: category._id });
                if(totalItems < 1){
                       const error = new Error("No Products Found");
                       error.statusCode = 404;
                       throw error; 
                }
                let pagesCount = Math.ceil(totalItems/ITEMS_PER_PAGE);
                if(page > pagesCount){
                        page = pagesCount;
                }
                

                const categoryProducts  = await Product.find({ category: category._id })
                                                .skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE)
                                                .populate('seller', '_id brandName brand').populate('category');
                res.status(200).json({
                        products: categoryProducts,
                        pagesCount: pagesCount
                })
        } catch (error) {
                next(error)
        }
}

exports.getCategories = async (req, res, next) => {
        try {
                const categories = await Category.find({});

                return res.status(200).json({
                        categories: categories
                })
                
        } catch (error) {
                next(error);
        }
}

exports.getCategoriesList = async (req, res, next) => {
        try {
                const categories = await Category.find({}).select('_id title name').exec();

                return res.status(200).json({
                        categories: categories
                })
                
        } catch (error) {
                next(error);
        }
}

exports.getProduct = async (req, res, next) => {
        try{
                const product_id = req.params.id;
                const product = await Product.findById(product_id).populate('seller', '_id brandName brand').populate('category');
                if(!product){
                        const error = new Error("No Product found!");
                        error.statusCode = 404;
                        throw error; 
                }
                res.status(200).json({
                        product: product
                })
        }catch(error){
                next(error)
        }
}


exports.updateProduct =[
        body('name', "Please enter a valid product name.").isLength({ min: 3}),
        body('availableQuantity', "Please enter a valid quantity").isInt(),
        body('category').isLength({ min: 1}),
        body('price', "Please enter a valid price").isDecimal(),
        body('description', "Please enter a description of atleast 8 characters.").isLength({ min: 8}),
        async (req, res, next) => {
                try {
                        console.log(req.body);
                        const errors = validationResult(req);
                        if (!errors.isEmpty()) {
                                const error = new Error("Validation Error");
                                error.data = errors.array();
                                error.statusCode = 422
                                throw error;
                        }
                        const product_id = req.params.id;
                        const seller_id = req.sessionUser.id;
                        const seller = await User.findById(seller_id);
                        if(!seller){
                                const error = new Error("No seller found");
                                error.statusCode = 401;
                                throw error; 
                        }
                        if(!seller.isSeller){
                                const error = new Error("You are not registered as a seller. Please register as a seller to continue.");
                                error.statusCode = 403;
                                throw error; 
                        }
                        const product = await Product.findById(product_id);
                        if(!product){
                                const error = new Error("No Product found");
                                error.statusCode = 404;
                                throw error; 
                        }
                        if(product.seller.toString() !== seller._id.toString()){
                                const error = new Error("You are not authorized to edit this product.");
                                error.statusCode = 403;
                                throw error;
                        }
                        const categoryObject = await Category.findById(req.body.category);
                        if(!categoryObject){
                                const error = new Error("Validation Error");
                                error.data = [{
                                        param: "category",
                                        msg: "Please select a valid category"
                                }];
                                error.statusCode = 422
                                throw error;
                        }
                        product.name = req.body.name;
                        product.availableQuantity = req.body.availableQuantity;
                        product.category = req.body.category;
                        product.price = req.body.price;
                        product.description = req.body.description;
                        await product.save();

                        return res.status(200).json({
                                product: product
                        })
                                
                } catch (error) {
                        next(error)
                }
        }
]

exports.updateImage = [upload.single('productImage') , 
        async function(req, res, next){
                try {
                        const product_id = req.params.id;
                        const seller_id = req.sessionUser.id;
                        const seller = await User.findById(seller_id);
                        if(!seller){
                                const error = new Error("No seller found");
                                error.statusCode = 401;
                                throw error; 
                        }
                        if(!seller.isSeller){
                                const error = new Error("You are not registered as a seller. Please register as a seller to continue.");
                                error.statusCode = 403;
                                throw error; 
                        }
                        const product = await Product.findById(product_id);
                        if(!product){
                                const error = new Error("No Product found");
                                error.statusCode = 404;
                                throw error; 
                        }
                        if(product.seller.toString() !== seller._id.toString()){
                                const error = new Error("You are not authorized to edit this product.");
                                error.statusCode = 403;
                                throw error;
                        }    
                        
                        if(!req.file){
                                const error = new Error("Please upload an Image");
                                error.statusCode = 406;
                                throw error;
                        }
                        console.log(product)
                        // deleteFile(product.productImage);
                        product.productImage = req.file.path;
                        await product.save();
                        await (await product.populate('seller', '_id brandName brand').execPopulate()).populate('category').execPopulate()
                        console.log(product)

                        return res.status(200).json({
                                product: product
                        })
                } catch (error) {
                        next(error);                
                }
        }
]       

exports.deleteProduct = async function(req, res, next){
                try {
                        const product_id = req.params.id;
                        const seller_id = req.sessionUser.id;
                        const seller = await User.findById(seller_id);
                        if(!seller){
                                const error = new Error("No seller found");
                                error.statusCode = 401;
                                throw error; 
                        }
                        if(!seller.isSeller){
                                const error = new Error("You are not registered as a seller. Please register as a seller to continue.");
                                error.statusCode = 403;
                                throw error; 
                        }
                        const product = await Product.findOneAndRemove({_id: product_id, seller: seller._id});
                        if(!product){
                                const error = new Error("No Product found");
                                error.statusCode = 404;
                                throw error; 
                        }   
                        
                        console.log(product)

                        return res.status(200).json({
                                success: true
                        })
                } catch (error) {
                        next(error);                
                }
        }