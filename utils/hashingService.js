const bcrypt = require('bcrypt');

const saltRounds = 10;

exports.getHashedPassword = (plainTextPassword) => {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(saltRounds, function(err, salt) {
            if(err){
                reject(err)
            }
            bcrypt.hash(plainTextPassword, salt, function(err, hashedPassword) {
                if(err){
                    console.log(err)
                    reject(err);
                }
                console.log("..")
                resolve(hashedPassword)
            });
        });
    })
}

exports.comparePassword = (plainTextPassword, hashedPassword) => {
   return new Promise((resolve, reject) => {
            bcrypt.compare(plainTextPassword, hashedPassword, function(err, result) {
                if(err){
                    reject(err);
                }
                resolve(result);
            });
   })
}


// this.getHashedPassword("sample").then(console.log)
// this.comparePassword("sample", "$2b$10$TJQTmQgCUerF2wDN2Itto.v8MJdlOJJ/wRSDjCbpOay/jbWRRBS/m").then(console.log);
// this.comparePassword("sampled", "$2b$10$TJQTmQgCUerF2wDN2Itto.v8MJdlOJJ/wRSDjCbpOay/jbWRRBS/m").then(console.log);
