// backend/models/User.js
const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema({
    refNo: {type: String},
    name: {type: String},
    picture:{type: String},
    amount:{type: Number},
    date: {type: String},
    status: {type: String},
    belongsto:{type: String}
},{ timestamps: true });

module.exports = mongoose.model("Asset", assetSchema);
