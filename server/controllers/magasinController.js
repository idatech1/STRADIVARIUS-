const Magasin = require('../models/Magasin');
const asyncHandler = require('express-async-handler');

// @desc    Créer un nouveau magasin
// @route   POST /api/magasins
// @access  Private/Admin
exports.createMagasin = asyncHandler(async (req, res) => {
  const { codeInditex, nomMagasin, codeFutura, statut } = req.body;

  const magasin = await Magasin.create({
    codeInditex,
    nomMagasin,
    codeFutura,
    statut
  });

  res.status(201).json({
    success: true,
    data: {
      id: magasin._id,
      codeInditex: magasin.codeInditex,
      nomMagasin: magasin.nomMagasin,
      codeFutura: magasin.codeFutura,
      statut: magasin.statut,
      status: magasin.status,
      showBoxIcon: magasin.showBoxIcon
    }
  });
});

// @desc    Récupérer tous les magasins
// @route   GET /api/magasins
// @access  Private
exports.getMagasins = asyncHandler(async (req, res) => {
  // Vérifier que req.query existe et contient statut
  const filter = {};
  
  if (req.query.statut) {
    filter.statut = req.query.statut;
    console.log(`Filtrage par statut: ${req.query.statut}`); // Log pour débugger
  }

  const magasins = await Magasin.find(filter).sort({ createdAt: -1 });
  
  console.log(`Magasins trouvés: ${magasins.length}, avec filtre:`, filter); // Log pour débugger
  
  res.status(200).json({
    success: true,
    count: magasins.length,
    data: magasins.map(mag => ({
      id: mag._id,
      codeInditex: mag.codeInditex,
      nomMagasin: mag.nomMagasin,
      codeFutura: mag.codeFutura,
      statut: mag.statut,
      status: mag.status,
      showBoxIcon: mag.showBoxIcon
    }))
  });
});
// @desc    Mettre à jour un magasin
// @route   PUT /api/magasins/:id
// @access  Private/Admin
exports.updateMagasin = asyncHandler(async (req, res) => {
  const { codeInditex, nomMagasin, codeFutura, statut } = req.body;

  let magasin = await Magasin.findById(req.params.id);

  if (!magasin) {
    res.status(404);
    throw new Error('Magasin non trouvé');
  }

  magasin.codeInditex = codeInditex || magasin.codeInditex;
  magasin.nomMagasin = nomMagasin || magasin.nomMagasin;
  magasin.codeFutura = codeFutura || magasin.codeFutura;
  magasin.statut = statut || magasin.statut;

  const updatedMagasin = await magasin.save();

  res.status(200).json({
    success: true,
    data: {
      id: updatedMagasin._id,
      codeInditex: updatedMagasin.codeInditex,
      nomMagasin: updatedMagasin.nomMagasin,
      codeFutura: updatedMagasin.codeFutura,
      statut: updatedMagasin.statut,
      status: updatedMagasin.status,
      showBoxIcon: updatedMagasin.showBoxIcon
    }
  });
});

// @desc    Supprimer un magasin
// @route   DELETE /api/magasins/:id
// @access  Private/Admin
exports.deleteMagasin = asyncHandler(async (req, res) => {
  const magasin = await Magasin.findById(req.params.id);

  if (!magasin) {
    res.status(404);
    throw new Error('Magasin non trouvé');
  }

  await magasin.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});