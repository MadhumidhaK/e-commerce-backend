const mongoose = require('mongoose');

const DB_URI = process.env.DB_URI;

mongoose.connect(DB_URI, { useNewUrlParser: true}).catch(err => {
  console.log(err)
})

const db = mongoose.connection

db.on('error', err => {
    console.log(err);
});

db.once('open', function() {
  console.log("Connection established to DB")
});

module.exports = db;