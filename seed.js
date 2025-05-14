require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');
const Version = require('./models/Version');
const events = require('./eventsArray.json');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await Event.deleteMany();
    await Version.deleteMany();
    await Event.insertMany(events);
    await new Version({ key: 'eventsVersion', value: 3 }).save();
    console.log('Events and version inserted');
    process.exit();
  })
  .catch(err => console.error(err));
