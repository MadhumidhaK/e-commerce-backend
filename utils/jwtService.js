const jwt = require('jsonwebtoken');

const signOptions = {
    issuer: "shop",
    expiresIn: "12h"
}

const jwtKey = process.env.jwt_key;

exports.getToken = (payload) => {
    const token = jwt.sign(payload, jwtKey, signOptions);

    return token;
}

exports.verifyToken = (token) => {
    try {
        const jwtData = jwt.verify(token, jwtKey, signOptions);
        return jwtData;
    } catch (error) {
        console.log(error);
        return false;
    }
}