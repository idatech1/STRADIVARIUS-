const Inventory = require('../models/Inventory');
const Magasin = require('../models/Magasin');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// @desc    Créer un nouvel inventaire
// @route   POST /api/inventories
// @access  Private/Admin
exports.createInventory = asyncHandler(async (req, res, next) => {
  const { date, destination, comment } = req.body;

  // Validate destination as a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(destination)) {
    return res.status(400).json({
      success: false,
      message: 'ID de magasin invalide'
    });
  }

  // Verify that the magasin exists
  const magasinExists = await Magasin.findById(destination);
  if (!magasinExists) {
    return res.status(400).json({
      success: false,
      message: 'Magasin non trouvé'
    });
  }

  // Vérifier si un inventaire existe déjà pour cette date et destination
  const existingInventory = await Inventory.findOne({ 
    date, 
    destination 
  });

  if (existingInventory) {
    return res.status(400).json({
      success: false,
      message: 'Un inventaire existe déjà pour cette date et destination'
    });
  }

  const inventory = await Inventory.create({
    date,
    destination,
    comment,
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    data: inventory
  });
});

// @desc    Récupérer tous les inventaires
// @route   GET /api/inventories
// @access  Private
exports.getInventories = asyncHandler(async (req, res, next) => {
  // Filtrage possible par date, destination ou statut
  const { date, destination, status } = req.query;
  let query = {};

  if (date) query.date = date;
  if (destination) {
    if (!mongoose.Types.ObjectId.isValid(destination)) {
      return res.status(400).json({
        success: false,
        message: 'ID de magasin invalide'
      });
    }
    query.destination = destination;
  }
  if (status) query.status = status;

  const inventories = await Inventory.find(query)
  .populate('destination', 'nomMagasin')  // Add this line
  .populate('createdBy', 'name email')
  .populate('updatedBy', 'name email')
  .sort({ date: 1 });

  res.status(200).json({
    success: true,
    count: inventories.length,
    data: inventories
  });
});

// @desc    Récupérer un inventaire spécifique
// @route   GET /api/inventories/:id
// @access  Private
exports.getInventory = asyncHandler(async (req, res, next) => {
  const inventory = await Inventory.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!inventory) {
    return res.status(404).json({
      success: false,
      message: 'Inventaire non trouvé'
    });
  }

  res.status(200).json({
    success: true,
    data: inventory
  });
});

// @desc    Mettre à jour un inventaire
// @route   PUT /api/inventories/:id
// @access  Private/Admin
exports.updateInventory = asyncHandler(async (req, res, next) => {
  const { date, destination, comment, status } = req.body;

  let inventory = await Inventory.findById(req.params.id);

  if (!inventory) {
    return res.status(404).json({
      success: false,
      message: 'Inventaire non trouvé'
    });
  }

  // Validate destination if provided
  if (destination) {
    if (!mongoose.Types.ObjectId.isValid(destination)) {
      return res.status(400).json({
        success: false,
        message: 'ID de magasin invalide'
      });
    }
    const magasinExists = await Magasin.findById(destination);
    if (!magasinExists) {
      return res.status(400).json({
        success: false,
        message: 'Magasin non trouvé'
      });
    }
  }

  // Vérifier les conflits de date/destination
  if (date || destination) {
    const existingInventory = await Inventory.findOne({
      _id: { $ne: req.params.id },
      date: date || inventory.date,
      destination: destination || inventory.destination
    });

    if (existingInventory) {
      return res.status(400).json({
        success: false,
        message: 'Un inventaire existe déjà pour cette date et destination'
      });
    }
  }

  inventory.date = date || inventory.date;
  inventory.destination = destination || inventory.destination;
  inventory.comment = comment !== undefined ? comment : inventory.comment;
  inventory.status = status || inventory.status;
  inventory.updatedBy = req.user.id;
  inventory.updatedAt = Date.now();

  await inventory.save();

  res.status(200).json({
    success: true,
    data: inventory
  });
});

// @desc    Get inventories by period
// @route   GET /api/inventories/period
// @access  Private
exports.getInventoriesByPeriod = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Veuillez fournir une date de début et une date de fin'
    });
  }

  const inventories = await Inventory.find({
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ date: 1 });

  res.status(200).json({
    success: true,
    count: inventories.length,
    data: inventories
  });
});

// @desc    Supprimer un inventaire
// @route   DELETE /api/inventories/:id
// @access  Private/Admin
exports.deleteInventory = asyncHandler(async (req, res, next) => {
  const inventory = await Inventory.findById(req.params.id);

  if (!inventory) {
    return res.status(404).json({
      success: false,
      message: 'Inventaire non trouvé'
    });
  }

  await inventory.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Récupérer les destinations disponibles
// @route   GET /api/inventories/destinations
// @access  Private
exports.getDestinations = asyncHandler(async (req, res, next) => {
  const magasins = await Magasin.find({ statut: 'active' }).select('_id nomMagasin');
  
  res.status(200).json({
    success: true,
    data: magasins
  });
});