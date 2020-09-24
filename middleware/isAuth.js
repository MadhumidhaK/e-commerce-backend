const { verifyToken } = require("../utils/jwtService");

exports.isAuth = (req, res, next) => {
        const token = req.header('Authorization');
        const jwtData = verifyToken(token);
        if(jwtData){
            req.sessionUser = jwtData
            return  next();
        }
        const error = new Error("User should be logged in to perform this action");
        error.statusCode = 401;
        next(error);        
}