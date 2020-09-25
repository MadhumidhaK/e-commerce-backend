const express = require('express');

const product = require('../controllers/product');
const { isAuth } = require('../middleware/isAuth');

const route = express.Router();


route.post('/add',isAuth , product.addProduct);
route.get('/products', product.getProducts);
route.get('/brand/:brand', product.getSellersProducts);
route.get('/category/:name', product.getCategoryProducts);
route.get('/categories', product.getCategories);
route.get('/categorieslist', product.getCategoriesList);
route.put("/updateimage/:id", isAuth, product.updateImage);
route.put("/update/:id", isAuth, product.updateProduct);
route.delete("/delete/:id", isAuth, product.deleteProduct);
route.get("/p/:id", product.getProduct);




module.exports = route;