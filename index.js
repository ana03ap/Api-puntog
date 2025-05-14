
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Event = require('./models/Event');
const Version = require('./models/Version');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

app.get('/events', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.post('/subscribe/:id', async (req, res) => {
  try {
    const event = await Event.findOne({ id: parseInt(req.params.id) });
    if (event && event.availableSpots > 0) {
      event.availableSpots--;
      await event.save();
      res.json({ message: 'Successfully subscribed!', event });
    } else {
      res.status(400).json({ error: 'No spots available or event not found.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error subscribing to event' });
  }
});

app.post('/feedback/:id', async (req, res) => {
  try {
    const event = await Event.findOne({ id: parseInt(req.params.id) });
    const { rating } = req.body;

    if (!event) return res.status(404).json({ error: 'Event not found' });

    event.ratings.push(rating);
    await event.save();

    res.json({ message: 'Rating submitted!', ratings: event.ratings });
  } catch (error) {
    res.status(500).json({ error: 'Error submitting rating' });
  }
});

app.post('/events', async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    await newEvent.save();

    let version = await Version.findOne({ key: 'eventsVersion' });
    if (!version) {
      version = new Version({ key: 'eventsVersion', value: 3 });
    }
    version.value++;
    await version.save();

    res.status(201).json(newEvent);
  } catch (error) {
    res.status(400).json({ error: 'Error creating event' });
  }
});

app.get('/events/version', async (req, res) => {
  try {
    let version = await Version.findOne({ key: 'eventsVersion' });
    if (!version) {
      version = new Version({ key: 'eventsVersion', value: 3 });
      await version.save();
    }
    res.json({ version: version.value });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving version' });
  }
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});


