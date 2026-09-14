const mongoose = require('mongoose');

// A single advertisement created from the app's Market > "New Advertisement"
// 3-step wizard (Category -> Details -> Photos).
const marketAdSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketCategory', required: true },
    price: { type: Number, required: true, min: 0 },
    year: { type: String, default: '' },
    location: { type: String, required: true },
    phone: { type: String, required: true },
    description: { type: String, default: '' },
    condition: { type: String, enum: ['New', 'Used'], default: 'Used' },
    negotiable: { type: Boolean, default: true },
    photos: [{ type: String }], // relative paths, up to 4

    postedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    postedBy: { type: String, enum: ['farmer', 'admin'], default: 'farmer' },

    verified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'pending', 'rejected', 'hidden'], default: 'pending' },
  },
  { timestamps: true },
);

marketAdSchema.index({ title: 'text', location: 'text' });

module.exports = mongoose.model('MarketAd', marketAdSchema);
