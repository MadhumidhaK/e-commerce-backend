const mongoose = require('mongoose');

const { Schema, model} = mongoose

const orderSchema = new Schema({
    items: [
        {
            product: {
                _id: {
                    type: Schema.Types.ObjectId,
                    required: true
                },
                name: {
                    type: String,
                    required: true
                },
                price: {
                    type: Number,
                    required: true
                },
                brand: {
                    type: String,
                    required: true
                },
                productImage: {
                    type: String,
                    required: true
                }
            },
            quantity: {
                type: Number,
                required: true
            }
        }
    ],

    user: {
        _id: {
            type: Schema.Types.ObjectId,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        name:{
            type: String,
            required: true
        }
    },

    total: {
        type: Number,
        required: true
    },
    isPaid:{
        type: Boolean,
        required: true
    },
    orderID: {
        type: String,
        required:true,
        unique: true
    },
    expire_at: {
        type: Date,
        default: Date.now,
        expires: 2592000
    }
}, {
    timestamps: true
})


const Order = model("Order", orderSchema);

module.exports = Order;