require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Event = require("./models/Event");
const Version = require("./models/Version");
const Category = require("./models/Category");

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

// funcion para aumentar en 1 la version

async function incrementEventsVersion() {
  let version = await Version.findOne({ key: "eventsVersion" });
  if (!version) {
    version = new Version({ key: "eventsVersion", value: 1 }); 
  } else {
    version.value++; 
  }
  await version.save();
}



// get all events
app.get("/events", async (req, res) => {
  try {
    const events = await Event.find();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

//get event version
app.get("/events/version", async (req, res) => {
  try {
    let version = await Version.findOne({ key: "eventsVersion" });
    if (!version) {
      version = new Version({ key: "eventsVersion", value: 1 });
      await version.save();
    }
    res.json({ version: version.value });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving version" });
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
    await incrementEventsVersion();
     
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
    await incrementEventsVersion();

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
   await incrementEventsVersion();
      return res.status(200).json({ message: "Successfully subscribed!", event });
    }
    return res.status(400).json({ error: "No spots available or event not found." });
  } catch (error) {
    console.error("🔥 Error en /subscribe/:id →", error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /unsubscribe/:id —> Deshace una suscripción (suma 1 a availableSpots)
app.post("/unsubscribe/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

 
    event.availableSpots++;
    await event.save();
    await incrementEventsVersion();
    return res
      .status(200)
      .json({ message: "Unsubscribed successfully!", event });
  } catch (error) {
    console.error("🔥 Error en /unsubscribe/:id →", error);
    return res.status(500).json({ error: error.message });
  }
});


// POST /addrating/:id —> Añade un rating a un evento
app.post("/addrating/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    // Validar ID Mongo
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // 2) Validar rating presente y en rango
    if (rating == null) {
      return res.status(400).json({ error: "Falta el campo rating" });
    }
    if (typeof rating !== "number") {
      return res.status(400).json({ error: "Rating debe ser un número" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating debe estar entre 1 y 5" });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    event.ratings.push(rating);
    await event.save();

    await incrementEventsVersion();

    return res
      .status(200)
      .json({ message: "Rating enviado correctamente", ratings: event.ratings });
  } catch (error) {
    console.error("🔥 Error en /addrating/:id →", error);
    return res.status(500).json({ error: error.message });
  }
});


// POST /comment/:id —> Añade un mensaje anónimo
app.post("/comment/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) 
      return res.status(400).json({ error: "ID inválido" });
    if (!comment || typeof comment !== "string") 
      return res.status(400).json({ error: "Comentario inválido" });

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ error: "Evento no encontrado" });

    event.comments.push(comment);
    await event.save();
    await incrementEventsVersion();

    return res
      .status(200)
      .json({ message: "Comentario agregado", comments: event.comments });
  } catch (error) {
    console.error("🔥 Error en /comment/:id →", error);
    return res.status(500).json({ error: error.message });
  }
});



// new event
app.post("/events", async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    await newEvent.save();

    await incrementEventsVersion();
    
    res.status(200).json(newEvent);
  } catch (error) {
    res.status(400).json({ error: "Error creating event" });
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

// get category by id
app.get("/categories/:id", async (req, res) => {
  try {
    const event = await Category.findById(req.params.id);
    res.status(200).json(event);
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to fetch category with id=${req.params.id}` });
  }
});

// new category
app.post("/categories", async (req, res) => {
  try {
    const newCat = new Category(req.body);
    await newCat.save();

    // TODO: await increment categories version?

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

    // TODO: await increment categories version?

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

    // TODO: await increment categories version?

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to delete category with id = ${req.params.id}` });
  }
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
