const Transfer = require('../models/Transfer');
const Magasin = require('../models/Magasin');
const moment = require('moment');
const { validationResult } = require('express-validator');

// Helper functions
const formatDateToKey = (date) => moment(date).format('YYYY-MM-DD');

const formatTransferResponse = (transfer) => ({
  _id: transfer._id,
  Date: moment(transfer.Date).format('YYYY-MM-DD'),
  Document_Number: transfer.Document_Number, 
  Id_Store: transfer.Id_Store,
  Id_Department_Type: transfer.Id_Department_Type,
  Destination_Id_Store: transfer.Destination_Id_Store,
  Destination_Id_Departament_Type: transfer.Destination_Id_Departament_Type,
  Id_Product: transfer.Id_Product,
  Id_Movement_Type: transfer.Id_Movement_Type,
  Id_Movement_Subtype: transfer.Id_Movement_Subtype,
  Document_Date: moment(transfer.Document_Date).format('YYYY-MM-DD'),
  Sequence: transfer.Sequence,
  Void_Sequence: transfer.Void_Sequence,
  MOVEMENTS: transfer.MOVEMENTS,
  from: transfer.from, // Maintenant un objet magasin avec _id et nomMagasin
  to: transfer.to,    // Maintenant un objet magasin avec _id et nomMagasin
  status: transfer.status,
  type: transfer.type,
  showBoxIcon: transfer.showBoxIcon,
  quantity: transfer.quantity,
  description: transfer.description,
  Flag: transfer.Flag,
  all_barcodes_valid: transfer.all_barcodes_valid,
  createdAt: moment(transfer.createdAt).format('YYYY-MM-DD HH:mm'),
  updatedAt: moment(transfer.updatedAt).format('YYYY-MM-DD HH:mm')
});

const handleErrors = (res, error, status = 500) => {
  console.error(error);
  res.status(status).json({ 
    success: false,
    error: error.message || 'Une erreur est survenue'
  });
};

// Contrôleurs
exports.getAllTransfers = async (req, res) => {
  try {
    const { status, storeId } = req.query;
    const query = { 
      status: { $ne: "Erreur" },
      Flag: { $ne: 1 } // Exclure les transferts avec Flag=1
    }; 
    
    if (status) query.status = status; // Cette ligne remplacera la condition $ne si un statut spécifique est demandé
    if (storeId) {
      query.$or = [
        { 'from._id': storeId },
        { 'to._id': storeId }
      ];
    }
    
    const transfers = await Transfer.find(query)
      .populate('from', '_id nomMagasin')
      .populate('to', '_id nomMagasin')
      .sort({ Date: -1 })
      .exec();

    res.status(200).json({
      success: true,
      data: transfers.map(formatTransferResponse),
      count: transfers.length
    });
  } catch (error) {
    handleErrors(res, error);
  }
};

exports.getTransfersByPeriod = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { startDate, endDate, status, storeId } = req.query;
    const query = {
      Date: { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      }
    };
    
    if (status) query.status = status;
    if (storeId) {
      query.$or = [
        { 'from._id': storeId },
        { 'to._id': storeId }
      ];
    }

    const transfers = await Transfer.find(query)
      .populate('from', '_id nomMagasin')
      .populate('to', '_id nomMagasin')
      .sort({ Date: -1 });

    res.status(200).json({
      success: true,
      data: transfers.map(formatTransferResponse),
      count: transfers.length
    });
  } catch (error) {
    handleErrors(res, error);
  }
};

exports.getTransferById = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id)
      .populate('from', '_id nomMagasin')
      .populate('to', '_id nomMagasin');
      
    if (!transfer) {
      return res.status(404).json({ 
        success: false,
        error: 'Transfert non trouvé' 
      });
    }
    res.status(200).json({
      success: true,
      data: formatTransferResponse(transfer)
    });
  } catch (error) {
    handleErrors(res, error);
  }
};

exports.createTransfer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    // Vérifier que le magasin destination existe
    if (req.body.to) {
      const toStore = await Magasin.findById(req.body.to);
      if (!toStore) {
        return res.status(400).json({
          success: false,
          error: 'Magasin destination non trouvé'
        });
      }
    }

    // Calculer la quantité totale à partir des MOVEMENTS
    const quantity = req.body.MOVEMENTS 
      ? req.body.MOVEMENTS.reduce((sum, movement) => sum + (movement.Units || 0), 0)
      : 0;

    const newTransfer = new Transfer({
      ...req.body,
      quantity,
      createdBy: req.user.id
    });
    
    const savedTransfer = await newTransfer.save();
    
    // Repeupler les champs from et to pour la réponse
    const populatedTransfer = await Transfer.findById(savedTransfer._id)
      .populate('from', '_id nomMagasin')
      .populate('to', '_id nomMagasin');
    
    res.status(201).json({
      success: true,
      data: formatTransferResponse(populatedTransfer)
    });
  } catch (error) {
    handleErrors(res, error, 400);
  }
};

// Dans votre fichier de contrôleur de transfert

exports.updateTransfer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    // Vérifier que le magasin destination existe si modifié
    if (req.body.to) {
      const toStore = await Magasin.findById(req.body.to);
      if (!toStore) {
        return res.status(400).json({
          success: false,
          error: 'Magasin destination non trouvé'
        });
      }
    }

    // Si MOVEMENTS est modifié, recalculer la quantité
    if (req.body.MOVEMENTS) {
      req.body.quantity = req.body.MOVEMENTS.reduce((sum, movement) => sum + (movement.Units || 0), 0);
      
      // Vérifier si tous les codes-barres sont valides
      const allBarcodesValid = req.body.MOVEMENTS.every(
        movement => movement.flag_code_barre === 1 && movement.code_barre
      );
      req.body.all_barcodes_valid = allBarcodesValid;
    }

    // Utiliser findById puis save pour éviter les problèmes avec les sous-documents
    const transfer = await Transfer.findById(req.params.id);
    
    if (!transfer) {
      return res.status(404).json({ 
        success: false,
        error: 'Transfert non trouvé' 
      });
    }
    
    // Mettre à jour les propriétés du transfert
    Object.keys(req.body).forEach(key => {
      // Gérer les MOVEMENTS séparément pour éviter la création de nouveaux IDs
      if (key !== 'MOVEMENTS') {
        transfer[key] = req.body[key];
      }
    });
    
    // Si MOVEMENTS est présent, mettre à jour chaque mouvement individuellement
    if (req.body.MOVEMENTS) {
      // Pour chaque mouvement dans req.body.MOVEMENTS
      req.body.MOVEMENTS.forEach((updatedMovement, index) => {
        if (index < transfer.MOVEMENTS.length) {
          // Mettre à jour les propriétés du mouvement existant
          Object.keys(updatedMovement).forEach(key => {
            // Ne pas écraser _id
            if (key !== '_id') {
              transfer.MOVEMENTS[index][key] = updatedMovement[key];
            }
          });
        } else {
          // S'il s'agit d'un nouveau mouvement, l'ajouter
          transfer.MOVEMENTS.push(updatedMovement);
        }
      });
      
      // Si la liste des mouvements a été réduite
      if (req.body.MOVEMENTS.length < transfer.MOVEMENTS.length) {
        transfer.MOVEMENTS = transfer.MOVEMENTS.slice(0, req.body.MOVEMENTS.length);
      }
    }
    
    // Sauvegarder les modifications
    await transfer.save();
    
    // Repeupler les champs from et to pour la réponse
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('from', '_id nomMagasin')
      .populate('to', '_id nomMagasin');
    
    res.status(200).json({
      success: true,
      data: formatTransferResponse(populatedTransfer)
    });
  } catch (error) {
    handleErrors(res, error, 400);
  }
};

exports.getFlaggedTransfers = async (req, res) => {
  try {
    const { storeId } = req.query;
    const query = { Flag: 1 }; // Only get transfers with Flag=1
    
    if (storeId) {
      query.$or = [
        { 'from._id': storeId },
        { 'to._id': storeId }
      ];
    }
    
    const transfers = await Transfer.find(query)
      .populate('from', '_id nomMagasin')
      .populate('to', '_id nomMagasin')
      .sort({ Date: -1 })
      .exec();

    res.status(200).json({
      success: true,
      data: transfers.map(formatTransferResponse),
      count: transfers.length
    });
  } catch (error) {
    handleErrors(res, error);
  }
};

exports.deleteTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findByIdAndDelete(req.params.id);
    
    if (!transfer) {
      return res.status(404).json({ 
        success: false,
        error: 'Transfert non trouvé' 
      });
    }
    
    // Repeupler les champs from et to pour la réponse
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('from', '_id nomMagasin')
      .populate('to', '_id nomMagasin');
    
    res.status(200).json({
      success: true,
      message: 'Transfert supprimé avec succès',
      data: formatTransferResponse(populatedTransfer || transfer)
    });
  } catch (error) {
    handleErrors(res, error);
  }
}
,
exports.updateTransferGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { fromId, toId, date, documentNumbers, updates } = req.body;
    
    if ((!fromId || !toId || !date) && !documentNumbers) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants. Veuillez fournir fromId, toId, date ou documentNumbers.'
      });
    }

    // Vérification des magasins (votre code original)
    if (fromId) {
      const fromStore = await Magasin.findById(fromId);
      if (!fromStore) {
        return res.status(400).json({
          success: false,
          error: 'Magasin source non trouvé'
        });
      }
    }

    if (toId) {
      const toStore = await Magasin.findById(toId);
      if (!toStore) {
        return res.status(400).json({
          success: false,
          error: 'Magasin destination non trouvé'
        });
      }
    }

    // Base query (votre code original)
    let query = {
      status: { $ne: "Erreur" },
      Flag: { $ne: 1 }
    };
    
    // Modification uniquement ici pour combiner Document_Number ET Date
    if (documentNumbers && documentNumbers.length > 0) {
      query.Document_Number = { $in: documentNumbers };
      
      // Ajout de la date comme critère supplémentaire
      if (date) {
        const dateObj = new Date(date);
        const startOfDay = new Date(dateObj);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(dateObj);
        endOfDay.setUTCHours(23, 59, 59, 999);
        
        query.Date = { 
          $gte: startOfDay,
          $lte: endOfDay
        };
      }
      
      console.log('Using document numbers AND date for query:', { 
        documentNumbers, 
        dateRange: query.Date 
      });
    } else {
      // Votre logique originale pour fromId/toId/date
      const dateObj = new Date(date);
      const startOfDay = new Date(dateObj);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj);
      endOfDay.setUTCHours(23, 59, 59, 999);
      
      query.from = fromId;
      query.to = toId;
      query.Date = { 
        $gte: startOfDay,
        $lte: endOfDay
      };
    }
    
    // Le reste de votre code original reste inchangé
    console.log('Executing query:', JSON.stringify(query));
    
    const matchingTransfers = await Transfer.find(query).lean();
    console.log(`Found ${matchingTransfers.length} matching transfers`);

    if (matchingTransfers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucun transfert trouvé avec ces critères'
      });
    }

    // Prepare updates (votre code original)
    const updateData = {};
    if (updates.status) {
      updateData.status = updates.status;
      switch (updates.status) {
        case 'En cours': updateData.type = 'blue'; break;
        case 'Confirmé': updateData.type = 'green'; break;
        case 'En attente': updateData.type = 'orange'; break;
        case 'Annulé': updateData.type = 'red'; break;
      }
    }
    if (updates.date) updateData.Date = new Date(updates.date);
    if (fromId) updateData.from = fromId;
    if (toId) updateData.to = toId;

    // Update (votre code original)
    const result = await Transfer.updateMany(
      query,
      { $set: updateData },
      { runValidators: true }
    );

    // Response (votre code original)
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucun transfert trouvé avec ces critères'
      });
    }

    const updatedTransfers = await Transfer.find(query)
      .populate('from', '_id nomMagasin')
      .populate('to', '_id nomMagasin');

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} transfert(s) modifié(s) avec succès`,
      data: updatedTransfers.map(formatTransferResponse)
    });
  } catch (error) {
    console.error('Error updating transfer group:', error);
    handleErrors(res, error, 400);
  }
};
exports.updateBarcode = async (req, res) => {
  try {
    const { transferId, movementId, code_barre } = req.body;

    // Trouver le transfert
    const transfer = await Transfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'Transfert non trouvé'
      });
    }

    // Trouver le mouvement à mettre à jour
    const movement = transfer.MOVEMENTS.id(movementId);
    if (!movement) {
      return res.status(404).json({
        success: false,
        error: 'Mouvement non trouvé'
      });
    }

    // Mettre à jour le code-barres
    movement.code_barre = code_barre;
    movement.flag_code_barre = 1; // Marquer comme valide

    // Sauvegarder les modifications
    const updatedTransfer = await transfer.save();

    res.status(200).json({
      success: true,
      data: formatTransferResponse(updatedTransfer)
    });
  } catch (error) {
    handleErrors(res, error);
  }
};