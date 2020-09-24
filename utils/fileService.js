const fs = require('fs')
exports.deleteFile = function(filePath){
    fs.unlink(filePath, err => {
        if (err) {console.log(err)};
        console.log('successfully deleted ' + filePath);
    })
}  