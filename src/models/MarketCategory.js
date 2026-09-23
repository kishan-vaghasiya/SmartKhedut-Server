const mongoose = require('mongoose');

// Category tile shown in the Market (Khedut Bazar) grid: cow, buffalo,
// tractor, drip irrigation, etc. `group` powers the top filter chips
// (Livestock / Animals / Crops / Machinery / Irrigation / Tools / Vehicles).
const marketCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // ગાય
    nameEn: { type: String, required: true, trim: true }, // Cow
    nameHi: { type: String, default: '', trim: true }, // गाय (optional, falls back to nameEn)
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true }, // cow
    icon: { type: String, default: '🐄' },
    group: {
      type: String,
      required: true,
      enum: ['Livestock', 'Animals', 'Crops', 'Machinery', 'Irrigation', 'Tools', 'Vehicles'],
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('MarketCategory', marketCategorySchema);
