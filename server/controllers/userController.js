// Contrôleur - controllers/userController.js
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Obtenir tous les utilisateurs
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});

// @desc    Obtenir un utilisateur par ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

// @desc    Mettre à jour un utilisateur
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  // Empêcher la modification d'un Admin par un Admin
  if (user.role === 'Admin' && req.user.role !== 'Admin') {
    res.status(403);
    throw new Error('Non autorisé à modifier un Admin');
  }

  user.nom = req.body.nom || user.nom;
  user.prenom = req.body.prenom || user.prenom;
  user.matricule = req.body.matricule || user.matricule;
  user.username = req.body.username || user.username;
  user.role = req.body.role || user.role;
  
  if (req.body.password) {
    user.password = req.body.password;
  }

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    nom: updatedUser.nom,
    prenom: updatedUser.prenom,
    matricule: updatedUser.matricule,
    username: updatedUser.username,
    role: updatedUser.role
  });
});

// @desc    Supprimer un utilisateur
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  // Empêcher la suppression d'un Admin par un Admin
  if (user.role === 'Admin' && req.user.role !== 'Admin') {
    res.status(403);
    throw new Error('Non autorisé à supprimer un Admin');
  }

  await user.deleteOne();
  res.json({ message: 'Utilisateur supprimé' });
});
//