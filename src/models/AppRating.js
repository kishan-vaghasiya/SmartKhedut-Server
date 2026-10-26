const mongoose = require('mongoose');

const appRatingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: 'Rating must be an integer' },
    },
    review: { type: String, default: '', maxlength: 2000 },
    language: { type: String, enum: ['en', 'gu', 'hi', 'pa', 'mr'] },
    platform: { type: String, enum: ['android', 'ios'] },
    appVersion: { type: String, default: '' },
  },
  { timestamps: true },
);

appRatingSchema.index({ user: 1 }, { unique: true });
appRatingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AppRating', appRatingSchema);
