const express = require('express');
const shop = require('../controllers/shop');
const { isAuth } = require('../middleware/isAuth');

const route = express.Router();

route.post('/cart/add',isAuth , shop.addtoCart);
route.post('/cart/setqty',isAuth , shop.setItemQuantity);
route.post('/cart/reduce', isAuth, shop.reduceQuantity);
route.post('/cart/remove', isAuth, shop.removeItem);
route.post('/cart/clear', isAuth, shop.clearCart);
route.get('/cart/get',  isAuth, shop.getCart);
route.post('/cart/order',isAuth, shop.createOrder );
route.post('/verifypayment', shop.verifyPayment);
route.get('/order/:id', isAuth, shop.getOrder);
route.get('/orders', isAuth ,shop.getOrders);


module.exports = route;