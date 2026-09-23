const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    nameHi: { type: String, default: '', trim: true },
    tag: { type: String, default: '' },
    tagHi: { type: String, default: '' },
    tagEn: { type: String, default: '' },
    benefit: { type: String, default: '' },
    benefitHi: { type: String, default: '' },
    benefitEn: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionHi: { type: String, default: '' },
    descriptionEn: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Scheme', schemeSchema);
