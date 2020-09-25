const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const userSchema = new Schema({
    email: {
        type: String,
        lowercase:true,
        required: true,
        unique:true
    },
    isActive: {
        type:Boolean,
        required: true,
        default: false
    },
    firstName: {
        type: String,
        required: true,
        unique: true
    },
    lastName: {
        type: String,
        required: true
    },
    isSeller: {
        type: Boolean,
        default: false,
        required: true
    },
    brandName: {
        type: String
    },
    brand: {
        type: String
    },
    password:{
        type: String,
        required: true
    },
    cart: {
        items: [
            {
               product: {
                   type: Schema.Types.ObjectId,
                   ref: 'Product',
                   required: true
               },
               quantity: {
                   type: Number,
                   required: true
               }
            }
        ],
        total: {
            type: Number,
            required: true,
            default:0
        }
    },
    resetToken: String,
    resetTokenExpiration: Date,
    verificationToken: String,
    verificationTokenExpiration: Date
});


const User = mongoose.model('User', userSchema)

module.exports = User;