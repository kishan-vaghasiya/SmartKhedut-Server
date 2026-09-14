const mongoose = require('mongoose');

// A single product post created from the app's Trade > "+ New" form.
const tradePostSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Product Name
    nameEn: { type: String, default: '' }, // optional English name, shown in the admin panel
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeCategory', required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ['kg', 'quintal', 'ton', 'piece'], default: 'kg' },
    description: { type: String, default: '' },
    location: { type: String, default: '' },
    photos: [{ type: String }], // relative paths, up to 5

    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    // Freeform fallback contact info, used when an admin creates a listing
    // directly (no linked app account) — mirrors the admin panel's form.
    sellerName: { type: String, default: '' },
    phone: { type: String, default: '' },
    postedBy: { type: String, enum: ['farmer', 'admin'], default: 'farmer' },

    verified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'pending', 'rejected', 'hidden'], default: 'pending' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true },
);

tradePostSchema.index({ name: 'text', location: 'text' });

module.exports = mongoose.model('TradePost', tradePostSchema);
