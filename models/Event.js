const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, 
    trim: true,
    validate: {
      validator: (value) => value.length > 0,
      message: "Title cannot be an empty string."
    }
  },
  location: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => value.length > 0,
      message: "Location cannot be an empty string."
    }
  },
  details: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => value.length > 0,
      message: "Details cannot be an empty string."
    }
  },
  participants: {
    type: Number,
    required: true,
    validate: {
      validator: (value) => value.toString().length > 0,
      message: "Participants cannot be an empty string."
    }
  },
  availableSpots: {
    type: Number,
    default: 0
  },
  date: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  isJoined: {
    type: Boolean,
    default: false
  },
  ratings: {
    type: [Number],
    default: []
  },
  comments: {
    type: [String],
    default: []
  }

});

module.exports = mongoose.model('Event', eventSchema);
