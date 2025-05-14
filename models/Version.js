const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: Number
});

module.exports = mongoose.model('Version', versionSchema);