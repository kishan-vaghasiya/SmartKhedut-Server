// const mongoose = require('mongoose');

// // A single advertisement created from the app's Market > "New Advertisement"
// // 3-step wizard (Category -> Details -> Photos).
// const marketAdSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true, trim: true },
//     category: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketCategory', required: true },
//     price: { type: Number, required: true, min: 0 },
//     year: { type: String, default: '' },
//     location: { type: String, required: true },
//     phone: { type: String, required: true },
//     description: { type: String, default: '' },
//     condition: { type: String, enum: ['New', 'Used'], default: 'Used' },
//     negotiable: { type: Boolean, default: true },
//     photos: [{ type: String }], // relative paths, up to 4

//     postedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
//     postedBy: { type: String, enum: ['farmer', 'admin'], default: 'farmer' },

//     verified: { type: Boolean, default: false },
//     status: { type: String, enum: ['active', 'rejected', 'hidden'], default: 'active' },
//   },
//   { timestamps: true },
// );

// marketAdSchema.index({ title: 'text', location: 'text' });

// module.exports = mongoose.model('MarketAd', marketAdSchema);
const mongoose = require('mongoose');

// A single advertisement created from the app's Market > "New Advertisement"
// 3-step wizard (Category -> Details -> Photos).
//
// Every category collapses into one of 3 posting groups (see `postGroup`
// below) and each group has its own extra fields — a Seed post doesn't
// have a "condition", an Animal post doesn't have a "brand". All of those
// extra fields are optional at the schema level; the app only sends the
// ones relevant to the group the user picked.
const marketAdSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketCategory', required: true },
    postGroup: { type: String, enum: ['pashu', 'krushi', 'yantra'], default: 'yantra' },
    price: { type: Number, required: true, min: 0 },
    location: { type: String, required: true },
    phone: { type: String, required: true },
    description: { type: String, default: '' },
    negotiable: { type: Boolean, default: true },
    photos: [{ type: String }], // relative paths, up to 4

    // postGroup: 'yantra' (machinery / vehicles / tools / irrigation)
    year: { type: String, default: '' },
    condition: { type: String, enum: ['New', 'Used'], default: 'Used' },
    brand: { type: String, default: '' },

    // postGroup: 'krushi' (crop produce / seeds / organic / nursery)
    quantity: { type: String, default: '' },
    unit: { type: String, enum: ['kg', 'quintal', 'ton', ''], default: '' },
    variety: { type: String, default: '' },
    organic: { type: Boolean, default: false },

    // postGroup: 'pashu' (livestock / animals)
    breed: { type: String, default: '' },
    age: { type: String, default: '' },
    milkYield: { type: String, default: '' },
    vaccinated: { type: Boolean, default: false },

    postedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    postedBy: { type: String, enum: ['farmer', 'admin'], default: 'farmer' },

    verified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'rejected', 'hidden'], default: 'active' },
  },
  { timestamps: true },
);

marketAdSchema.index({ title: 'text', location: 'text' });

module.exports = mongoose.model('MarketAd', marketAdSchema);