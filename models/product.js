const mongoose = require('mongoose');

const { Schema, model } = mongoose; 

const productSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    availableQuantity: {
        type: Number,
        required: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    seller: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    productImage: {
        type: String,
        required:true
    }
});

const Product = model('Product', productSchema);

module.exports = Product;