const express = require('express');
const {
  createMagasin,
  getMagasins,
  updateMagasin,
  deleteMagasin
} = require('../controllers/magasinController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Protection de toutes les routes
router.use(protect);

router.route('/')
  .get(getMagasins)
  .post(authorize('Admin', 'User'), createMagasin);

router.route('/:id')
  .put(authorize('Admin', 'User'), updateMagasin)
  .delete(authorize('Admin', 'User'), deleteMagasin);

module.exports = router;