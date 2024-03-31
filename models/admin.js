// backend/models/User.js
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email:    {type: String, required: true},
  password: { type: String, required: true },
  role: { type: String, default:'admin', required: true },
  department: { type: String },
  status: { type: String, default: 'offline' },
  profilePicture: { type: String },
  token: {type: String},
  requestedAssets:[{
    assetId: {type: String},
    borrowedAt: { type: Date },
    image:{type: String},
    assetRefno:{type:Number},
    assetName:{type:String},
    returnWithin: { type: Date },
    assetStatus: { type: String },
    isReaded: {type: Boolean}
  }],
  borrowedAssets: [{
    assetId: {type: String},
    image:{type: String},
    assetName:{type:String},
    assetRefno:{type:Number},
    assetBelongsto:{type:String},
    assetAmount:{type:Number},
    borrowedAt: { type: Date },
    returnWithin: { type: Date },
    assetStatus: {type: String},
    extensionRequested: { type: Boolean, default: false }, // Indicates if extension has been requested
    extensionReason: { type: String }, 
    extensionDuration: { type: Date },
    extensionStatus: {type: String },
    isReaded: {type: Boolean}
  }],
  notifiHistory:[{
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    assetStatus: {type: String},
  }]
});

module.exports = mongoose.model("Admin", adminSchema);
