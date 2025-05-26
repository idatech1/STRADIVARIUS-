const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  chemin_dossier: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const Folder = mongoose.model('Folder', folderSchema,'csv_folder_paths');

module.exports = Folder;