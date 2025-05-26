// routes/transferManuelRoutes.js
const express = require('express');
const router = express.Router();
const { 
  createTransferManuel, 
  getTransfersManuels, 
  getTransferManuelById, 
  updateTransferManuel, 
  deleteTransferManuel,
  getTransferManuelStats,
  getFlaggedTransfersManuels
} = require('../controllers/transferManuelController');
const { protect } = require('../middleware/authMiddleware');

// Routes publiques pour les tests (à sécuriser en production)
router.post('/', createTransferManuel);
router.get('/', getTransfersManuels);
router.get('/flagged', getFlaggedTransfersManuels);
router.get('/stats', getTransferManuelStats);
router.get('/:id', getTransferManuelById);
router.put('/:id', updateTransferManuel);
router.delete('/:id', deleteTransferManuel);

// Routes sécurisées (nécessitent authentification)
// router.post('/', protect, createTransferManuel);
// router.get('/', protect, getTransfersManuels);
// router.get('/stats', protect, getTransferManuelStats);
// router.get('/:id', protect, getTransferManuelById);
// router.put('/:id', protect, updateTransferManuel);
// router.delete('/:id', protect, deleteTransferManuel);

module.exports = router;