import React, { useState, useEffect } from 'react';
import { Boxes, ChevronDown, ChevronRight, Edit, AlertCircle, FilePenLine } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useTransferOptions } from './useTransferOptions'; // Importer le hook
import '../../Css/calendriertransfer.css'
import api from '../../les apis/api';

const MySwal = withReactContent(Swal);

// Fonction pour le groupement des transferts
const groupTransfers = (transfers) => {
  if (!transfers || !Array.isArray(transfers)) return [];

  const inventories = transfers.filter((t) => t.showBoxIcon);
  const transferGroups = {};

  transfers
    .filter((t) => !t.showBoxIcon)
    .forEach((transfer) => {
      const key = `${transfer.from}|${transfer.to}`;

      if (!transferGroups[key]) {
        transferGroups[key] = {
          isGroup: true,
          groupKey: key,
          from: transfer.from,
          to: transfer.to,
          fromName: transfer.fromName,
          toName: transfer.toName,
          transfers: [],
          type: transfer.type,
          statusCounts: {
            'En cours': 0,
            'Confirmé': 0,
            'En attente': 0,
            'Annulé': 0,
          },
          totalQuantity: 0,
          documentNumbers: [],
          // Ajouter cette ligne pour initialiser Id_Store
          Id_Store: transfer.Id_Store || null
        };
      }

      transferGroups[key].transfers.push(transfer);
      transferGroups[key].statusCounts[transfer.status]++;
      transferGroups[key].totalQuantity += parseInt(transfer.quantity || 0);
      
      // Si Id_Store n'est pas défini dans le groupe mais existe dans le transfert actuel
      if (!transferGroups[key].Id_Store && transfer.Id_Store) {
        transferGroups[key].Id_Store = transfer.Id_Store;
      }
      
      if (transfer.Document_Number && !transferGroups[key].documentNumbers.includes(transfer.Document_Number)) {
        transferGroups[key].documentNumbers.push(transfer.Document_Number);
      }

      const typePriority = {
        orange: 1,
        red: 2,
        blue: 3,
        green: 4,
      };

      if (typePriority[transfer.type] < typePriority[transferGroups[key].type]) {
        transferGroups[key].type = transfer.type;
      }
    });

  return [...inventories, ...Object.values(transferGroups)];
};

const CalendarGrid = ({
  transfersData,
  selectedDay,
  selectDay,
  handleTransferClick,
  selectedTransfer,
  getDotColor,
  getBorderColor,
  getBgColor,
  updateTransfer,
  setTransfersData,
  fetchAllTransfers, // Add this prop
  formatDateToKey, // Add this prop // Ajout de cette prop
  setAllTransfers,
  setIsLoading,
  setError
}) => {
  const transferOptions = useTransferOptions();
  const [expandedGroups, setExpandedGroups] = useState({});
  const getTypeFromStatus = (status) => {
    switch (status) {
      case 'En cours': return 'blue';
      case 'Confirmé': return 'green';
      case 'En attente': return 'orange';
      case 'Annulé': return 'red';
      default: return 'blue';
    }
  };
const hasInvalidBarcodes = (transfer) => {
  // Vérifie le champ all_barcodes_valid au niveau du document (s'il existe)
  if (transfer.hasOwnProperty('all_barcodes_valid') && transfer.all_barcodes_valid === 0) {
    return true;
  }
  
  // Vérifie les flag_code_barre dans les mouvements (s'ils existent)
  if (transfer.MOVEMENTS && Array.isArray(transfer.MOVEMENTS)) {
    return transfer.MOVEMENTS.some(movement => 
      movement.hasOwnProperty('flag_code_barre') && movement.flag_code_barre === 0
    );
  }
  
  // Si le transfert a un attribut hasInvalidBarcodes ou invalidBarcodes
  if (transfer.hasInvalidBarcodes || transfer.invalidBarcodes) {
    return true;
  }
  
  return false;
}
  // Fonction pour synchroniser les noms des magasins
  const syncWarehouseNames = (transfers) => {
    if (!transfers || !Array.isArray(transfers) || transferOptions.fromOptions.length === 0) {
      return transfers;
    }

    return transfers.map(transfer => {
      if (transfer.showBoxIcon) return transfer;
      
      const fromWarehouse = transferOptions.fromOptions.find(opt => opt.value === transfer.from);
      const toWarehouse = transferOptions.toOptions.find(opt => opt.value === transfer.to);
      
      return {
        ...transfer,
        fromName: (fromWarehouse && (transfer.fromName === "Magasin inconnu" || !transfer.fromName)) 
                  ? fromWarehouse.label 
                  : transfer.fromName,
        toName: (toWarehouse && (transfer.toName === "Magasin inconnu" || !transfer.toName)) 
                ? toWarehouse.label 
                : transfer.toName
      };
    });
  };

  const getMaxTransfersCount = () => {
    if (!transfersData) return 0;
    
    return Math.max(
      ...Object.values(transfersData).map(dayData => {
        const groupedTransfers = groupTransfers(dayData.transfers || []);
        return groupedTransfers.length;
      })
    );
  };

  const maxTransfersCount = Math.max(getMaxTransfersCount(), 10) + 5;

  const checkMagasinExists = (magasinName, magasinId) => {
    if (magasinId && transferOptions.fromOptions.some(opt => opt.value === magasinId)) {
      return true;
    }
    
    if (!magasinName) return true;
    
    const normalizedInput = magasinName.trim().toLowerCase();
    const stradiNormalizedInput = normalizedInput.replace(/^stradi\s+/i, '');
    
    return transferOptions.fromOptions.some((option) => {
      const optionName = option.label.toLowerCase();
      const optionRawName = option.rawName ? option.rawName.toLowerCase() : 
                           optionName.replace(/^stradi\s+/i, '');
      
      return optionRawName === stradiNormalizedInput || 
             optionName === normalizedInput ||
             stradiNormalizedInput.includes(optionRawName) ||
             optionRawName.includes(stradiNormalizedInput);
    });
  };

  useEffect(() => {
    if (transfersData && transferOptions.fromOptions.length > 0) {
      const updatedTransfersData = { ...transfersData };
      
      Object.keys(updatedTransfersData).forEach(day => {
        if (updatedTransfersData[day].transfers) {
          updatedTransfersData[day].transfers = syncWarehouseNames(updatedTransfersData[day].transfers);
        }
      });
    }
  }, [transfersData, transferOptions.fromOptions]);

  const showNonStradiAlert = (magasinName, type) => {
    MySwal.fire({
      icon: 'warning',
      title: 'Magasin non référencé',
      html: `<div class="text-center">
              <p>Le magasin ${type === 'source' ? 'source' : 'destination'} <strong>"${magasinName}"</strong> n'appartient pas aux magasins Stradi actifs.</p>
              <p class="mt-2">Veuillez vérifier l'orthographe ou contacter l'administrateur pour ajouter ce magasin.</p>
            </div>`,
      showConfirmButton: true,
      confirmButtonText: 'Compris',
      confirmButtonColor: '#3085d6',
    });
  };

  const toggleGroup = (groupKey, e) => {
    e.stopPropagation();
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const showGroupDetails = (groupData, dayData, e) => {
    e.stopPropagation();
  
    // Si le groupe contient un seul transfert, rediriger vers les détails du transfert
    if (groupData.transfers.length === 1) {
      showTransferDetails(groupData.transfers[0], dayData, e);
      return;
    }
  
    const fromExists = checkMagasinExists(groupData.fromName, groupData.from);
    const toExists = checkMagasinExists(groupData.toName, groupData.to);
    const hasInvalidBarcodesFlag = groupData.transfers.some(t => hasInvalidBarcodes(t));
    
    const updateEntireGroup = async (updatedValues) => {
      // Vérifier que les magasins source et destination sont différents
      if (updatedValues.from === updatedValues.to) {
        MySwal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Les magasins source et destination doivent être différents.',
          confirmButtonColor: '#3085d6',
        });
        return;
      }
    
      try {
        // Validation de la date
        const dateInput = document.getElementById('group-date').value;
        if (!dateInput) {
          throw new Error('Date is required');
        }
    
        const formattedDate = new Date(dateInput).toISOString().split('T')[0];
        const documentNumbers = groupData.transfers.map((transfer) => transfer.Document_Number);
    
        const updateData = {
          fromId: updatedValues.from || groupData.from,
          toId: updatedValues.to || groupData.to,
          date: formattedDate,
          documentNumbers: documentNumbers,
          updates: {
            status: updatedValues.status,
            date: formattedDate,
          },
        };
    
        const response = await api.put('/api/transfers/group', updateData);
    
        if (response.data.success) {
          MySwal.fire({
            background: 'transparent',
            title: '<span class="text-white">Mise à jour effectuée !</span>',
            html: `<span class="text-white">${response.data.message}</span>`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            customClass: {
              popup: 'bg-transparent',
              title: 'text-white',
              content: 'text-white',
            },
          });
    
          // Mise à jour locale des données pour éviter un rechargement complet
          setTransfersData((prevData) => {
            const updatedTransfersData = { ...prevData };
            const dateStr = formatDateToKey(new Date(formattedDate));
    
            // Parcourir chaque transfert du groupe pour mettre à jour les données
            groupData.transfers.forEach((transfer) => {
              const oldDateStr = formatDateToKey(new Date(transfer.date));
              const fromName = transferOptions.fromOptions.find((opt) => opt.value === updateData.fromId)?.label || groupData.fromName;
              const toName = transferOptions.toOptions.find((opt) => opt.value === updateData.toId)?.label || groupData.toName;
    
              // Mettre à jour le transfert
              const updatedTransfer = {
                ...transfer,
                from: updateData.fromId,
                to: updateData.toId,
                fromName,
                toName,
                status: updateData.updates.status,
                date: formattedDate,
                type: getTypeFromStatus(updateData.updates.status),
              };
    
              // Si la date a changé, déplacer le transfert vers la nouvelle date
              if (oldDateStr !== dateStr) {
                // Supprimer de l'ancienne date
                if (updatedTransfersData[oldDateStr]) {
                  updatedTransfersData[oldDateStr].transfers = updatedTransfersData[oldDateStr].transfers.filter(
                    (t) => t.Document_Number !== transfer.Document_Number
                  );
                  if (updatedTransfersData[oldDateStr].transfers.length === 0) {
                    delete updatedTransfersData[oldDateStr];
                  }
                }
              }
    
              // Ajouter ou mettre à jour à la nouvelle date
              if (!updatedTransfersData[dateStr]) {
                updatedTransfersData[dateStr] = {
                  date: String(new Date(formattedDate).getDate()),
                  transfers: [],
                  fullDate: dateStr,
                };
              }
    
              const existingIndex = updatedTransfersData[dateStr].transfers.findIndex(
                (t) => t.Document_Number === transfer.Document_Number
              );
              if (existingIndex !== -1) {
                updatedTransfersData[dateStr].transfers[existingIndex] = updatedTransfer;
              } else {
                updatedTransfersData[dateStr].transfers.push(updatedTransfer);
              }
            });
    
            return updatedTransfersData;
          });
    
          // Rafraîchir toutes les données des transferts en arrière-plan
          await fetchAllTransfers(setAllTransfers, setIsLoading, setError);
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour du groupe:', error);
        MySwal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error.response?.data?.error || 'Échec de la mise à jour du groupe',
        });
      }
    };
  
    MySwal.fire({
      background: '#fff',
      title: `<div class="text-xl font-semibold text-black">
                Transferts de ${groupData.fromName} vers ${groupData.toName}
              </div>`,
      html: `
        <div class="p-4 space-y-6">
          <div class="text-black font-medium">
            ${groupData.transfers.length} transfert(s) • Total: ${groupData.totalQuantity} articles
          </div>
        ${hasInvalidBarcodesFlag ? `
          <div class="flex items-center p-2 mb-2 bg-red-100 border-l-4 border-red-500 text-red-700">
            <svg class="mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Certains codes-barres ne sont pas valides.</span>
            <button 
              id="fix-barcodes-btn" 
              class="ml-auto px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            >
              <a href="/barcode" class="text-white-600 hover:underline">
                  Corriger les codes-barres →
                </a>
            </button>
          </div>
        ` : ''}
          ${!fromExists ? `
            <div class="flex items-center p-2 mb-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>Le magasin source "${groupData.fromName}" n'appartient pas aux magasins Stradi actifs.</span>
             
            </div>
          ` : ''}
  
          ${!toExists ? `
            <div class="flex items-center p-2 mb-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>Le magasin destination "${groupData.toName}" n'appartient pas aux magasins Stradi actifs.</span>
              
            </div>
          ` : ''}
  
          ${groupData.transfers.length > 1 && !hasInvalidBarcodesFlag ? `
            <div class="bg-gray-50 p-4 rounded-lg border mb-6">
              <button id="toggle-group-edit-btn" class="w-full flex justify-between items-center cursor-pointer p-3 bg-gray-100 hover:bg-gray-200 transition-colors duration-200 rounded mb-4">
                <span class="font-medium">Modifier tout le groupe</span>
                <svg id="edit-toggle-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transform transition-transform duration-200 rotate-0">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
  
              <div id="group-edit-form" class="max-h-0 overflow-hidden transition-all duration-300 ease-in-out">
                <div id="error-message" class="hidden text-red-600 text-sm mb-2"></div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">De :</label>
                    <select id="group-from" class="w-full p-2 border border-gray-300 rounded">
                      <option value="${groupData.from}" data-name="${groupData.fromName}" selected>${groupData.fromName}</option>
                      ${transferOptions.fromOptions
                        .map(
                          (option) =>
                            option.value !== groupData.from
                              ? `<option value="${option.value}" data-name="${option.label}">${option.label}</option>`
                              : ''
                        )
                        .join('')}
                    </select>
                  </div>
  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Vers :</label>
                    <select id="group-to" class="w-full p-2 border border-gray-300 rounded">
                      <option value="${groupData.to}" data-name="${groupData.toName}" selected>${groupData.toName}</option>
                      ${transferOptions.toOptions
                        .map(
                          (option) =>
                            option.value !== groupData.to
                              ? `<option value="${option.value}" data-name="${option.label}">${option.label}</option>`
                              : ''
                        )
                        .join('')}
                    </select>
                  </div>
  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Statut :</label>
                    <select id="group-status" class="w-full p-2 border border-gray-300 rounded">
                      ${transferOptions.statusOptions
                        .map((status) => `<option value="${status}">${status}</option>`)
                        .join('')}
                    </select>
                  </div>
  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Date :</label>
                    <input type="date" id="group-date" class="w-full p-2 border border-gray-300 rounded">
                  </div>
                </div>
                
                <div class="flex justify-between items-center mb-2">
                  <div class="text-black font-medium">
                    N° Documents: 
                    <span id="document-numbers-display">${groupData.documentNumbers.join(' | ')}</span>
                    <span id="document-numbers-hidden" class="hidden">•••••••</span>
                  </div>
                  <button id="toggle-doc-numbers-btn" class="p-1 text-gray-500 cursor-pointer hover:text-blue-500 focus:outline-none">
                    <svg id="eye-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <svg id="eye-off-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hidden">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  </button>
                </div>
  
                <button 
                  id="update-group-btn" 
                  class="w-full p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  disabled
                >
                  Mettre à jour tous les transferts
                </button>
              </div>
            </div>
          ` : hasInvalidBarcodesFlag ? `
            <div class="bg-gray-50 p-4 rounded-lg border mb-6">
              <div class="flex items-center p-2 bg-red-50 border-l-4 border-red-500 rounded">
                <svg class="mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span class="text-red-700">Les modifications sont bloquées jusqu'à la correction des codes-barres.</span>
              </div>
            </div>
          ` : ''}
  
          <div class="mt-4 border rounded-lg overflow-hidden">
            <button id="toggle-transfers-btn" class="w-full flex justify-between cursor-pointer items-center p-3 bg-gray-100 hover:bg-gray-200 transition-colors duration-200">
              <span class="font-medium">Liste des transferts</span>
              <svg id="toggle-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transform transition-transform duration-200 rotate-0">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
  
            <div id="transfers-list" class="divide-y max-h-0 overflow-hidden transition-all duration-300 ease-in-out">
              <!-- Barre de recherche élégante -->
              <div class="relative px-4 pt-4 pb-4">
              
                <input 
                  type="text" 
                  id="transfer-search" 
                  class="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Rechercher par numéro de document..."
                >
                <div id="search-clear" class="absolute inset-y-0 right-6 flex items-center pr-3 cursor-pointer hidden">
                  <svg class="w-4 h-4 text-gray-500 hover:text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
  <!-- Liste des transferts -->
              <div id="transfer-items-container">
                ${groupData.transfers
                  .map(
                    (transfer, index) => `
                    <div class="py-4 px-3 hover:bg-gray-50 transfer-item" data-document-number="${transfer.Document_Number}">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center">
                          <div class="w-3 h-3 rounded-full ${getDotColor(transfer.type)} mr-2"></div>
                          <span class="font-medium document-number">
                            N° ${transfer.Document_Number}
                            ${hasInvalidBarcodes(transfer) ? 
                              `<span class="ml-2 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Codes-barres invalides</span>` 
                              : ''}
                          </span>
                        </div>
                        <span class="font-medium">ID STORE : ${transfer.Id_Store}</span>                      

                        <div class="flex items-center space-x-3">
                          <button
                            class="p-2 edit_trans text-gray-500 hover:text-blue-500 edit-transfer-btn"
                            data-index="${index}"
                            ${hasInvalidBarcodes(transfer) ? 'disabled' : ''}
                            ${hasInvalidBarcodes(transfer) ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}
                             ${hasInvalidBarcodesFlag ? 'disabled' : ''}
                            ${hasInvalidBarcodesFlag ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                        </div>
                      </div>
                      <div class="mt-2 text-gray-600 text-sm grid grid-cols-2 gap-2">
                        <div>Quantité: ${transfer.quantity}</div>
                        <div class="flex items-center">
                          Statut:
                          <span class="w-3 h-3 rounded-full ${getDotColor(transfer.type)} ml-2"></span>
                          ${transfer.status}
                        </div>
                        <div>Date: ${transfer.date}</div>
                        ${hasInvalidBarcodes(transfer) ? 
                          `<div class="col-span-2 text-xs text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" class="inline mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            Ce transfert contient des codes-barres non valides. Veuillez les corriger avant de pouvoir modifier ce transfert.
                          </div>` 
                          : ''}
                      </div>
                    </div>
                  `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Fermer',
      customClass: {
        confirmButton: 'custom-swal-ferme-button',
      },
      width: '700px',
      didRender: () => {
        // Fonction pour basculer uniquement les numéros de document dans la section "Modifier tout le groupe"
        const toggleGroupDocNumbers = () => {
          const docDisplay = document.getElementById('document-numbers-display');
          const docHidden = document.getElementById('document-numbers-hidden');
          
          // Ajouter la gestion du bouton de correction des codes-barres
          const fixBarcodesBtn = document.getElementById('fix-barcodes-btn');
          if (fixBarcodesBtn) {
            fixBarcodesBtn.addEventListener('click', () => {
              window.location.href = '/barcode';
              MySwal.close();
            });
          }
          
          // Ajouter la gestion des boutons d'ajout de magasin
          const addStoreFromBtn = document.getElementById('add-store-from-btn');
          if (addStoreFromBtn) {
            addStoreFromBtn.addEventListener('click', () => {
              const userStr = localStorage.getItem('user');
              const user = userStr ? JSON.parse(userStr) : { role: 'User' };
              
              if (user.role === 'Admin') {
                localStorage.setItem('magasinToAdd', groupData.fromName);
                window.location.href = '/magasin?add=' + encodeURIComponent(groupData.fromName);
                MySwal.close();
              } else {
                MySwal.fire({
                  icon: 'error',
                  title: 'Accès interdit',
                  text: "Vous n'avez pas les droits pour ajouter un magasin. Veuillez contacter l'administrateur de l'application Stradivarius.",
                  confirmButtonColor: '#3085d6',
                });
              }
            });
          }
          
          const addStoreToBtn = document.getElementById('add-store-to-btn');
          if (addStoreToBtn) {
            addStoreToBtn.addEventListener('click', () => {
              const userStr = localStorage.getItem('user');
              const user = userStr ? JSON.parse(userStr) : { role: 'User' };
              
              if (user.role === 'Admin') {
                localStorage.setItem('magasinToAdd', groupData.toName);
                window.location.href = '/magasin?add=' + encodeURIComponent(groupData.toName);
                MySwal.close();
              } else {
                MySwal.fire({
                  icon: 'error',
                  title: 'Accès interdit',
                  text: "Vous n'avez pas les droits pour ajouter un magasin. Veuillez contacter l'administrateur de l'application Stradivarius.",
                  confirmButtonColor: '#3085d6',
                });
              }
            });
          }
          
          if (docDisplay && docHidden) {
            docDisplay.classList.toggle('hidden');
            docHidden.classList.toggle('hidden');
          }
          
          // Basculer les icônes d'œil
          document.getElementById('eye-icon').classList.toggle('hidden');
          document.getElementById('eye-off-icon').classList.toggle('hidden');
        };
        const searchInput = document.getElementById('transfer-search');
        const searchClear = document.getElementById('search-clear');
        const transferItems = document.querySelectorAll('.transfer-item');

        searchInput.addEventListener('input', (e) => {
          const searchTerm = e.target.value.toLowerCase();
          let hasResults = false;

          // Animation de recherche
          searchInput.classList.remove('animate-pulse');
          void searchInput.offsetWidth; // Trigger reflow
          searchInput.classList.add('animate-pulse');

          setTimeout(() => {
            transferItems.forEach(item => {
              const docNumber = item.getAttribute('data-document-number').toLowerCase();
              const isVisible = docNumber.includes(searchTerm);
              
              item.style.display = isVisible ? '' : 'none';
              if (isVisible) hasResults = true;
              
              // Animation pour les éléments qui apparaissent
              if (isVisible) {
                item.style.opacity = '0';
                item.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                  item.style.opacity = '1';
                }, 10);
              }
            });

            // Afficher/masquer le bouton de suppression de recherche
            if (searchTerm.length > 0) {
              searchClear.classList.remove('hidden');
            } else {
              searchClear.classList.add('hidden');
            }

            // Message si aucun résultat
            const noResultsMsg = document.getElementById('no-results-message');
            if (!hasResults && searchTerm.length > 0) {
              if (!noResultsMsg) {
                const msg = document.createElement('div');
                msg.id = 'no-results-message';
                msg.className = 'py-4 text-center text-gray-500 italic';
                msg.textContent = 'Aucun transfert trouvé avec ce numéro de document';
                document.getElementById('transfer-items-container').appendChild(msg);
              }
            } else if (noResultsMsg) {
              noResultsMsg.remove();
            }

            searchInput.classList.remove('animate-pulse');
          }, 300);
        });

        // Effacer la recherche
        searchClear.addEventListener('click', () => {
          searchInput.value = '';
          searchClear.classList.add('hidden');
          transferItems.forEach(item => {
            item.style.display = '';
            item.style.opacity = '0';
            setTimeout(() => {
              item.style.opacity = '1';
            }, 10);
          });
          
          const noResultsMsg = document.getElementById('no-results-message');
          if (noResultsMsg) noResultsMsg.remove();
          
          // Animation de retour
          searchInput.focus();
          searchInput.classList.add('animate-pulse');
          setTimeout(() => {
            searchInput.classList.remove('animate-pulse');
          }, 300);
        });

        // Ajouter un écouteur d'événement pour le bouton de masquage dans la section d'édition
        const toggleDocBtn = document.getElementById('toggle-doc-numbers-btn');
        if (toggleDocBtn) {
          toggleDocBtn.addEventListener('click', toggleGroupDocNumbers);
        }
  
        if (groupData.transfers.length > 1 && !hasInvalidBarcodesFlag) {
          // Initialiser la date et le statut comme avant
          if (groupData.transfers.length > 0) {
            const firstTransfer = groupData.transfers[0];
            const dateInput = document.getElementById('group-date');
            if (dateInput && firstTransfer.date) {
              const convertToDateInput = (dateStr) => {
                if (!dateStr) return '';
                if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
                const [day, month, year] = dateStr.split('/');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              };
              dateInput.value = convertToDateInput(firstTransfer.date);
            }
  
            const statusCounts = groupData.statusCounts;
            let mostCommonStatus = 'En cours';
            let maxCount = 0;
  
            for (const [status, count] of Object.entries(statusCounts)) {
              if (count > maxCount) {
                mostCommonStatus = status;
                maxCount = count;
              }
            }
  
            const statusSelect = document.getElementById('group-status');
            if (statusSelect) {
              statusSelect.value = mostCommonStatus;
            }
          }
  
          // Gestion du toggle pour la section "Modifier tout le groupe"
          const toggleGroupEditBtn = document.getElementById('toggle-group-edit-btn');
          const groupEditForm = document.getElementById('group-edit-form');
          const editToggleIcon = document.getElementById('edit-toggle-icon');
          const updateGroupBtn = document.getElementById('update-group-btn');
          const fromSelect = document.getElementById('group-from');
          const toSelect = document.getElementById('group-to');
          const errorMessage = document.getElementById('error-message');
  
          let isGroupEditExpanded = false;
          groupEditForm.style.maxHeight = '0';
          editToggleIcon.style.transform = 'rotate(-90deg)';
  
          toggleGroupEditBtn.addEventListener('click', () => {
            isGroupEditExpanded = !isGroupEditExpanded;
            if (isGroupEditExpanded) {
              const height = groupEditForm.scrollHeight + 'px';
              groupEditForm.style.maxHeight = height;
              editToggleIcon.style.transform = 'rotate(0deg)';
            } else {
              groupEditForm.style.maxHeight = '0';
              editToggleIcon.style.transform = 'rotate(-90deg)';
            }
          });
  
          // Validation en temps réel des magasins
          const validateStores = () => {
            const fromValue = fromSelect.value;
            const toValue = toSelect.value;
  
            if (fromValue === toValue && fromValue !== '') {
              errorMessage.classList.remove('hidden');
              errorMessage.textContent = 'Les magasins source et destination doivent être différents.';
              updateGroupBtn.disabled = true;
            } else {
              errorMessage.classList.add('hidden');
              errorMessage.textContent = '';
              updateGroupBtn.disabled = false;
            }
          };
  
          fromSelect.addEventListener('change', validateStores);
          toSelect.addEventListener('change', validateStores);
  
          // Appel initial pour valider l'état actuel
          validateStores();
  
          // Gestion de la mise à jour
          updateGroupBtn.addEventListener('click', async () => {
            const status = document.getElementById('group-status').value;
            const date = document.getElementById('group-date').value;
            const fromValue = fromSelect.value;
            const toValue = toSelect.value;
            const fromName = fromSelect.options[fromSelect.selectedIndex].getAttribute('data-name');
            const toName = toSelect.options[toSelect.selectedIndex].getAttribute('data-name');
  
            await updateEntireGroup({ status, date, from: fromValue, to: toValue, fromName, toName });
          });
        }
  
        // Gestion des boutons d'édition des transferts individuels
        document.querySelectorAll('.edit-transfer-btn').forEach((btn) => {
          if (!hasInvalidBarcodesFlag) {
            btn.addEventListener('click', (e) => {
              const index = parseInt(btn.getAttribute('data-index'));
              const transfer = groupData.transfers[index];
              MySwal.close();
              showTransferDetails(transfer, dayData, e);
            });
          }
        });
  
        // Gestion du toggle pour la liste des transferts
        const toggleBtn = document.getElementById('toggle-transfers-btn');
        const transfersList = document.getElementById('transfers-list');
        const toggleIcon = document.getElementById('toggle-icon');
  
        let isExpanded = false;
        transfersList.style.maxHeight = '0';
        toggleIcon.style.transform = 'rotate(-90deg)';
  
        toggleBtn.addEventListener('click', () => {
          isExpanded = !isExpanded;
          if (isExpanded) {
            const height = transfersList.scrollHeight + 'px';
            transfersList.style.maxHeight = height;
            toggleIcon.style.transform = 'rotate(0deg)';
          } else {
            transfersList.style.maxHeight = '0';
            toggleIcon.style.transform = 'rotate(-90deg)';
          }
        });
      },
    });
  };
 const showTransferDetails = (transfer, dayData, e) => {
  if (!transfer) return;
  e && e.stopPropagation();

  const isManualTransfer = transfer.isManualTransfer;
  const fromExists = transfer.showBoxIcon ? true : checkMagasinExists(transfer.fromName, transfer.from);
  const toExists = checkMagasinExists(transfer.toName, transfer.to);
  const hasInvalidBarcodesFlag = hasInvalidBarcodes(transfer);

  const convertToDateInput = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const totalQuantity = isManualTransfer
    ? transfer.items?.reduce((total, item) => total + (item.quantity || 0), 0) || transfer.quantity || 0
    : transfer.quantity || 0;

  const barcodeCounts = {};
  if (isManualTransfer && transfer.items) {
    transfer.items.forEach((item) => {
      barcodeCounts[item.barcode] = (barcodeCounts[item.barcode] || 0) + (item.quantity || 0);
    });
  }

  MySwal.fire({
    background: transfer.showBoxIcon ? '#fff' : '#FFF',
    html: `
      <div class="p-4 space-y-4">
        <div class="text-transfer font-semibold mb-4 text-black">
          Détails ${transfer.showBoxIcon ? "de l'Inventaire" : isManualTransfer ? "du Transfert Manuel" : "du Transfert"}
        </div>

        ${hasInvalidBarcodesFlag ? `
          <div class="p-4 mb-4 bg-red-50 border-l-4 border-red-500 rounded">
            <div class="flex items-center text-red-700 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>Codes-barres invalides détectés</span>
            </div>
            <div class="mt-2 text-sm">
              <p>Ce transfert contient des codes-barres non valides.</p>
              <div class="mt-3">
                <a href="/barcode" class="text-blue-600 hover:underline">
                  Corriger les codes-barres →
                </a>
              </div>
            </div>
          </div>
        ` : ''}

        ${!transfer.showBoxIcon && !fromExists ? `
          <div class="flex items-center p-2 mb-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>Le magasin source "${transfer.fromName}" n'appartient pas aux magasins Stradi actifs.</span>
          </div>
        ` : ''}

        ${!toExists ? `
          <div class="flex items-center p-2 mb-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>Le magasin ${transfer.showBoxIcon ? '' : 'destination '}"${transfer.toName}" n'appartient pas aux magasins Stradi actifs.</span>
          </div>
        ` : ''}

        ${transfer.showBoxIcon ? `
          <div class="grid grid-cols-2 gap-4">
            <div>
              <strong class="block mb-1 text-black">Emplacement :</strong>
              <select
                name="to"
                id="to-select"
                class="w-full p-2 border border-black-500 text-black bg-black-500/20 rounded"
                ${hasInvalidBarcodesFlag ? 'disabled' : ''}
              >
                ${transferOptions.toOptions.map((option, index) => `
                  <option key="${index}" value="${option.value}" ${option.value === transfer.to ? 'selected' : ''} class="text-black">
                    ${option.label}
                  </option>
                `).join('')}
              </select>
            </div>
            <div>
              <strong class="block mb-1 text-black">Date :</strong>
              <input
                type="date"
                name="date"
                value="${convertToDateInput(transfer.date || '')}"
                class="w-full p-2 border border-black-500 text-black bg-white-500/20 rounded"
                ${hasInvalidBarcodesFlag ? 'disabled' : ''}
              />
            </div>
            <div>
              <strong class="block mb-1 text-black">Statut :</strong>
              <select
                name="status"
                class="w-full p-2 border border-black-500 text-black bg-black-500/20 rounded"
                ${hasInvalidBarcodesFlag ? 'disabled' : ''}
              >
                ${transferOptions.statusOptions.map((option, index) => `
                  <option key="${index}" value="${option}" ${option === transfer.status ? 'selected' : ''} class="text-black">
                    ${option}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        ` : `
          <div id="error-message" class="hidden text-red-600 text-sm mb-2"></div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <strong class="block mb-1 text-black">De :</strong>
              <select
                name="from"
                id="from-select"
                class="w-full p-2 border border-black text-black bg-transparent rounded"
                ${hasInvalidBarcodesFlag ? 'disabled' : ''}
              >
                ${!transferOptions.fromOptions.some((opt) => opt.value === transfer.from) && transfer.fromName ? `
                  <option value="${transfer.from}" class="text-black">${transfer.fromName}</option>
                ` : ''}
                ${transferOptions.fromOptions.map((option, index) => `
                  <option key="${index}" value="${option.value}" ${option.value === transfer.from ? 'selected' : ''} class="text-black">
                    ${option.label}
                  </option>
                `).join('')}
              </select>
            </div>
            <div>
              <strong class="block mb-1 text-black">Vers :</strong>
              <select
                name="to"
                id="to-select"
                class="w-full p-2 border border-black text-black bg-transparent rounded"
                ${hasInvalidBarcodesFlag ? 'disabled' : ''}
              >
                ${!transferOptions.toOptions.some((opt) => opt.value === transfer.to) && transfer.toName ? `
                  <option value="${transfer.to}" class="text-black">${transfer.toName}</option>
                ` : ''}
                ${transferOptions.toOptions.map((option, index) => `
                  <option key="${index}" value="${option.value}" ${option.value === transfer.to ? 'selected' : ''} class="text-black">
                    ${option.label}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <strong class="block mb-1 text-black">Date :</strong>
              <input
                type="date"
                name="date"
                value="${convertToDateInput(transfer.date || '')}"
                class="w-full p-2 border border-black text-black bg-transparent rounded"
                ${hasInvalidBarcodesFlag ? 'disabled' : ''}
              />
            </div>
            <div>
              <strong class="block mb-1 text-black">Quantité totale :</strong>
              <input
                type="number"
                name="quantity"
                value="${totalQuantity}"
                readOnly
                class="w-full p-2 border border-black text-black bg-transparent rounded"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <strong class="block mb-1 text-black">Statut :</strong>
              <select
                name="status"
                class="w-full p-2 border border-black text-black bg-transparent rounded"
                ${hasInvalidBarcodesFlag ? 'disabled' : ''}
              >
                ${transferOptions.statusOptions.map((option, index) => `
                  <option key="${index}" value="${option}" ${option === transfer.status ? 'selected' : ''} class="text-black">
                    ${option}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          ${isManualTransfer && transfer.items ? `
            <div class="mt-4">
              <strong class="block mb-1 text-black">Codes-barres (${Object.keys(barcodeCounts).length} uniques) :</strong>
              <div class="flex flex-wrap gap-2 p-2 border overflow-auto max-h-48 border-black rounded bg-gray-50">
                ${transfer.items.map((item, index) => `
                  <span
                    key="${index}"
                    class="px-2 py-1 bg-gray-200 text-black rounded-full"
                  >
                    ${item.barcode}
                  </span>
                `).join('')}
              </div>
            </div>
            <div class="mt-4">
              <strong class="block mb-1 text-black">Détails des codes-barres :</strong>
              <div class="overflow-auto max-h-48 border border-black rounded">
                <table class="w-full text-black">
                  <thead>
                    <tr class="bg-gray-100">
                      <th class="p-2 border-b">Code-barres</th>
                      <th class="p-2 border-b">Quantité</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Object.entries(barcodeCounts).map(([barcode, qty], index) => `
                      <tr key="${index}" class="border-b">
                        <td class="p-2">${barcode}</td>
                        <td class="p-2">${qty}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
        `}
      </div>
    `,
    showConfirmButton: false,
    showCancelButton: false,
    width: '1000px',
    customClass: {
      popup: 'bg-transparent',
      content: 'p-0',
    },
    footer: `
      <div class="w-full flex justify-center space-x-4 pb-4">
        <button id="close-btn" class="bg-transparent border text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>
        ${!hasInvalidBarcodesFlag ? `
          <button id="confirm-btn" class="bg-transparent border text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        ` : `
          <button 
            id="confirm-btn" 
            class="bg-gray-400 text-white w-12 h-12 rounded-full flex items-center justify-center cursor-not-allowed"
            disabled
            title="Corriger les codes-barres d'abord"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </button>
        `}
      </div>
    `,
    didRender: () => {
      const closeBtn = document.getElementById('close-btn');
      const confirmBtn = document.getElementById('confirm-btn');
      const fromSelect = document.getElementById('from-select');
      const toSelect = document.getElementById('to-select');
      const errorMessage = document.getElementById('error-message');

      closeBtn.addEventListener('click', () => {
        MySwal.close();
      });

      // Si nous avons des codes-barres invalides, terminer ici et ne pas ajouter d'écouteurs d'événements supplémentaires
      if (hasInvalidBarcodesFlag) {
        return;
      }

      const validateStores = () => {
        if (!fromSelect || !toSelect) return;

        const fromValue = fromSelect.value;
        const toValue = toSelect.value;

        if (fromValue === toValue && fromValue !== '') {
          errorMessage.classList.remove('hidden');
          errorMessage.textContent = 'Les magasins source et destination doivent être différents.';
          confirmBtn.disabled = true;
        } else {
          errorMessage.classList.add('hidden');
          errorMessage.textContent = '';
          confirmBtn.disabled = false;
        }
      };

      if (fromSelect) fromSelect.addEventListener('change', validateStores);
      if (toSelect) toSelect.addEventListener('change', validateStores);

      validateStores();

      // Ajouter l'écouteur d'événement uniquement si confirmBtn existe et n'est pas désactivé
      if (confirmBtn && !hasInvalidBarcodesFlag) {
        confirmBtn.addEventListener('click', () => {
          const formElements = MySwal.getPopup().querySelectorAll('input:not([disabled]), select:not([disabled])');
          const values = {};

          formElements.forEach((el) => {
            if (el.type === 'date') {
              values.date = el.value;
            } else if (el.type === 'number') {
              values.quantity = Number(el.value);
            } else {
              values[el.name] = el.value;
            }
          });

          if (!transfer.showBoxIcon && values.from === values.to) {
            MySwal.fire({
              icon: 'error',
              title: 'Erreur',
              text: 'Les magasins source et destination doivent être différents.',
              confirmButtonColor: '#3085d6',
            });
            return;
          }

          const updatedTransfer = transfer.showBoxIcon
            ? {
                ...transfer,
                to: values.to || transfer.to,
                date: values.date,
                status: values.status || transfer.status,
                toName: transferOptions.toOptions.find((opt) => opt.value === values.to)?.label || transfer.toName,
              }
            : {
                ...transfer,
                from: values.from || transfer.from,
                to: values.to || transfer.to,
                quantity: values.quantity || transfer.quantity,
                Document_Number: values.Document_Number || transfer.Document_Number,
                status: values.status || transfer.status,
                date: values.date,
                items: transfer.items,
                fromName:
                  transferOptions.fromOptions.find((opt) => opt.value === values.from)?.label || transfer.fromName,
                toName: transferOptions.toOptions.find((opt) => opt.value === values.to)?.label || transfer.toName,
              };

          const newFromExists = transfer.showBoxIcon ? true : checkMagasinExists(updatedTransfer.fromName, updatedTransfer.from);
          const newToExists = checkMagasinExists(updatedTransfer.toName, updatedTransfer.to);

          if (!transfer.showBoxIcon && !newFromExists) {
            showNonStradiAlert(updatedTransfer.fromName, 'source');
          }
          if (!newToExists) {
            showNonStradiAlert(updatedTransfer.toName, 'destination');
          }

          if (updateTransfer) {
            updateTransfer(dayData, updatedTransfer);
          }

          MySwal.fire({
            background: 'transparent',
            title: '<span class="text-white">Confirmé !</span>',
            html: '<span class="text-white">Les modifications ont été enregistrées.</span>',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            customClass: {
              popup: 'bg-transparent',
              title: 'text-white',
              content: 'text-white',
            },
          });
        });
      }
    },
  });
};
  const checkMagasinAndGetName = (magasinName, magasinId) => {
    if (magasinId) {
      const foundOption = transferOptions.fromOptions.find(opt => opt.value === magasinId);
      if (foundOption) {
        return { exists: true, correctName: foundOption.label };
      }
    }
    
    if (!magasinName) return { exists: true, correctName: magasinName };
    
    const normalizedInput = magasinName.trim().toLowerCase();
    const stradiNormalizedInput = normalizedInput.replace(/^stradi\s+/i, '');
    
    const foundOption = transferOptions.fromOptions.find((option) => {
      const optionName = option.label.toLowerCase();
      const optionRawName = option.rawName ? option.rawName.toLowerCase() : 
                           optionName.replace(/^stradi\s+/i, '');
      
      return optionRawName === stradiNormalizedInput || 
             optionName === normalizedInput ||
             stradiNormalizedInput.includes(optionRawName) ||
             optionRawName.includes(stradiNormalizedInput);
    });
    
    return { exists: !!foundOption, correctName: foundOption ? foundOption.label : magasinName };
  };

  const handleTransferItemClick = (transfer, dayData, e) => {
    e.stopPropagation();
  
    // Vérification améliorée de l'existence des entrepôts avec débogage approprié
    const fromResult = transfer.showBoxIcon ? { exists: true, correctName: transfer.fromName } : 
                      checkMagasinAndGetName(transfer.fromName, transfer.from);
    const toResult = checkMagasinAndGetName(transfer.toName, transfer.to);
    
    const fromExists = fromResult.exists;
    const toExists = toResult.exists;
    
    // Si les IDs existent mais les noms sont "Magasin inconnu", mettre à jour les noms
    if (fromExists && transfer.fromName === "Magasin inconnu") {
      transfer.fromName = fromResult.correctName;
    }
    
    if (toExists && transfer.toName === "Magasin inconnu") {
      transfer.toName = toResult.correctName;
    }

  

    if ((!transfer.showBoxIcon && !fromExists) || !toExists) {
      let alertMessage = '';
      let nonExistingMagasin = '';

      if (!transfer.showBoxIcon && !fromExists && !toExists) {
        alertMessage = `<p>Les magasins source <strong>"${transfer.fromName}"</strong> et destination <strong>"${transfer.toName}"</strong> ne font pas partie des magasins Stradi actifs.</p>`;
        nonExistingMagasin = `${transfer.fromName}, ${transfer.toName}`;
      } else if (!transfer.showBoxIcon && !fromExists) {
        alertMessage = `<p>Le magasin source <strong>"${transfer.fromName}"</strong> ne fait pas partie des magasins Stradi actifs.</p>`;
        nonExistingMagasin = transfer.fromName;
      } else if (!toExists) {
        alertMessage = `<p>Le magasin ${
          transfer.showBoxIcon ? '' : 'destination '
        }<strong>"${transfer.toName}"</strong> ne fait pas partie des magasins Stradi actifs.</p>`;
        nonExistingMagasin = transfer.toName;
      }

      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : { role: 'User' };

      MySwal.fire({
        icon: 'warning',
        title: 'Magasin non référencé',
        html: `<div class="text-center">
                ${alertMessage}
                <p class="mt-3">Qu'est-ce que vous voulez faire?</p>
              </div>`,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Continuer l'édition",
        denyButtonText: 'Ajouter le magasin',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#3085d6',
        denyButtonColor: '#28a745',
        cancelButtonColor: '#d33',
      }).then((result) => {
        if (result.isConfirmed) {
          if (transfer.isGroup) {
            showGroupDetails(transfer, dayData, e);
          } else {
            showTransferDetails(transfer, dayData, e);
          }
          
          handleTransferClick(transfer, dayData.date, e);
        } else if (result.isDenied) {
          if (user.role === 'Admin') {
            localStorage.setItem('magasinToAdd', nonExistingMagasin);
            const appRoot = document.querySelector('.App');
            if (appRoot) {
              const event = new CustomEvent('changeComponent', {
                detail: { component: 'house', magasinName: nonExistingMagasin },
              });
              appRoot.dispatchEvent(event);
              window.location.href = '/magasin?add=' + encodeURIComponent(nonExistingMagasin);
            }
          } else {
            MySwal.fire({
              icon: 'error',
              title: 'Accès interdit',
              text: "Vous n'avez pas les droits pour ajouter un magasin. Veuillez contacter l'administrateur de l'application Stradivarius.",
              confirmButtonColor: '#3085d6',
            });
          }
        }
      });
    } else {
      if (transfer.isGroup) {
        showGroupDetails(transfer, dayData, e);
      } else {
        showTransferDetails(transfer, dayData, e);
      }
      handleTransferClick(transfer, dayData.date, e);
    }
  };
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {Object.keys(transfersData).map((day, index) => (
            <th
              key={index}
              className={`p-3 border text-center font-normal ${
                parseInt(transfersData[day].date) === selectedDay ? 'bg-blue-50' : ''
              }`}
              style={{
                borderColor: '#e5e7eb',
                borderWidth: '1px',
              }}
              onClick={() => selectDay(parseInt(transfersData[day].date))}
            >
              <div>{day}</div>
              <div id="day_and_date">{transfersData[day].date}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: maxTransfersCount }).map((_, transferRowIndex) => (
          <tr key={`transfer-row-${transferRowIndex}`}>
            {Object.keys(transfersData).map((day, dayIndex) => {
              const dayData = transfersData[day];
              const isSelectedDay = parseInt(dayData.date) === selectedDay;
              const groupedTransfers = groupTransfers(dayData.transfers);
              const transfer = groupedTransfers[transferRowIndex];
              const showFromWarning = transfer && !transfer.showBoxIcon && !checkMagasinExists(transfer.fromName);
              const showToWarning = transfer && !checkMagasinExists(transfer.toName);

              return (
                <td
                  key={`transfer-cell-${dayIndex}-${transferRowIndex}`}
                  className={`border ${isSelectedDay ? 'bg-blue-50' : ''}`}
                  style={{
                    height: '100px',
                    borderColor: '#e5e7eb',
                    borderWidth: '1px',
                    verticalAlign: 'top',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                  onClick={() => selectDay(parseInt(dayData.date))}
                >
                  {transfer && (
                    <div
                      className={`p-4 m-2 border-l-4 rounded ${
                        transfer.showBoxIcon
                          ? 'border-yellow-500 bg-yellow-100'
                          : `${getBorderColor(transfer.type)} ${getBgColor(transfer.type)}`
                      } ${selectedTransfer === transfer ? 'ring-2 ring-blue-500' : ''} ${
                        showFromWarning || showToWarning ? 'border-dashed border border-red-300' : ''
                      }`}
                      onClick={(e) => handleTransferItemClick(transfer, dayData, e)}
                    >
                      {transfer.showBoxIcon ? (
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <Boxes className="text-yellow-500 mr-2" size={25} />
                            <span className="text-sm font-medium">{transfer.toName}</span>
                          </div>
                          {transfer.Document_Number && (
                            <div className="text-xs text-gray-600 mt-1">
                              N° {transfer.Document_Number}
                            </div>
                          )}
                          {showToWarning && (
                            <div className="flex items-center text-red-600 mt-1 text-xs">
                              <AlertCircle className="mr-1" size={14} />
                              <span>Magasin non Stradi</span>
                            </div>
                          )}
                           {hasInvalidBarcodes(transfer) && (
      <div className="absolute top-1 right-1">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="red" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          title="Codes-barres invalides"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
    )}
                        </div>
                        
                      ) : transfer.isGroup ? (
                        <div className="flex flex-col">
                          {transfer.transfers.some((t) => t.isManualTransfer) && (
                            <FilePenLine className="text-black text-center" size={25} />
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full ${getDotColor(transfer.type)} mr-1`}></div>
                              <div className="text-sm font-medium">De : {transfer.fromName}</div>
                            </div>
                            <div className="flex">
                              <button
                                onClick={(e) => toggleGroup(transfer.groupKey, e)}
                                className="p-1"
                                id="viewdocument"
                              >
                                {expandedGroups[transfer.groupKey] ? (
                                  <ChevronDown size={16} />
                                ) : (
                                  <ChevronRight size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="text-sm ml-4">À : {transfer.toName}</div>
                          <div className="text-xs- text-gray-600 mt-1 flex justify-between">
                          <span>Quantité : {transfer.totalQuantity}</span>
                          <span>Transferts : {transfer.transfers.length}</span>
                          {transfer.Id_Store && transfer.Id_Store !== 'N/A' && <span>ID Store: {transfer.Id_Store}</span>}
                        </div>
                          <div className="flex mt-2 space-x-1">
                            {Object.entries(transfer.statusCounts)
                              .filter(([_, count]) => count > 0)
                              .map(([status, count], i) => {
                                const statusColors = {
                                  'En cours': 'bg-blue-500',
                                  'Confirmé': 'bg-green-500',
                                  'En attente': 'bg-orange-500',
                                  'Annulé': 'bg-red-500',
                                };
                                return (
                                  <div key={i} className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full ${statusColors[status]}`}></div>
                                    <span className="text-xs ml-1">{count}</span>
                                  </div>
                                );
                              })}
                          </div>
                           {transfer.transfers.some(t => hasInvalidBarcodes(t)) && (
      <div className="flex items-center text-red-600 mt-1 text-xs">
        <AlertCircle className="mr-1" size={14} />
        <span>Codes-barres invalides</span>
      </div>
    )}
                          {(showFromWarning || showToWarning) && (
                            <div className="flex items-center text-red-600 mt-2 text-xs">
                              <AlertCircle className="mr-1" size={14} />
                              <span>Magasin(s) non actif chez Stradi.</span>
                            </div>
                          )}
                          {expandedGroups[transfer.groupKey] && (
                            <div className="mt-2 pt-2 border-t text-xs">
                              {transfer.transfers.map((item, i) => (
                                <div id="All_calendar" key={i} className="flex flex-col mt-1">
                                  {!item.isManualTransfer && (
                                    <div className="flex justify-between w-full">
                                      <span>N° {item.Document_Number}</span>
                                      <span>Qté: {item.quantity}</span>
                                    </div>
                                  )}
                                  {item.isManualTransfer && item.items && (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex justify-between w-full">
                                        <span>Manuel</span>
                                        <span>Qté: {item.quantity}</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {item.items.map((barcodeItem, idx) => (
                                          <span
                                            key={idx}
                                            className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs"
                                          >
                                            {barcodeItem.barcode}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full ${getDotColor(transfer.type)} mr-1`}></div>
                              <div className="text-sm font-medium">De : {transfer.fromName}</div>
                            </div>
                            {transfer.isManualTransfer && (
                              <FilePenLine className="text-gray-500" size={16} />
                            )}
                          </div>
                          <div className="text-sm ml-4">À : {transfer.toName}</div>
                          {transfer.Document_Number && (
                            <div className="text-xs text-gray-600 mt-1">
                              N° {transfer.Document_Number}
                            </div>
                          )}
                          {transfer.quantity && (
                            <div className="text-xs text-gray-600 mt-1">
                              Quantité : {transfer.quantity}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default CalendarGrid;