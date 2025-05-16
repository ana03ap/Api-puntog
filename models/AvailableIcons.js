const mongoose = require('mongoose');

const availableIconSchema = new mongoose.Schema({
  icon: {
    type: String,
    required: true,
    trim: true
  }
});

const AvailableIcon = mongoose.model('AvailableIcon', availableIconSchema);

module.exports = AvailableIcon;