const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  id: Number,
  title: String,
  location: String,
  details: String,
  participants: Number,
  availableSpots: Number,
  date: String,
  path: String,
  type: String,
  isJoined: {
    type: Boolean,
    default: false
  },
  ratings: [Number]
});

module.exports = mongoose.model('Event', eventSchema);