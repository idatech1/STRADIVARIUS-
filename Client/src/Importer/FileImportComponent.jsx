import React, { useState, useRef, useEffect } from 'react';
import { CloudUpload, X, Check, AlertCircle, ChevronDown, ChevronUp, Calendar, Edit } from 'lucide-react';
import Swal from 'sweetalert2';
import { getMagasins } from "../les apis/magasinService";
import api from '../les apis/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const FileImportComponent = () => {
    const [files, setFiles] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [fileAnalysis, setFileAnalysis] = useState({});
    const [expandedFile, setExpandedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // New state for global loader
    const fileInputRef = useRef(null);
    
    // États pour gérer les magasins
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const createTransferManuelAPI = async (transferData) => {
      try {
        setIsLoading(true); // Show loader
        const response = await api.post('/api/transfers-manuel', transferData);
        return response.data;
      } catch (error) {
        console.error('Erreur API:', error);
        const errorMessage = error.response?.data?.message || 'Erreur lors de la création du transfert manuel';
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false); // Hide loader
      }
    };

    // Fonction pour vérifier les codes-barres via l'API
    const checkBarcodes = async (barcodes) => {
      try {
        setIsLoading(true); // Show loader
        const response = await fetch('api/codes-barres/non-existants', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            codes_barres: barcodes
          })
        });
        
        if (!response.ok) {
          throw new Error('Erreur lors de la vérification des codes-barres');
        }
        
        const data = await response.json();
        return data.codes_non_existants || [];
      } catch (error) {
        console.error('Erreur lors de la vérification des codes-barres:', error);
        throw error;
      } finally {
        setIsLoading(false); // Hide loader
      }
    };

    // Récupération des magasins au chargement du composant
    useEffect(() => {
      const fetchActiveWarehouses = async () => {
        try {
          setLoading(true); 
          setIsLoading(true); // Show loader
          const response = await getMagasins('/api/magasins');
          
          // Vérifier si response.data existe et si c'est un tableau
          let warehouseData = [];
          
          if (response && response.data) {
            // Si c'est un objet avec une propriété data (structure { success: true, data: [...] })
            if (Array.isArray(response.data.data)) {
              warehouseData = response.data.data;
            } 
            // Si c'est directement un tableau
            else if (Array.isArray(response.data)) {
              warehouseData = response.data;
            }
          }
          
          // Filtrer pour ne garder que les magasins actifs
          const activeWarehouses = warehouseData.filter(warehouse => warehouse.statut === 'active');
          
          setWarehouses(activeWarehouses);
          setError(null);
        } catch (err) {
          console.error('Erreur lors de la récupération des magasins:', err);
          setError('Impossible de charger les magasins');
          setWarehouses([]);
        } finally {
          setLoading(false);
          setIsLoading(false); // Hide loader
        }
      };

      fetchActiveWarehouses();
    }, []);

    const handleFileUpload = (newFiles) => {
      if (newFiles && newFiles.length > 0) {
        const txtFiles = Array.from(newFiles).filter(file => 
          file.name.toLowerCase().endsWith('.txt')
        );
        
        if (txtFiles.length === 0) {
          alert("Veuillez sélectionner uniquement des fichiers .txt");
          return;
        }
        
        const filesWithIds = txtFiles.map(file => ({
          file,
          id: Date.now() + '-' + Math.random().toString(36).substr(2, 9)
        }));
        
        setFiles(prev => [...prev, ...filesWithIds]);
        
        filesWithIds.forEach(({file, id}) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target.result;
            parseFileContent(content, id);
          };
          reader.readAsText(file);
        });
      }
    };

// Fonction parseFileContent modifiée pour utiliser l'API
const parseFileContent = async (content, fileId) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  // Détecter le format du fichier à partir de la première ligne non vide
  const firstLine = lines[0];
  const isSimpleFormat = firstLine.split(';').length <= 2; // Format simple: "code;quantité"
  
  // Extraire tous les codes-barres du fichier
  const parsedBarcodes = [];
  
  lines.forEach(line => {
    let barcode, quantity;
    
    if (isSimpleFormat) {
      // Format simple: "code;quantité"
      const parts = line.split(';');
      if (parts.length >= 2) {
        barcode = parts[0].trim();
        quantity = parseInt(parts[1].trim()) || 1;
      }
    } else {
      // Format complexe: "0;40;5009083001015;;1;304;304"
      const parts = line.split(';');
      if (parts.length >= 5) {
        barcode = parts[2].trim();
        quantity = parseInt(parts[4].trim()) || 1;
      }
    }
    
    // Si le code-barres est valide, ajouter à la liste
    if (barcode && barcode.length > 0) {
      parsedBarcodes.push({
        barcode,
        quantity
      });
    }
  });
  
  // Récupérer seulement les codes-barres pour l'API
  const barcodesList = parsedBarcodes.map(item => item.barcode);
  
  try {
    // Vérification des codes-barres via l'API
    const invalidBarcodes = await checkBarcodes(barcodesList);
    
    // Mise à jour des informations sur l'existence des codes-barres
    const parsedItems = parsedBarcodes.map(item => ({
      ...item,
      exists: !invalidBarcodes.includes(item.barcode)
    }));
    
    const newAnalysis = {
      parsedData: parsedItems,
      invalidBarcodes: invalidBarcodes,
      format: isSimpleFormat ? 'simple' : 'complexe'
    };
    
    setFileAnalysis(prev => ({
      ...prev,
      [fileId]: newAnalysis
    }));
    
    if (parsedItems.length > 0) {
      if (invalidBarcodes.length > 0) {
        // Afficher l'alerte pour les codes-barres invalides
        Swal.fire({
          title: 'Attention',
          html: `
            <div style="text-align: left;">
              <p style="margin-bottom: 15px;">Des codes-barres ne sont pas valides:</p>
              <div style="max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                ${invalidBarcodes.map(barcode => `<div style="padding: 5px 0; border-bottom: 1px solid #eee;">${barcode}</div>`).join('')}
              </div>
            </div>
          `,
          icon: 'error',
          background: 'rgba(254, 226, 226, 0.9)',
          confirmButtonColor: '#ef4444',
          confirmButtonText: 'Compris',
          customClass: {
            container: 'swal-danger-container',
            popup: 'swal-danger-popup',
            title: 'swal-danger-title',
            htmlContainer: 'swal-danger-html'
          }
        });
      } else {
        showTransferDialog(parsedItems, fileId);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des codes-barres:', error);
    
    // En cas d'erreur, afficher un message d'erreur
    Swal.fire({
      title: 'Erreur',
      text: 'Une erreur est survenue lors de la vérification des codes-barres. Veuillez réessayer.',
      icon: 'error',
      confirmButtonColor: '#ef4444',
    });
  }
};

// Modifiez la fonction showTransferDialog pour supprimer le fichier après sauvegarde
const showTransferDialog = (parsedItems, fileId) => {
  const totalQuantity = parsedItems.reduce((total, item) => total + item.quantity, 0);
  
  const barcodeCounts = {};
  parsedItems.forEach(item => {
    if (barcodeCounts[item.barcode]) {
      barcodeCounts[item.barcode] += item.quantity;
    } else {
      barcodeCounts[item.barcode] = item.quantity;
    }
  });
  
  const detailsHtml = Object.entries(barcodeCounts)
    .map(([barcode, qty]) => `<tr><td>${barcode}</td><td>${qty}</td></tr>`)
    .join('');
  
  const today = new Date().toISOString().split('T')[0];
  
  // Générer les options de magasins pour les selecteurs
  const warehouseOptions = warehouses.map(warehouse => 
    `<option value="${warehouse.id}">${warehouse.nomMagasin || 'Magasin sans nom'}</option>`
  ).join('');
  
  const warehouseSelectHtml = `
    <option value="">Sélectionner</option>
    ${warehouseOptions}
  `;
  
  Swal.fire({
    title: 'Détails du Transfert manuel',
    html: `
        <div class="swal-form">
  <div class="form-grid">
    <div class="form-group">
      <label for="from-location">De :</label>
      <select id="from-location" class="swal2-input">
        ${warehouseSelectHtml}
      </select>
      ${loading ? '<div class="loading-spinner">Chargement...</div>' : ''}
      ${error ? `<div class="error-message">${error}</div>` : ''}
    </div>
    
    <div class="form-group">
      <label for="to-location">Vers :</label>
      <select id="to-location" class="swal2-input">
        ${warehouseSelectHtml}
      </select>
    </div>
    
    <div class="form-group">
     <label for="status">Statut :</label>
      <select id="status" class="swal2-input">
        <option value="En attente" selected>En attente</option>
        <option value="En cours">En cours</option>
        <option value="Confirmé">Confirmé</option>
        <option value="Annulé">Annulé</option>
      </select>
    </div>

    <div class="form-group">
       <label for="transfer-date">Date :</label>
      <div class="date-input-container">
        <input type="date" id="transfer-date" class="swal2-input" value="${today}">
      </div>
    </div>
    
    <div class="form-group">
      <label for="total-quantity">Quantité totale :</label>
      <input type="number" id="total-quantity" class="swal2-input" value="${totalQuantity}" readonly>
    </div>
    

  </div>
  
<div class="form-group">
<label>Codes-barres (${parsedItems.length} total, ${Object.keys(barcodeCounts).length} uniques):</label>
<div class="barcode-tags">
${parsedItems.map(item => 
  `<span class="barcode-tag">${item.barcode}</span>`).join('')}
</div>
</div>
  <div class="form-group">
    <h4>Détails des codes-barres :</h4>
    <div class="barcode-details">
      <table class="detail-table">
        <thead>
          <tr>
            <th>Code-barres</th>
            <th>Quantité</th>
          </tr>
        </thead>
        <tbody>
          ${detailsHtml}
        </tbody>
      </table>
    </div>
  </div>
</div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Confirmer le transfert',
    cancelButtonText: 'Annuler',
    width: '800px',
    customClass: {
      container: 'transfer-swal-container',
      popup: 'transfer-swal-popup',
      content: 'transfer-swal-content',
      confirmButton: 'swal-confirm-btn',
      cancelButton: 'swal-cancel-btn'
    },
    didOpen: () => {
      // Validation pour s'assurer que "De" et "Vers" ne sont pas les mêmes magasins
      const fromSelect = document.getElementById('from-location');
      const toSelect = document.getElementById('to-location');
      
      const validateLocations = () => {
        if (fromSelect.value && toSelect.value && fromSelect.value === toSelect.value) {
          toSelect.setCustomValidity('Le magasin de destination doit être différent du magasin source');
          return false;
        } else {
          toSelect.setCustomValidity('');
          return true;
        }
      };
      
      fromSelect.addEventListener('change', validateLocations);
      toSelect.addEventListener('change', validateLocations);
    },
    preConfirm: () => {
      const fromLocation = document.getElementById('from-location').value;
      const toLocation = document.getElementById('to-location').value;
      
      // Validation avant soumission
      if (!fromLocation) {
        Swal.showValidationMessage('Veuillez sélectionner un magasin source');
        return false;
      }
      
      if (!toLocation) {
        Swal.showValidationMessage('Veuillez sélectionner un magasin de destination');
        return false;
      }
      
      if (fromLocation === toLocation) {
        Swal.showValidationMessage('Le magasin de destination doit être différent du magasin source');
        return false;
      }
      
      // Récupération des noms des magasins sélectionnés
      const fromWarehouse = warehouses.find(w => w.id === fromLocation);
      const toWarehouse = warehouses.find(w => w.id === toLocation);
      
      return {
        fromLocation,
        fromLocationName: fromWarehouse ? fromWarehouse.nomMagasin : 'Inconnu',
        toLocation,
        toLocationName: toWarehouse ? toWarehouse.nomMagasin : 'Inconnu',
        transferDate: document.getElementById('transfer-date').value,
        status: document.getElementById('status').value,
        totalQuantity: document.getElementById('total-quantity').value,
        barcodes: barcodeCounts
      };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        // Appel à l'API pour créer le transfert manuel
        const apiResponse = await createTransferManuelAPI(result.value);
        
        console.log('Données du transfert manuel:', apiResponse.data);
        
        // Supprimer le fichier de la liste après sauvegarde réussie
        if (fileId) {
          setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
          setFileAnalysis(prev => {
            const newAnalysis = {...prev};
            delete newAnalysis[fileId];
            return newAnalysis;
          });
          if (expandedFile === fileId) {
            setExpandedFile(null);
          }
        }
        
        Swal.fire(
          'Transfert manuel créé!',
          `Le transfert manuel a été créé avec succès de ${result.value.fromLocationName} vers ${result.value.toLocationName}.`,
          'success'
        );
      } catch (error) {
        Swal.fire(
          'Erreur!',
          error.message,
          'error'
        );
      }
    }
  });
};

    const handleEditTransfer = (fileId) => {
      const analysis = fileAnalysis[fileId];
      if (analysis && analysis.parsedData.length > 0 && analysis.invalidBarcodes.length === 0) {
        showTransferDialog(analysis.parsedData, fileId);
      }
    };

    const handleRemoveFile = (idToRemove) => {
      setFiles(prevFiles => prevFiles.filter(f => f.id !== idToRemove));
      setFileAnalysis(prev => {
        const newAnalysis = {...prev};
        delete newAnalysis[idToRemove];
        return newAnalysis;
      });
      if (expandedFile === idToRemove) {
        setExpandedFile(null);
      }
    };
  
    const handleDragOver = (event) => {
      event.preventDefault();
      setIsDragOver(true);
    };
  
    const handleDragLeave = (event) => {
      event.preventDefault();
      setIsDragOver(false);
    };
  
    const handleDrop = (event) => {
      event.preventDefault();
      setIsDragOver(false);
      handleFileUpload(event.dataTransfer.files);
    };
  
    const handleFileInputChange = (event) => {
      handleFileUpload(event.target.files);
      event.target.value = null;
    };

    const toggleFileExpansion = (fileId) => {
      setExpandedFile(expandedFile === fileId ? null : fileId);
    };
  
    useEffect(() => {
      const style = document.createElement('style');
      style.innerHTML = `
        .transfer-swal-popup {
          width: 800px;
          max-width: 90vw;
        }
        
        .swal-form {
          text-align: left;
          margin-top: 20px;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .form-group {
          margin-bottom: 0;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          font-size: 14px;
          color: #4a5568;
        }
        
        .swal2-input, .swal2-select {
          width: 100%;
          padding: 10px 15px;
          border: 1px solid #e2e8f0;
          border-radius: 50px;
          background-color: #f8fafc;
          font-size: 14px;
          transition: all 0.2s;
          height: 40px;
          cursor: pointer;
          box-sizing: border-box;
        }
        
        .swal2-select, .swal2-input:focus {
          outline: none;
          cursor: pointer;
          border-color: #4299e1;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2);
        }
        
        .date-input-container {
          position: relative;
        }
        .swal-danger-container {
          backdrop-filter: blur(2px);
        }
        
        .swal-danger-popup {
          background: rgba(254, 226, 226, 0.95);
          border-left: 5px solid #ef4444;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
        }
        
        .swal-danger-title {
          color: #b91c1c;
          font-weight: 600;
        }
        
        .swal-danger-html {
          color: #7f1d1d;
        }
        .barcode-tags {
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #edf2f7;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          max-height: 150px;
          overflow-y: auto;
        }
        
        .barcode-tag {
          display: inline-block;
          padding: 4px 10px;
          background-color: #e2e8f0;
          border-radius: 20px;
          font-size: 12px;
          color: #2d3748;
        }
        
        .barcode-details {
          max-height: 200px;
          overflow-y: auto;
          margin-top: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        
        .detail-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .detail-table th, .detail-table td {
          border: 1px solid #e2e8f0;
          padding: 10px 12px;
          text-align: left;
          font-size: 13px;
        }
        
        .detail-table th {
          background-color: #f7fafc;
          font-weight: 600;
          color: #4a5568;
          position: sticky;
          top: 0;
        }
        
        .detail-table tr:nth-child(even) {
          background-color: #f8fafc;
        }
        
        .swal-confirm-btn {
          background-color: #4299e1 !important;
          border: none !important;
          padding: 8px 20px !important;
          border-radius: 6px !important;
          font-weight: 500 !important;
        }
        
        .swal-cancel-btn {
          background-color: #f7fafc !important;
          color: #4a5568 !important;
          border: 1px solid #e2e8f0 !important;
          padding: 8px 20px !important;
          border-radius: 6px !important;
          font-weight: 500 !important;
        }
        
        .loading-spinner {
          font-size: 12px;
          color: #4a5568;
          margin-top: 5px;
        }
        
        .error-message {
          font-size: 12px;
          color: #e53e3e;
          margin-top: 5px;
        }
        
        /* Loader CSS */
        .loader { 
          transform: rotateZ(45deg); 
          perspective: 1000px; 
          border-radius: 50%; 
          width: 100px; 
          height: 100px; 
          color: #4299e1; 
        } 
        
        .loader:before, 
        .loader:after { 
          content: ''; 
          display: block; 
          position: absolute; 
          top: 0; 
          left: 0; 
          width: inherit; 
          height: inherit; 
          border-radius: 50%; 
          transform: rotateX(70deg); 
          animation: 1s spin linear infinite; 
        } 
        
        .loader:after { 
          color: white; 
          transform: rotateY(70deg); 
          animation-delay: .4s; 
        } 
        
        @keyframes rotate { 
          0% { 
            transform: translate(-50%, -50%) rotateZ(0deg); 
          } 
          100% { 
            transform: translate(-50%, -50%) rotateZ(360deg); 
          } 
        } 
        
        @keyframes rotateccw { 
          0% { 
            transform: translate(-50%, -50%) rotate(0deg); 
          } 
          100% { 
            transform: translate(-50%, -50%) rotate(-360deg); 
          } 
        } 
        
        @keyframes spin { 
          0%, 100% { 
            box-shadow: .2em 0px 0 0px currentcolor; 
          } 
          12% { 
            box-shadow: .2em .2em 0 0 currentcolor; 
          } 
          25% { 
            box-shadow: 0 .2em 0 0px currentcolor; 
          } 
          37% { 
            box-shadow: -.2em .2em 0 0 currentcolor; 
          } 
          50% { 
            box-shadow: -.2em 0 0 0 currentcolor; 
          } 
          62% { 
            box-shadow: -.2em -.2em 0 0 currentcolor; 
          } 
          75% { 
            box-shadow: 0px -.2em 0 0 currentcolor; 
          } 
          87% { 
            box-shadow: .2em -.2em 0 0 currentcolor; 
          } 
        }
        
        .loader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }
        
        .loader-container {
          padding: 20px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .loader-text {
          margin-top: 15px;
          color: #4a5568;
          font-weight: 500;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }, []);
  
    return (
      <div className="relative w-300">
        {/* Loader Overlay */}
        {isLoading && (
          <div className="loader-overlay">
            <div className="loader-container">
              <span className="loader"></span>
            </div>
          </div>
        )}
        
        <div 
          className={`bg-white rounded-2xl border-3 p-4 text-center 
            ${isDragOver ? 'border-blue-900 bg-blue-50' : 'border-gray-300'}
            transition-all duration-300`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="mb-4">
            <CloudUpload 
              size={60} 
              className={`mx-auto mb-3 
                ${isDragOver ? 'text-blue-900' : 'text-black-500'}
                transition-colors duration-300`}
              strokeWidth={0.75}
            />
            <p className="text-gray-600 mb-3">
              {isDragOver ? 'Déposez vos fichiers ici' : 'Glissez vos fichiers .txt ici'}
            </p>
            <p className="text-gray-500 mb-3">ou</p>
            <input 
              type="file" 
              id="file-upload" 
              ref={fileInputRef}
              className="hidden" 
              onChange={handleFileInputChange}
              accept=".txt"
              multiple
            />
            <label 
              htmlFor="file-upload" 
              className="import_btn bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg cursor-pointer transition-colors duration-200"
            >
              Importer
            </label>
          </div>
        </div>
        <br />
        
        {files.map(({file, id}) => {
          const analysis = fileAnalysis[id];
          const allValid = analysis && analysis.parsedData.length > 0 && analysis.invalidBarcodes.length === 0;
          
          return (
            <div 
              key={id} 
              className="bg-white rounded-2xl border-3 border-blue-900 p-4 mb-4 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <button 
                    onClick={() => toggleFileExpansion(id)}
                    className="mr-2 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
                  >
                    {expandedFile === id ? 
                      <ChevronUp size={20} /> : 
                      <ChevronDown size={20} />
                    }
                  </button>
                  <h3 className="font-medium text-gray-700">
                    {file.name}
                    <span className="ml-2 text-sm text-gray-500">
                      ({(file.size / 1024).toFixed(2)} KB)
                    </span>
                  </h3>
                </div>
                
                <div className="flex items-center">
                  {analysis && (
                    <div className="mr-4 flex items-center">
                      <span className="text-sm text-gray-600 mr-2">
                        {analysis.parsedData.length} code-barres
                      </span>
                      {analysis.invalidBarcodes.length > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {analysis.invalidBarcodes.length} non trouvés
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Tous valides
                        </span>
                      )}
                    </div>
                  )}
                
                  <div className="flex space-x-2">
                    {allValid && (
                      <button
                        onClick={() => handleEditTransfer(id)}
                        className="edit_btn p-1 rounded-full hover:bg-blue-100 cursor-pointer text-blue-500"
                        title="Modifier"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleRemoveFile(id)}
                      className="remove_Inv p-1 rounded-full hover:bg-red-100 text-red-500"
                      title="Supprimer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              {expandedFile === id && analysis && (
                <div className="mt-4">
                  {analysis.invalidBarcodes.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-500 rounded-lg flex items-center">
                      <AlertCircle size={20} className="text-red-500 mr-2" />
                      <p className="text-sm text-red-700">
                        {analysis.invalidBarcodes.length} code(s) absent(s) de la base de données
                      </p>
                    </div>
                  )}
                  
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Code-barres</th>
                          <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                          <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 text-center">
                        {analysis.parsedData.map((item, idx) => (
                          <tr key={idx} className={!item.exists ? 'bg-red-50' : ''}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {item.barcode}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {item.exists ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <Check size={12} className="mr-1" /> Existant
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <X size={12} className="mr-1" /> 
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {files.length === 0 && (
          <div className="bg-white rounded-2xl border-3 border-gray-300 p-4 mb-4 text-center">
            <p className="text-gray-500">Aucun fichier importé</p>
          </div>
        )}
      </div>
    );
};

export default FileImportComponent;

//