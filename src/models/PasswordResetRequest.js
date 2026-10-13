const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    fcmToken: { type: String, trim: true, select: false },
    // Language the requester uses in the app, so the approve/reject push is in their language.
    language: { type: String, enum: ['en', 'gu', 'hi'], default: 'en' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

passwordResetRequestSchema.index(
  { mobile: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
