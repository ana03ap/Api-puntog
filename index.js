require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Event = require("./models/Event");
const Version = require("./models/Version");
const Category = require("./models/Category");
const AvailableIcon = require("./models/AvailableIcons");

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

// get all events
app.get("/events", async (req, res) => {
  try {
    const events = await Event.find();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// get event by id
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

// update event
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
    console.log(updatedEvent)
    res.status(200).json(updatedEvent);
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to update event with id=${req.params.id}` });
  }
});

// delete event
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

// new event
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

///////////////////////////////////////////////////
// get all categories
app.get("/categories", async (req, res) => {
  try {
    const results = await Category.find();
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// new category
app.post("/categories", async (req, res) => {
  try {
    const newCat = new Category(req.body);
    await newCat.save();
    res.status(200).json(newCat);
  } catch (error) {
    res.status(400).json({ error: "Error creating category" });
  }
});

// update category
app.put("/categories/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;
    const updatedData = req.body;

    // Find and update the category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Update
    const updatedCat = await Category.findByIdAndUpdate(
      categoryId,
      Object.fromEntries(
        Object.entries(updatedData).filter(
          ([key, value]) => category[key] !== value
        )
      ),
      { new: true }
    );

    res.status(200).json(updatedCat);
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to update category with id = ${req.params.id}` });
  }
});

// delete category
app.delete("/categories/:id", async (req, res) => {
  try {
    const result = await Category.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to delete category with id = ${req.params.id}` });
  }
});


// new icon
app.post("/icons", async (req, res) => {
  try {
    const newicon = new AvailableIcon(req.body);
    await newicon.save();
    res.status(200).json(newicon);
  } catch (error) {
    res.status(400).json({ error: "Error adding icon" });
  }
});

// get icons
app.get("/icons", async (req, res) => {
  try {
    const results = await AvailableIcon.find();
    res.status(200).json(results);
  } catch (error) {
    res.status(400).json({ error: "Error fetching icons" });
  }
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
