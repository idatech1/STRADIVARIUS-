const express = require('express');
const {
  createInventory,
  getInventories,
  getInventory,
  updateInventory,
  deleteInventory,
  getDestinations,
  getInventoriesByPeriod
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Protection de toutes les routes
router.use(protect);

router.route('/')
  .get(getInventories)
  .post(authorize('Admin', 'User'), createInventory);

router.route('/destinations')
  .get(getDestinations);

// Add this before the /:id route
router.route('/period')
  .get(getInventoriesByPeriod);

router.route('/:id')
  .get(getInventory)
  .put(authorize('Admin', 'User'), updateInventory)
  .delete(authorize('Admin', 'User'), deleteInventory);

module.exports = router;