const express = require('express');
const router = express.Router();
const { getFolderPath, updateFolderPath } = require('../controllers/folderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getFolderPath)
  .put(protect, authorize('Admin'), updateFolderPath);

module.exports = router;