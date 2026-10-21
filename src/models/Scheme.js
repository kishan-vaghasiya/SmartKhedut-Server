const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    nameHi: { type: String, default: '', trim: true },
    namePa: { type: String, default: '', trim: true },
    nameMr: { type: String, default: '', trim: true },
    tag: { type: String, default: '' },
    tagHi: { type: String, default: '' },
    tagPa: { type: String, default: '' },
    tagMr: { type: String, default: '' },
    tagEn: { type: String, default: '' },
    benefit: { type: String, default: '' },
    benefitHi: { type: String, default: '' },
    benefitPa: { type: String, default: '' },
    benefitMr: { type: String, default: '' },
    benefitEn: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionHi: { type: String, default: '' },
    descriptionPa: { type: String, default: '' },
    descriptionMr: { type: String, default: '' },
    descriptionEn: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Scheme', schemeSchema);
