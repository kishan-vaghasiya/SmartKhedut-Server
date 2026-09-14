const express = require('express');
const {
  listSchemes,
  getScheme,
  createScheme,
  updateScheme,
  deleteScheme,
  toggleScheme,
} = require('../controllers/schemeController');
const { protectAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/schemes', listSchemes);
router.get('/schemes/:id', getScheme);

router.post('/admin/schemes', protectAdmin, createScheme);
router.put('/admin/schemes/:id', protectAdmin, updateScheme);
router.delete('/admin/schemes/:id', protectAdmin, deleteScheme);
router.patch('/admin/schemes/:id/toggle', protectAdmin, toggleScheme);

module.exports = router;
