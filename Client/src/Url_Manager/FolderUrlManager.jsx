import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';
import { Folder } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const FolderUrlManager = ({ onClose }) => {
  const [folderPath, setFolderPath] = useState('');
  const [loading, setLoading] = useState(true);

  // Récupérer le chemin du dossier
  const fetchFolderPath = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE_URL}/api/folder`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setFolderPath(data.chemin_dossier);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération du chemin du dossier:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderPath();
  }, []);

  const showSuccessAlert = (message) => {
    Swal.fire({
      background: 'transparent',
      title: '<span class="text-white">Succès!</span>',
      html: `<span class="text-white">${message}</span>`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      customClass: {
        popup: 'bg-transparent',
        title: 'text-white',
        content: 'text-white'
      }
    });
  };

  const showErrorAlert = (message) => {
    Swal.fire({
      background: 'transparent',
      title: '<span class="text-white">Erreur!</span>',
      html: `<span class="text-white">${message}</span>`,
      icon: 'error',
      timer: 2000,
      showConfirmButton: false,
      customClass: {
        popup: 'bg-transparent',
        title: 'text-white',
        content: 'text-white'
      }
    });
  };

  const handleShowFolderPath = () => {
    Swal.fire({
      background: 'white',
      color: 'black',
      customClass: {
        popup: 'custom-swal-popup',
        input: 'custom-swal-input',
        confirmButton: 'custom-swal-confirm-button',
        actions: 'custom-swal-actions'
      },
      title: 'Chemin du dossier',
      html: `
        <style>
          .custom-swal-popup { 
            border-radius: 20px; 
            width: 80%;
            max-width: 600px;
          }
          .custom-swal { 
            border: 1px solid #ccc !important; 
            color: black !important;
            background: #f9f9f9 !important;
            margin-bottom: 10px;
            border-radius: 10px;
            padding: 12px 15px;
            width: 100%;
          }
          .custom-swal-confirm-button { 
            background-color: #4CAF50 !important; 
            color: white !important;
            border-radius: 10px;
            padding: 10px 20px;
          }
          .swal2-actions {
            display: flex !important;
            justify-content: center !important;
            gap: 1rem !important;
            margin-top: 20px !important;
          }
          .folder-icon {
            display: flex;
            justify-content: center;
            margin-bottom: 15px;
          }
          .path-display {
            background: #f0f0f0;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            word-break: break-all;
          }
        </style>
        <div class="folder-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div class="path-display">
          ${folderPath || 'Aucun chemin configuré'}
        </div>
        <input 
          id="swal-input-path" 
          type="text" 
          class="swal2-input custom-swal-input" 
          value="${folderPath || ''}" 
          placeholder="Entrez le nouveau chemin du dossier"
        >
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Mettre à jour',
      cancelButtonText: 'Fermer',
      preConfirm: () => {
        return {
          chemin_dossier: document.getElementById('swal-input-path').value
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('token');
          const { data } = await axios.put(`${API_BASE_URL}/api/folder`, result.value, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          setFolderPath(data.chemin_dossier);
          showSuccessAlert('Le chemin du dossier a été mis à jour');
          if (onClose) onClose();
        } catch (error) {
          console.error('Erreur lors de la mise à jour du chemin:', error);
          showErrorAlert(error.response?.data?.message || 'Erreur lors de la mise à jour du chemin');
          if (onClose) onClose();
        }
      } else if (result.isDismissed) {
        if (onClose) onClose();
      }
    });
  };

  useEffect(() => {
    if (!loading) {
      handleShowFolderPath();
    }
  }, [loading]);

  return null; // No UI elements rendered since the modal is shown directly
};

export default FolderUrlManager;