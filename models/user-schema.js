const mongoose = require("mongoose");
const uniqueValidaor = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minLength: 6 },
  image: { type: String, required: true },
  places: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Place' }]   // add relation with Places
});

userSchema.plugin(uniqueValidaor);

module.exports = mongoose.model('User', userSchema);
