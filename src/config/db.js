const mongoose = require('mongoose');

async function ensureUserIndexes() {
  try {
    const usersCollection = mongoose.connection.collection('users');
    const existingIndexes = await usersCollection.indexes();
    const indexNames = existingIndexes.map((index) => index.name);

    if (indexNames.includes('phone_1')) {
      await usersCollection.dropIndex('phone_1');
      console.log('Dropped legacy users.phone unique index');
    }

    if (!indexNames.includes('mobile_1')) {
      await usersCollection.createIndex('mobile', { unique: true, background: true });
      console.log('Created users.mobile unique index');
    }
  } catch (error) {
    console.error('User index sync failed:', error.message);
  }
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartkhedut';
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    await ensureUserIndexes();
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not set. Add it to .env or use the default local MongoDB URL.');
    }
    process.exit(1);
  }
};

module.exports = connectDB;
