const Category = require('../models/category');

const categories = ["Electronics", "Fashion", "Home", "Baby Products", "Sports" ];


async function savec(){
    try {
       await Category.create([{ name: "Electronics"}, { name: "Fashion"}, {name: "Home"}, {name : "Baby Products"}, { name: "Sports"}])
    } catch (error) {
        console.log(error)
    }
}
savec()
