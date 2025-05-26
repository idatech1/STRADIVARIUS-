const Folder = require('../models/folderModel');
const asyncHandler = require('express-async-handler');

const getFolderPath = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne();
  if (!folder) {
    res.status(404);
    throw new Error('Aucun chemin de dossier trouvé');
  }
  res.status(200).json(folder);
});

const updateFolderPath = asyncHandler(async (req, res) => {
  const { chemin_dossier } = req.body;
  
  if (!chemin_dossier) {
    res.status(400);
    throw new Error('Veuillez fournir un chemin de dossier');
  }

  let folder = await Folder.findOne();

  if (!folder) {
    folder = await Folder.create({ chemin_dossier });
  } else {
    folder.chemin_dossier = chemin_dossier;
    await folder.save();
  }

  res.status(200).json(folder);
});

module.exports = {
  getFolderPath,
  updateFolderPath
};