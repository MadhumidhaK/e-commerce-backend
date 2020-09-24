const crypto = require('crypto');


exports.getCryptoToken = async function(){
    const tokenBuffer = crypto.randomBytes(32);
    const token = await tokenBuffer.toString('hex');
    console.log(token)
    return token;
}