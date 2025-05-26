const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Veuillez ajouter une date']
  },
  destination: {
    type: mongoose.Schema.ObjectId,
    ref: 'Magasin', // Reference to the Magasin model
    required: [true, 'Veuillez ajouter une destination']
  },
  comment: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    default: 'En attente',
    enum: ['En attente', 'En cours', 'Confirmé', 'Annulé']
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  updatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
});

// Index pour optimiser les recherches
inventorySchema.index({ date: 1, destination: 1 });

// Populate destination automatically in find queries
inventorySchema.pre(/^find/, function(next) {
  this.populate({
    path: 'destination',
    select: 'nomMagasin'
  });
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);