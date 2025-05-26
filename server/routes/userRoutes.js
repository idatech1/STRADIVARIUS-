
// Routes - routes/userRoutes.js
const express = require('express');
const { 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser 
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .get(protect, authorize('Admin', 'User'), getUsers);

router
  .route('/:id')
  .get(protect, authorize('Admin', 'User'), getUserById)
  .put(protect, authorize('Admin', 'User'), updateUser)
  .delete(protect, authorize('Admin', 'User'), deleteUser);

module.exports = router;//