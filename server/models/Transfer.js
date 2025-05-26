const mongoose = require('mongoose');
const MovementSchema = new mongoose.Schema({
  Model: Number,
  Quality: Number,
  Colour: Number,
  Size: Number,
  Units: Number,
  Price: Number,
  Year: Number,
  Campaign: Number,
  Period: Number,
  Information: String,
  Box: String,
  code_barre: String,
  flag_code_barre: {
    type: Number,
    default: 0 // 0 = invalide, 1 = valide
  }
});

const TransferSchema = new mongoose.Schema({
  Date: {
    type: Date,
    required: true
  },
  Id_Store: Number,
  Id_Department_Type: Number,
  Destination_Id_Store: Number,
  Destination_Id_Departament_Type: Number,
  Id_Product: Number,
  Id_Movement_Type: String,
  Id_Movement_Subtype: Number,
  Document_Number: {
    type: Number,
    required: true,
  },
  Document_Date: Date,
  Sequence: Number,
  Void_Sequence: Number,
  MOVEMENTS: [MovementSchema],
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Magasin'
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Magasin',
  },
  status: {
    type: String,
    enum: ['En cours', 'Confirmé', 'En attente', 'Annulé', 'Inventaire', 'Inventaire z'],
    default: 'En attente'
  },
  type: {
    type: String,
    enum: ['blue', 'green', 'orange', 'red', 'yellow'],
    default: 'orange'
  },
  showBoxIcon: {
    type: Boolean,
    default: false
  },
  quantity: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  Flag: {
    type: Number,
    default: 0
  },
   all_barcodes_valid: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Middleware pour le type selon le statut
TransferSchema.pre('save', function(next) {
  if (this.isModified('status') || this.isNew) {
    switch (this.status) {
      case 'En cours':
        this.type = 'blue';
        break;
      case 'Confirmé':
        this.type = 'green';
        break;
      case 'En attente':
        this.type = 'orange';
        break;
      case 'Annulé':
        this.type = 'red';
        break;
    }
  }
  next();
});

module.exports = mongoose.model('Transfer', TransferSchema);