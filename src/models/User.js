const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    location: { type: String, default: '' },
    avatar: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'deactivated'], default: 'active' },
    // Firebase Cloud Messaging device token, saved after login from the app.
    // Used to subscribe/unsubscribe the device to the "all_users" broadcast topic.
    fcmToken: { type: String, default: null },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
