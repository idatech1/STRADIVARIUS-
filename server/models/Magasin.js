const mongoose = require('mongoose');

const magasinSchema = new mongoose.Schema({
  codeInditex: {
    type: String,
    required: [true, 'Le code Inditex est obligatoire'],
    unique: true,
    trim: true,
    uppercase: true
  },
  nomMagasin: {
    type: String,
    required: [true, 'Le nom du magasin est obligatoire'],
    trim: true
  },
  codeFutura: {
    type: String,
    required: [true, 'Le code Futura est obligatoire'],
    unique: true,
    trim: true,
    uppercase: true
  },
  statut: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware pour vérifier l'unicité avant sauvegarde
magasinSchema.pre('save', async function(next) {
  const existingCodeInditex = await this.constructor.findOne({ 
    codeInditex: this.codeInditex,
    _id: { $ne: this._id }
  });
  
  if (existingCodeInditex) {
    const err = new Error('Ce code Inditex est déjà utilisé');
    next(err);
  }

  const existingCodeFutura = await this.constructor.findOne({ 
    codeFutura: this.codeFutura,
    _id: { $ne: this._id }
  });
  
  if (existingCodeFutura) {
    const err = new Error('Ce code Futura est déjà utilisé');
    next(err);
  }

  next();
});

module.exports = mongoose.model('Magasin', magasinSchema, 'magasins');