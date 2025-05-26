// models/transferManuelModel.js
const mongoose = require('mongoose');

const transferManuelSchema = new mongoose.Schema({
  fromLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Magasin',
    required: [true, 'Le magasin source est requis']
  },
  toLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Magasin',
    required: [true, 'Le magasin de destination est requis']
  },
  status: {
    type: String,
    enum: ['En attente', 'En cours', 'Confirmé', 'Annulé'],
    default: 'En attente'
  },
  transferDate: {
    type: Date,
    default: Date.now
  },
  totalQuantity: {
    type: Number,
    required: [true, 'La quantité totale est requise']
  },
  items: [
    {
      barcode: {
        type: String,
        required: [true, 'Le code-barres est requis']
      },
      quantity: {
        type: Number,
        required: [true, 'La quantité est requise'],
        min: [1, 'La quantité doit être au moins 1']
      }
    }
  ],
  Flag: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  importMethod: {
    type: String,
    enum: ['manual', 'file', 'scan'],
    default: 'file'
  }
}, {
  timestamps: true
});

// Méthode pour valider que les magasins source et destination sont différents
transferManuelSchema.pre('validate', function(next) {
  if (this.fromLocation && this.toLocation && 
      this.fromLocation.toString() === this.toLocation.toString()) {
    this.invalidate('toLocation', 'Le magasin de destination doit être différent du magasin source');
  }
  next();
});

module.exports = mongoose.model('TransferManuel', transferManuelSchema);