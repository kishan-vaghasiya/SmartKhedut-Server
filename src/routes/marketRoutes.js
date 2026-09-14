const express = require('express');
const {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/marketCategoryController');
const {
  listAds,
  getAd,
  listMyAds,
  createAd,
  updateAd,
  deleteAd,
  adminListAds,
  adminUpdateAdStatus,
  adminCreateAd,
  adminUpdateAd,
  adminDeleteAd,
} = require('../controllers/marketAdController');
const { protectUser, protectAdmin } = require('../middleware/auth');
const { marketUpload } = require('../middleware/upload');

const router = express.Router();

// ---- Public: categories ----
router.get('/market/categories', listCategories);
router.get('/market/categories/:id', getCategory);

// ---- Public: ads ----
router.get('/market/ads', listAds);
router.get('/market/ads/mine', protectUser, listMyAds); // before /:id
router.get('/market/ads/:id', getAd);

// ---- App user (protected) ----
router.post('/market/ads', protectUser, marketUpload.array('photos'), createAd);
router.put('/market/ads/:id', protectUser, marketUpload.array('photos'), updateAd);
router.delete('/market/ads/:id', protectUser, deleteAd);

// ---- Admin ----
router.post('/admin/market/categories', protectAdmin, createCategory);
router.put('/admin/market/categories/:id', protectAdmin, updateCategory);
router.delete('/admin/market/categories/:id', protectAdmin, deleteCategory);

router.get('/admin/market/ads', protectAdmin, adminListAds);
router.post('/admin/market/ads', protectAdmin, marketUpload.array('photos'), adminCreateAd);
router.put('/admin/market/ads/:id', protectAdmin, marketUpload.array('photos'), adminUpdateAd);
router.patch('/admin/market/ads/:id/status', protectAdmin, adminUpdateAdStatus);
router.delete('/admin/market/ads/:id', protectAdmin, adminDeleteAd);

module.exports = router;
