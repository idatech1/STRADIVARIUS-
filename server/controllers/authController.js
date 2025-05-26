// Contrôleur - controllers/authController.js
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Enregistrer un utilisateur
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  const { nom, prenom, matricule, username, password, role } = req.body;

  // Vérifier si l'utilisateur existe déjà
  const userExists = await User.findOne({ 
    $or: [{ username }, { matricule }] 
  });

  if (userExists) {
    res.status(400);
    throw new Error('Cet utilisateur existe déjà');
  }

  // Créer un nouvel utilisateur
  const user = await User.create({
    nom,
    prenom,
    matricule,
    username,
    password,
    role
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      matricule: user.matricule,
      username: user.username,
      role: user.role,
      token: user.generateAuthToken()
    });
  } else {
    res.status(400);
    throw new Error('Données utilisateur invalides');
  }
});

// @desc    Authentifier un utilisateur
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Vérifier si l'utilisateur existe
  const user = await User.findOne({ username });

  if (!user) {
    res.status(401);
    throw new Error('Identifiants invalides');
  }

  // Vérifier le mot de passe
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    res.status(401);
    throw new Error('Identifiants invalides');
  }

  res.json({
    _id: user._id,
    nom: user.nom,
    prenom: user.prenom,
    matricule: user.matricule,
    username: user.username,
    role: user.role,
    token: user.generateAuthToken()
  });
});

// @desc    Obtenir le profil utilisateur
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});
