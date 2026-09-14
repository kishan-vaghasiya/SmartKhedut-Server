const express = require('express');
const {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/tradeCategoryController');
const {
  listPosts,
  getPost,
  listMyPosts,
  createPost,
  updatePost,
  deletePost,
  adminListPosts,
  adminUpdatePostStatus,
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
} = require('../controllers/tradePostController');
const { protectUser, protectAdmin } = require('../middleware/auth');
const { tradeUpload } = require('../middleware/upload');

const router = express.Router();

// ---- Public: categories ----
router.get('/trade/categories', listCategories);
router.get('/trade/categories/:id', getCategory);

// ---- Public: posts ----
router.get('/trade/posts', listPosts);
router.get('/trade/posts/mine', protectUser, listMyPosts); // must be before /:id
router.get('/trade/posts/:id', getPost);

// ---- App user (protected) ----
router.post('/trade/posts', protectUser, tradeUpload.array('photos'), createPost);
router.put('/trade/posts/:id', protectUser, tradeUpload.array('photos'), updatePost);
router.delete('/trade/posts/:id', protectUser, deletePost);

// ---- Admin ----
router.post('/admin/trade/categories', protectAdmin, createCategory);
router.put('/admin/trade/categories/:id', protectAdmin, updateCategory);
router.delete('/admin/trade/categories/:id', protectAdmin, deleteCategory);

router.get('/admin/trade/posts', protectAdmin, adminListPosts);
router.post('/admin/trade/posts', protectAdmin, tradeUpload.array('photos'), adminCreatePost);
router.put('/admin/trade/posts/:id', protectAdmin, tradeUpload.array('photos'), adminUpdatePost);
router.patch('/admin/trade/posts/:id/status', protectAdmin, adminUpdatePostStatus);
router.delete('/admin/trade/posts/:id', protectAdmin, adminDeletePost);

module.exports = router;
