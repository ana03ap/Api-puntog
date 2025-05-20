const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    validate: {
      validator: (value) => value.length > 0,
      message: "Label cannot be an empty string.",
    },
  },
  type: {
    type: String,
    required: true,
    validate: {
      validator: (value) => value.length > 0,
      message: "Type cannot be an empty string.",
    },
  },
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;