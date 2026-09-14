const express = require('express');
const authRoutes = require('./authRoutes');
const tradeRoutes = require('./tradeRoutes');
const marketRoutes = require('./marketRoutes');
const schemeRoutes = require('./schemeRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use(authRoutes);
router.use(tradeRoutes);
router.use(marketRoutes);
router.use(schemeRoutes);
router.use(adminRoutes);

router.get('/health', (_req, res) => res.json({ success: true, message: 'API is healthy' }));

module.exports = router;
