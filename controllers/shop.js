const { body, validationResult } = require('express-validator');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');

const rpay = new Razorpay({
    key_id: process.env.RPAY_KEY_ID,
    key_secret: process.env.RPAY_KEY_SECRET,
});


exports.addtoCart = [
    body('quantity', "Please enter a valid quantity").isInt(),
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log(req.body)
                    const error = new Error("Validation Error");
                    error.data = errors.array();
                    error.statusCode = 422
                    throw error;
            }
            if(!req.body.product || !req.body.product._id){
                const error = new Error("Please select a valid Product");
                error.statusCode = 404;
                error.code = 820;
                throw error;   
            }
            const user = await User.findById(req.sessionUser.id);
            if(!user){
                const error = new Error("Please log in to add this item to your cart.");
                error.statusCode = 401;
                error.code = 801;
                throw error;
            }
            const product = await Product.findById(req.body.product._id);
            if(!product){
                const error = new Error("No Product found");
                error.statusCode = 404;
                error.code = 821;
                throw error
            }
    
            if(product.availableQuantity < 1){
                const error = new Error("Currently unavailable.");
                error.statusCode = 404
                error.code = 822;
                throw error;
            }

            
            if(product.availableQuantity < req.body.quantity){
                const error = new Error("Only " + product.availableQuantity + " items left in stock.");
                error.statusCode = 404
                error.code = 823;
                throw error;
            }

            const itemInCart = user.cart.items.find(item => item.product.toString() === product._id.toString());
            if(itemInCart){
                const newQuantity = parseInt(itemInCart.quantity) + parseInt(req.body.quantity);
                if(newQuantity > product.availableQuantity){
                    const error = new Error("Only " + product.availableQuantity + " items left in stock.");
                    error.statusCode = 404
                    error.code = 823;
                    throw error;
                }
                itemInCart.quantity = newQuantity;
            }else{
                user.cart.items.push({
                    product: product._id,
                    quantity: req.body.quantity
                })
            }
            
            await (await user.populate('cart.items.product').execPopulate()).populate('cart.items.product.seller', 'brandName').execPopulate();;
            console.log(user.cart.items)
            const total = user.cart.items.reduce((tot, item) => tot + (parseFloat(item.product.price) * parseInt(item.quantity)), 0);
            user.cart.total = total;
            await user.save();
            res.status(200).json({
                cart: user.cart
            })
        } catch (error) {
            next(error)
        }
    }
]


exports.setItemQuantity = [
    body('quantity', "Please enter a valid quantity").isInt(),
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log(req.body)
                    const error = new Error("Validation Error");
                    error.data = errors.array();
                    error.statusCode = 422
                    throw error;
            }
            if(!req.body.product || !req.body.product._id){
                const error = new Error("Please select a valid Product");
                error.statusCode = 404;
                error.code = 820;
                throw error;   
            }
            const user = await User.findById(req.sessionUser.id);
            if(!user){
                const error = new Error("Please log in to add this item to your cart.");
                error.statusCode = 401;
                error.code = 801;
                throw error;
            }
            const product = await Product.findById(req.body.product._id);
            if(!product){
                const error = new Error("No Product found");
                error.statusCode = 404;
                error.code = 821;
                throw error
            }
    
            if(product.availableQuantity < 1){
                const error = new Error("Currently unavailable.");
                error.statusCode = 404
                error.code = 822;
                throw error;
            }

            
            if(product.availableQuantity < req.body.quantity){
                const error = new Error("Only " + product.availableQuantity + " items left in stock.");
                error.statusCode = 404
                error.code = 823;
                throw error;
            }

            const itemInCart = user.cart.items.find(item => item.product.toString() === product._id.toString());
            if(itemInCart){
                const newQuantity = parseInt(req.body.quantity);
                if(newQuantity > product.availableQuantity){
                    const error = new Error("Only " + product.availableQuantity + " items left in stock.");
                    error.statusCode = 404
                    error.code = 823;
                    throw error;
                }
                itemInCart.quantity = newQuantity;
            }else{
                user.cart.items.push({
                    product: product._id,
                    quantity: req.body.quantity
                })
            }
            
            await (await user.populate('cart.items.product').execPopulate()).populate('cart.items.product.seller', 'brandName').execPopulate();;
            console.log(user.cart.items)
            const total = user.cart.items.reduce((tot, item) => tot + (parseFloat(item.product.price) * parseInt(item.quantity)), 0);
            user.cart.total = total;
            await user.save();
            res.status(200).json({
                cart: user.cart
            })
        } catch (error) {
            next(error)
        }
    }
]



exports.reduceQuantity = async (req, res, next) => {
    try {
        if(!req.body.product || !req.body.product._id){
            const error = new Error("Please select a valid item to remove from your cart.");
            error.statusCode = 404;
            error.code = 820;
            throw error;   
        }
        const user = await User.findById(req.sessionUser.id);
        if(!user){
            const error = new Error("Please log in to remove this item from your cart.");
            error.statusCode = 401;
            error.code = 801;
            throw error;
        } 
        
        const product = await Product.findById(req.body.product._id);
        if(!product){
            const error = new Error("No Product found. Please remove this item from your cart");
            error.statusCode = 404;
            error.code = 821;
            throw error
        }
    
        if(product.availableQuantity < 1){
            const error = new Error("Currently this is unavailable. Please remove this item from your cart");
            error.statusCode = 404
            error.code = 822;
            throw error;
        }
        await (await user.populate('cart.items.product').execPopulate()).populate('cart.items.product.seller', 'brandName').execPopulate();;
        let total = 0;
        user.cart.items = user.cart.items.reduce((cartItems, item) => {
            if(item.product._id.toString() === product._id.toString()){
                if(item.quantity !== 1){
                    let newQuantity = item.quantity - 1
                    if(newQuantity > product.availableQuantity){
                        newQuantity = product.availableQuantity;
                    } 
                    item.quantity = newQuantity;
                    total = total + item.quantity * item.product.price;
                    cartItems.push(item);
                }
            }else{
                total = total + item.quantity * item.product.price;
                cartItems.push(item);
            }
            return cartItems;
        }, []);
        user.cart.total = total;
        await user.save();
        return res.status(200).send({
            cart: user.cart
        })
    } catch (error) {
        next(error);
    }   
}

exports.removeItem = async (req, res, next) => {
    try {
        if(!req.body.product || !req.body.product._id){
            const error = new Error("Please select a valid item to remove from your cart.");
            error.statusCode = 404;
            error.code = 820;
            throw error;   
        }
        const user = await User.findById(req.sessionUser.id);
        if(!user){
            const error = new Error("Please log in to remove this item from your cart.");
            error.statusCode = 401;
            error.code = 801;
            throw error;
        } 
    
        user.cart.items = user.cart.items.filter(item => item.product.toString() !== req.body.product._id.toString());
        await (await user.populate('cart.items.product').execPopulate()).populate('cart.items.product.seller', 'brandName').execPopulate();;
        console.log(user.cart.items)
        const total = user.cart.items.reduce((tot, item) => tot + item.product.price * item.quantity, 0);
        user.cart.total = total;
        await user.save();
        return res.status(200).send({
            cart: user.cart
        })
    } catch (error) {
        next(error);
    }   
}

exports.clearCart = async (req, res, next) => {
    try {
        const user = await User.findById(req.sessionUser.id);
        if(!user){
            const error = new Error("Please log in to remove this item from your cart.");
            error.statusCode = 401;
            error.code = 801;
            throw error;
        } 
        user.cart.items = [];
        user.cart.total = 0;
        await user.save();
        return res.status(200).send({
            cart: user.cart
        })
    } catch (error) {
        next(error);
    }   
}

exports.getCart = async (req, res, next) => {
    try {
        const user_id = req.sessionUser.id;
        const user = await User.findById(user_id).populate('cart.items.product').populate('cart.items.product.seller', 'brandName');
        if(!user){
            const error = new Error("Please log in to perform this action.");
            error.statusCode = 401;
            error.code = 801;
            throw error;
        } 
        const total = user.cart.items.reduce((tot, item) => tot + (parseFloat(item.product.price) * parseInt(item.quantity)), 0);  
        user.cart.total = total
        return res.status(200).send({
            cart: user.cart
        })
    } catch (error) {
        next(error)
    }
}

exports.createOrder = async (req, res, next) => {
    try {
        const user_id = req.sessionUser.id;
        const user = await User.findById(user_id,'_id cart email firstName lastName' ).populate('cart.items.product');
        await user.populate('cart.items.product.seller', 'brandName').execPopulate();
        console.log(user);
        if(!user){
            const error = new Error("Please log in to perform this action.");
            error.statusCode = 401;
            error.code = 801;
            throw error;
        } 
        const orderedItems = [];
        const total = user.cart.items.reduce((total, item) => {
            if(item.quantity > item.product.availableQuantity){
                const error = new Error("Available quantity is " + item.product.availableQuantity + " for item " + item.product.name);
                error.statusCode = 404;
                error.code = 823;
                throw error;
            }
            const product = item.product;
            orderedItems.push({
                product:{
                    _id: product.id,
                    name: product.name,
                    price: product.price,
                    brand: product.seller.brandName,
                    productImage: product.productImage
                },
                quantity: item.quantity
            });
            return total + (item.quantity * item.product.price)
        }, 0);
        console.log(orderedItems);
        console.log(total);

        const options = {
            amount: total * 100,  // amount in the smallest currency unit
            currency: "INR",
            receipt: user.firstName + "_" + Date.now(),
            payment_capture: 1,
            notes: {
                totalItems: orderedItems.length
            }
          };
        const orderResponse = await rpay.orders.create(options)
        
        const order = new Order({
            items: orderedItems,
            user: {
                _id: user._id,
                email: user.email,
                name: user.firstName + " " + user.lastName
            },
            total: total,
            isPaid: false,
            orderID: orderResponse.id 
        })

        const createdOrder = await order.save();
        user.cart.items = [];
        user.cart.total = 0;
        await user.save();

        return res.status(200).send({
            _id: createdOrder._id,
            items: orderedItems,
            total: total,
            orderID: orderResponse.id,
            amount: orderResponse.amount,
            currency: orderResponse.currency
        })
    } catch (error) {
        next(error)
    }
}

exports.getOrder = async (req, res, next) => {
   try {
    const user_id = req.sessionUser.id;
    const user = await User.findById(user_id);
    if(!user){
        const error = new Error("Please log in to perform this action.");
        error.statusCode = 401;
        error.code = 801;
        throw error;
    } 
    const {id} = req.params.id;
    const order = await Order.findOne({orderID: id});
    if(!order){
        const error = new Error("No order details found.");
        error.statusCode = 404;
        throw error;
    }
    if(!order.user._id.toString() === user._id.toString()){
        const error = new Error("You not authorized to perform this action.");
        error.statusCode = 401;
        error.code = 801;
        throw error;
    }

    return res.status(200).json({
        ...order
    })
   } catch (error) {
       next(error)
   }
}

exports.verifyPayment = async (req, res, next) => {
    try {
        const secret = process.env.RPAY_WEBHOOK_SECRET;
        console.log(req.body);
        console.log(req.body.payload.payment.entity);
        const shasum = crypto.createHmac('sha256', secret)
        shasum.update(JSON.stringify(req.body))
        const digest = shasum.digest('hex');

        console.log(digest, req.headers['x-razorpay-signature']);
        
        if (digest === req.headers['x-razorpay-signature']) {
            console.log('request is legit')
            if(req.body.payload.payment.entity.captured){
                const order = await Order.findOne({orderID: req.body.payload.payment.entity.order_id});
                order.items.forEach(async item => {
                    const product = await Product.findById(item.product._id);
                    product.availableQuantity = product.availableQuantity - item.quantity;
                    await product.save();
                })
                order.isPaid = true;
                await order.save();
            }
            res.status(200).json({ status: 'ok' });
        } else {
           res.status(200).json({status: "ok"})
        }
        
    } catch (error) {
        next(error)
    }
}


exports.getOrders = async (req, res, next) => {
    try {
        const user_id = req.sessionUser.id;
        const user = await User.findById(user_id);
        if(!user){
            const error = new Error("Please log in to perform this action.");
            error.statusCode = 401;
            error.code = 801;
            throw error;
        }
        const orders = await Order.find({"user._id": user_id}).sort({ createdAt: -1 }).exec();
        if(!orders){
            const error = new Error("No orders found.");
            error.statusCode = 404;
            throw error;
        }
        
    
        return res.status(200).json({
            orders: orders
        })
       } catch (error) {
           next(error)
       }
}