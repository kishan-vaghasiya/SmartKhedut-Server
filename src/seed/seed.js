// One-shot seeder: creates the default admin + the Trade/Market category
// lists so the app's dropdowns and the admin panel's category pages have
// real data to show immediately. Safe to re-run — it skips what exists.
//
// Usage: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');
const TradeCategory = require('../models/TradeCategory');
const MarketCategory = require('../models/MarketCategory');

function slugify(text) {
  return text.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const tradeCategories = [
  { name: 'શાકભાજી', nameEn: 'Vegetables', nameHi: 'सब्जियां', icon: '🥬' },
  { name: 'અનાજ', nameEn: 'Grains', nameHi: 'अनाज', icon: '🌾' },
  { name: 'તેલીબિયાં', nameEn: 'Oilseeds', nameHi: 'तिलहन', icon: '🥜' },
  { name: 'કપાસ', nameEn: 'Cotton', nameHi: 'कपास', icon: '🧶' },
  { name: 'ફળો', nameEn: 'Fruits', nameHi: 'फल', icon: '🍎' },
  { name: 'કઠોળ', nameEn: 'Pulses', nameHi: 'दालें', icon: '🫘' },
  { name: 'મસાલા', nameEn: 'Spices', nameHi: 'मसाले', icon: '🌶️' },
];

const marketCategories = [
  { name: 'ગાય', nameEn: 'Cow', nameHi: 'गाय', icon: '🐄', group: 'Livestock' },
  { name: 'ભેંસ', nameEn: 'Buffalo', nameHi: 'भैंस', icon: '🐃', group: 'Livestock' },
  { name: 'બળદ', nameEn: 'Ox', nameHi: 'बैल', icon: '🐂', group: 'Livestock' },
  { name: 'ઘોડા', nameEn: 'Horse', nameHi: 'घोड़ा', icon: '🐎', group: 'Livestock' },
  { name: 'ઘેટાં-બકરાં', nameEn: 'Sheep & Goat', nameHi: 'भेड़-बकरी', icon: '🐐', group: 'Livestock' },
  { name: 'ઊંટ', nameEn: 'Camel', nameHi: 'ऊंट', icon: '🐪', group: 'Livestock' },
  { name: 'મરઘાં', nameEn: 'Poultry', nameHi: 'मुर्गी पालन', icon: '🐓', group: 'Livestock' },
  { name: 'કૂતરા', nameEn: 'Dog', nameHi: 'कुत्ता', icon: '🐕', group: 'Animals' },
  { name: 'ખેત પેદાશ', nameEn: 'Crop Produce', nameHi: 'फसल उत्पाद', icon: '🌽', group: 'Crops' },
  { name: 'બિયારણ', nameEn: 'Seeds', nameHi: 'बीज', icon: '🌿', group: 'Crops' },
  { name: 'ઓર્ગેનિક', nameEn: 'Organic', nameHi: 'जैविक', icon: '🥦', group: 'Crops' },
  { name: 'નર્સરી', nameEn: 'Nursery', nameHi: 'नर्सरी', icon: '🌺', group: 'Crops' },
  { name: 'ટ્રેક્ટર', nameEn: 'Tractor', nameHi: 'ट्रैक्टर', icon: '🚜', group: 'Machinery' },
  { name: 'મીની ટ્રેક.', nameEn: 'Mini Tractor', nameHi: 'मिनी ट्रैक्टर', icon: '🚛', group: 'Machinery' },
  { name: 'ટ્રોલી', nameEn: 'Trolley', nameHi: 'ट्रॉली', icon: '🚚', group: 'Machinery' },
  { name: 'રોટાવેટર', nameEn: 'Rotavator', nameHi: 'रोटावेटर', icon: '⚙️', group: 'Machinery' },
  { name: 'થ્રેસર', nameEn: 'Thresher', nameHi: 'थ्रेशर', icon: '🌾', group: 'Machinery' },
  { name: 'ઓરણી', nameEn: 'Sowing', nameHi: 'बुवाई यंत्र', icon: '🌱', group: 'Machinery' },
  { name: 'ચાફ કટર', nameEn: 'Chaff Cutter', nameHi: 'चाफ कटर', icon: '⚡', group: 'Machinery' },
  { name: 'ડ્રિપ', nameEn: 'Drip Irrigation', nameHi: 'ड्रिप सिंचाई', icon: '💧', group: 'Irrigation' },
  { name: 'ઓજાર', nameEn: 'Tools', nameHi: 'औज़ार', icon: '🔧', group: 'Tools' },
  { name: 'ટુ વ્હીલર', nameEn: 'Two Wheeler', nameHi: 'दोपहिया वाहन', icon: '🛵', group: 'Vehicles' },
  { name: 'ફોર વ્હીલ', nameEn: 'Four Wheeler', nameHi: 'चारपहिया वाहन', icon: '🚗', group: 'Vehicles' },
  { name: 'રીક્ષા', nameEn: 'Rickshaw', nameHi: 'रिक्शा', icon: '🛺', group: 'Vehicles' },
  { name: 'અન્ય વાહન', nameEn: 'Other Vehicle', nameHi: 'अन्य वाहन', icon: '🚌', group: 'Vehicles' },
  { name: 'સનેડા', nameEn: 'Saneda', nameHi: 'सनेडा', icon: '🚐', group: 'Vehicles' },
];

async function run() {
  await connectDB();

  const adminName = process.env.DEFAULT_ADMIN_NAME || 'Sandhya Patel';
  const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@smartkhedut.in').toLowerCase();
  const existingAdmin = await Admin.findOne({ email: adminEmail });

  if (!existingAdmin) {
    await Admin.create({
      name: adminName,
      email: adminEmail,
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123',
      role: 'Super Admin',
    });
    console.log(`Created default admin: ${adminEmail} / ${process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123'}`);
  } else {
    const changed = existingAdmin.name !== adminName;
    existingAdmin.name = adminName;
    await existingAdmin.save();
    console.log(changed ? `Updated default admin name to ${adminName}.` : 'Default admin already has the correct name.');
  }

  for (const cat of tradeCategories) {
    const slug = slugify(cat.nameEn);
    const exists = await TradeCategory.findOne({ slug });
    if (!exists) await TradeCategory.create({ ...cat, slug });
  }
  console.log(`Trade categories ready (${tradeCategories.length}).`);

  for (const cat of marketCategories) {
    const slug = slugify(cat.nameEn);
    const exists = await MarketCategory.findOne({ slug });
    if (!exists) await MarketCategory.create({ ...cat, slug });
  }
  console.log(`Market categories ready (${marketCategories.length}).`);

  console.log('Seed complete.');
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
