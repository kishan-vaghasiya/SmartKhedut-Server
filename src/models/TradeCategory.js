const mongoose = require('mongoose');

// "Type" dropdown shown in the app's New Product form (Trade tab).
const tradeCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Gujarati label, e.g. શાકભાજી
    nameEn: { type: String, required: true, trim: true }, // Vegetables
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true }, // vegetables
    icon: { type: String, default: '🌾' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('TradeCategory', tradeCategorySchema);
