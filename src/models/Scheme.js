const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    tag: { type: String, default: '' },
    benefit: { type: String, default: '' },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Scheme', schemeSchema);
