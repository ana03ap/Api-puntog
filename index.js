require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Event = require("./models/Event");
const Version = require("./models/Version");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

app.get("/events", async (req, res) => {
  try {
    const events = await Event.find();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.get("/events/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    res.status(200).json(event);
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to fetch event with id=${req.params.id}` });
  }
});

app.put("/events/:id", async (req, res) => {
  try {
    const eventId = req.params.id;
    const updatedData = req.body;

    // Find and update the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // must verify if updatedDate.participants >= (event.participants - event.availableSpots)
    if (updatedData.participants < event.participants - event.availableSpots) {
      return res
        .status(400)
        .json({
          error: `Participants cannot be set to ${updatedData.participants} as ${event.participants -
            event.availableSpots} people have already subscribed`
        });
    }
    
    const diff = Object.fromEntries(
      Object.entries(updatedData).filter(([key, value]) => event[key] !== value)
    );
    if (Object.keys(diff).includes("participants")) {
      diff.availableSpots = diff.participants - event.availableSpots;
    }

    console.log("updating.");
    console.log(diff)

    // Update
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      Object.fromEntries(
        Object.entries(updatedData).filter(
          ([key, value]) => event[key] !== value
        )
      ),
      { new: true }
    );

    // Update the events version
    let version = await Version.findOne({ key: "eventsVersion" });
    if (!version) {
      version = new Version({ key: "eventsVersion", value: 3 });
    }
    version.value++;
    await version.save();

    res.status(200).json(updatedEvent);
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to update event with id=${req.params.id}` });
  }
});

app.delete("/events/:id", async (req, res) => {
  try {
    const result = await Event.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Update the events version
    let version = await Version.findOne({ key: "eventsVersion" });
    if (!version) {
      version = new Version({ key: "eventsVersion", value: 3 });
    }
    version.value++;
    await version.save();

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to delete event with id=${req.params.id}` });
  }
});

app.post("/subscribe/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (event && event.availableSpots > 0) {
      event.availableSpots--;
      await event.save();
      res.status(200).json({ message: "Successfully subscribed!", event });
    } else {
      res.status(400).json({ error: "No spots available or event not found." });
    }
  } catch (error) {
    res.status(500).json({ error: "Error subscribing to event" });
  }
});

app.post("/feedback/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    const { rating } = req.body;

    if (!event) return res.status(404).json({ error: "Event not found" });

    event.ratings.push(rating);
    await event.save();

    res
      .status(200)
      .json({ message: "Rating submitted!", ratings: event.ratings });
  } catch (error) {
    res.status(500).json({ error: "Error submitting rating" });
  }
});

app.post("/events", async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    await newEvent.save();

    let version = await Version.findOne({ key: "eventsVersion" });
    if (!version) {
      version = new Version({ key: "eventsVersion", value: 3 });
    }
    version.value++;
    await version.save();

    res.status(200).json(newEvent);
  } catch (error) {
    res.status(400).json({ error: "Error creating event" });
  }
});

app.get("/events/version", async (req, res) => {
  try {
    let version = await Version.findOne({ key: "eventsVersion" });
    if (!version) {
      version = new Version({ key: "eventsVersion", value: 3 });
      await version.save();
    }
    res.json({ version: version.value });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving version" });
  }
});

app.get("/events/type/:name", async (req, res) => {
  try {
    const events = await Event.find({ type: req.params.name });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events by type" });
  }
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
