import React, { useState, useEffect } from 'react';
import { Boxes, Edit, HousePlus, X } from 'lucide-react';
import Swal from 'sweetalert2';
import '../Css/Magasin.css';
import axios from 'axios';

const Add_Magasin = () => {
  const [magasins, setMagasins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newMagasin, setNewMagasin] = useState({
    codeInditex: '',
    nomMagasin: '',
    codeFutura: '',
    statut: 'active'
  });

// Ajoutez ce useEffect en haut de votre composant
useEffect(() => {
  // Récupérer le magasin depuis l'URL ou localStorage
  const queryParams = new URLSearchParams(window.location.search);
  const magasinFromUrl = queryParams.get('nom');
  
  const magasinFromStorage = localStorage.getItem('magasinToAdd');
  
  // Priorité à l'URL puis au localStorage
  const magasinToPreFill = magasinFromUrl || magasinFromStorage;
  
  if (magasinToPreFill) {
    setNewMagasin(prev => ({
      ...prev,
      nomMagasin: magasinToPreFill
    }));
    
    // Nettoyer le localStorage après utilisation
    if (magasinFromStorage) {
      localStorage.removeItem('magasinToAdd');
    }
  }
}, []);

  // Configurer l'instance axios avec token
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  // Charger les magasins depuis l'API
  const fetchMagasins = async () => {
    try {
      setLoading(true);
      const response = await api.get('api/magasins');
      setMagasins(response.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur lors du chargement des magasins:', err);
      setError('Impossible de charger les magasins');
      setLoading(false);
      
      // Si erreur d'authentification, rediriger vers login
      if (err.response && err.response.status === 401) {
        Swal.fire({
          title: 'Session expirée',
          text: 'Veuillez vous reconnecter',
          icon: 'warning',
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          // Redirection vers la page de login ou refresh du token
          localStorage.removeItem('token');
          window.location.href = '/login';
        });
      }
    }
  };

  // Charger les données au chargement du composant
  useEffect(() => {
    fetchMagasins();
  }, []);

// Modification du composant Magasin pour récupérer le magasin à ajouter
useEffect(() => {
  const magasinToAdd = localStorage.getItem('magasinToAdd');
  if (magasinToAdd) {
    // Pré-remplir le formulaire avec le magasin
    setNewMagasin(prevState => ({
      ...prevState,
      nomMagasin: magasinToAdd
    }));
    // Nettoyer le stockage
    localStorage.removeItem('magasinToAdd');
  }
}, []);

  const addMagasin = async () => {
  if (!newMagasin.codeInditex || !newMagasin.nomMagasin || !newMagasin.codeFutura) {
      Swal.fire({
        background: 'transparent',
        title: '<span class="text-white">Champs manquants!</span>',
        html: '<span class="text-white">Veuillez remplir tous les champs obligatoires.</span>',
        icon: 'warning',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-transparent',
          title: 'text-white',
          content: 'text-white'
        }
      });
      return;
    }
    const isCodeInditexValid = newMagasin.codeInditex.length > 0; 
    const isNomMagasinValid = newMagasin.nomMagasin.length > 0;
    const isCodeFuturaValid = newMagasin.codeFutura.length > 0; 
    
    // Vérifications d'unicité pour tous les champs
    const isMagasinNameUnique = !magasins.some(mag => 
      mag.nomMagasin.toLowerCase() === newMagasin.nomMagasin.toLowerCase()
    );
    
    const isCodeInditexUnique = !magasins.some(mag => 
      mag.codeInditex.toLowerCase() === newMagasin.codeInditex.toLowerCase()
    );
    
    const isCodeFuturaUnique = !magasins.some(mag => 
      mag.codeFutura.toLowerCase() === newMagasin.codeFutura.toLowerCase()
    );
    
    if (!isCodeInditexValid || !isNomMagasinValid || !isCodeFuturaValid) {
      Swal.fire({
        background: 'transparent',
        title: '<span class="text-white">Formulaire incomplet!</span>',
        html: '<span class="text-white">Veuillez remplir tous les champs avec des valeurs valides.</span>',
        icon: 'warning',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-transparent',
          title: 'text-white',
          content: 'text-white'
        }
      });
      return;
    }
  
    // Vérifier si le nom du magasin est unique
    if (!isMagasinNameUnique) {
      Swal.fire({
        background: 'transparent',
        title: '<span class="text-white">Nom dupliqué!</span>',
        html: '<span class="text-white">Un magasin avec ce nom existe déjà.</span>',
        icon: 'error',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-transparent',
          title: 'text-white',
          content: 'text-white'
        }
      });
      return;
    }
    
    // Vérifier si le code Inditex est unique
    if (!isCodeInditexUnique) {
      Swal.fire({
        background: 'transparent',
        title: '<span class="text-white">Code Inditex dupliqué!</span>',
        html: '<span class="text-white">Un magasin avec ce code Inditex existe déjà.</span>',
        icon: 'error',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-transparent',
          title: 'text-white',
          content: 'text-white'
        }
      });
      return;
    }
    
    // Vérifier si le code Futura est unique
    if (!isCodeFuturaUnique) {
      Swal.fire({
        background: 'transparent',
        title: '<span class="text-white">Code Futura dupliqué!</span>',
        html: '<span class="text-white">Un magasin avec ce code Futura existe déjà.</span>',
        icon: 'error',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-transparent',
          title: 'text-white',
          content: 'text-white'
        }
      });
      return;
    }
    
    try {
      const response = await api.post('api/magasins', {
        codeInditex: newMagasin.codeInditex,
        nomMagasin: newMagasin.nomMagasin,
        codeFutura: newMagasin.codeFutura,
        statut: newMagasin.statut
      });

      // Ajouter le nouveau magasin à la liste
      setMagasins([response.data.data, ...magasins]);
      
      // Réinitialiser le formulaire
      setNewMagasin({
        codeInditex: '',
        nomMagasin: '',
        codeFutura: '',
        statut: 'active'
      });

      Swal.fire({
        background: 'transparent',
        title: '<span class="text-white">Succès!</span>',
        html: '<span class="text-white">Le magasin a été ajouté avec succès.</span>',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-transparent',
          title: 'text-white',
          content: 'text-white'
        }
      });
    } catch (err) {
      console.error('Erreur lors de l\'ajout du magasin:', err);
      
      let errorMessage = 'Une erreur est survenue lors de l\'ajout du magasin.';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      
      Swal.fire({
        background: 'transparent',
        title: '<span class="text-white">Erreur!</span>',
        html: `<span class="text-white">${errorMessage}</span>`,
        icon: 'error',
        timer: 3000,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-transparent',
          title: 'text-white',
          content: 'text-white'
        }
      });
    }
  };

  const removeMagasin = async (id) => {
    Swal.fire({
      background: 'transparent',
      color: 'white',
      customClass: {
        popup: 'custom-swal-popup',
        confirmButton: 'custom-swal-confirm-button',
        cancelButton: 'custom-swal-cancel-button',
        actions: 'custom-swal-actions'
      },
      title: 'Êtes-vous sûr?',
      text: "Vous ne pourrez pas annuler cette action!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler',
      buttonsStyling: false,
      focusConfirm: false,
      didOpen: () => {
        const style = document.createElement('style');
        style.textContent = `
          .custom-swal-popup { border-radius: 50px; }
          .custom-swal-confirm-button { 
            background-color: rgba(255, 0, 0, 0.454) !important; 
            color: white !important;
            transition: 0.5s;
            border-radius: 50px !important;
            padding: 8px 20px !important;
          }
            .custom-swal-confirm-button:hover { 
            background-color: red !important; 
            color: white !important;
            border: none !important;
            border-radius: 50px !important;
            padding: 8px 20px !important;
            cursor: pointer;
          } 
          .custom-swal-cancel-button { 
            background-color: rgba(255, 166, 0, 0.394) !important; 
            color: white !important;
            transition: 0.5s;
            border: none !important;
            border-radius: 50px !important;
            padding: 8px 20px !important;
          }
            .custom-swal-cancel-button:hover { 
            background-color: orange !important; 
            color: white !important;
            border: none !important;
            border-radius: 50px !important;
            padding: 8px 20px !important;
            cursor: pointer;
          } 
          .swal2-actions {
            display: flex !important;
            justify-content: center !important;
            gap: 1rem !important;
          }
        `;
        document.head.appendChild(style);
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`api/magasins/${id}`);
          
          // Mettre à jour la liste des magasins
          setMagasins(magasins.filter(mag => mag.id !== id));
          
          Swal.fire({
            background: 'transparent',
            title: '<span class="text-white">Supprimé!</span>',
            html: '<span class="text-white">Le magasin a été supprimé.</span>',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            customClass: {
              popup: 'bg-transparent',
              title: 'text-white',
              content: 'text-white'
            }
          });
        } catch (err) {
          console.error('Erreur lors de la suppression du magasin:', err);
          
          Swal.fire({
            background: 'transparent',
            title: '<span class="text-white">Erreur!</span>',
            html: '<span class="text-white">Impossible de supprimer le magasin.</span>',
            icon: 'error',
            timer: 2000,
            showConfirmButton: false,
            customClass: {
              popup: 'bg-transparent',
              title: 'text-white',
              content: 'text-white'
            }
          });
        }
      }
    });
  };

  const editMagasin = (magasin) => {
    Swal.fire({
      background: '#FFF',
      color: 'black',
      customClass: {
        popup: 'custom-swal-popup',
        input: 'custom-swal-input',
        confirmButton: 'custom-swal-confirm-button',
        actions: 'custom-swal-actions'
      },
      title: 'Modifier le magasin',
      html: `
        <style>
          .custom-swal-popup { border-radius: 50px; }
          .custom-swal-input { 
            border: 1px solid black !important; 
            color: black !important;
            background: transparent !important;
            margin-bottom: 10px;
          }
          .custom-swal-input::placeholder { color: rgba(255,255,255,0.7) !important; }
          .custom-swal-confirm-button { 
            background-color: black !important; 
            color: blue !important; 
          }
          .custom-swal-actions {
            margin-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .swal2-actions {
            display: flex !important;
            justify-content: center !important;
            gap: 1rem !important;
          }
          .swal-button-container {
            margin: 0 !important;
          }
          option {
            color: black;
          }
        </style>
        <input id="swal-input-codeInditex" type="text" class="swal2-input custom-swal-input" 
          value="${magasin.codeInditex}" placeholder="Code Inditex">
        <input id="swal-input-nomMagasin" type="text" class="swal2-input custom-swal-input" 
          value="${magasin.nomMagasin}" placeholder="Nom du magasin">
        <input id="swal-input-codeFutura" type="text" class="swal2-input custom-swal-input" 
          value="${magasin.codeFutura}" placeholder="Code Futura">
        <select id="swal-input-statut" class="swal2-input custom-swal-input">
          <option value="active" ${magasin.statut === 'active' ? 'selected' : ''}>Actif</option>
          <option value="inactive" ${magasin.statut === 'inactive' ? 'selected' : ''}>Inactif</option>
        </select>
        <div class="w-full flex justify-center space-x-4 pb-4 mt-4">
          <button id="close-btn" class="bg-transparent border text-white   w-12 h-12 rounded-full flex items-center justify-center hover:bg-black/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
          <button id="confirm-btn" class="bg-transparent border text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-black/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
      `,
      focusConfirm: false,
      showConfirmButton: false,
      showCancelButton: false,
      preConfirm: () => {
        return {
          codeInditex: document.getElementById('swal-input-codeInditex').value,
          nomMagasin: document.getElementById('swal-input-nomMagasin').value,
          codeFutura: document.getElementById('swal-input-codeFutura').value,
          statut: document.getElementById('swal-input-statut').value
        };
      },
      didOpen: () => {
        document.getElementById('confirm-btn').addEventListener('click', () => {
          Swal.close({ 
            isConfirmed: true, 
            value: {
              codeInditex: document.getElementById('swal-input-codeInditex').value,
              nomMagasin: document.getElementById('swal-input-nomMagasin').value,
              codeFutura: document.getElementById('swal-input-codeFutura').value,
              statut: document.getElementById('swal-input-statut').value
            }
          });
        });
        
        document.getElementById('close-btn').addEventListener('click', () => {
          Swal.close();
        });
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const updatedData = {
            codeInditex: result.value.codeInditex,
            nomMagasin: result.value.nomMagasin,
            codeFutura: result.value.codeFutura,
            statut: result.value.statut
          };
          
          // Vérifier l'unicité des valeurs lors de la modification (en excluant le magasin en cours)
          const isNameUnique = !magasins.some(mag => 
            mag.id !== magasin.id && mag.nomMagasin.toLowerCase() === updatedData.nomMagasin.toLowerCase()
          );
          
          const isCodeInditexUnique = !magasins.some(mag => 
            mag.id !== magasin.id && mag.codeInditex.toLowerCase() === updatedData.codeInditex.toLowerCase()
          );
          
          const isCodeFuturaUnique = !magasins.some(mag => 
            mag.id !== magasin.id && mag.codeFutura.toLowerCase() === updatedData.codeFutura.toLowerCase()
          );
          
          // Vérifier l'unicité du nom
          if (!isNameUnique) {
            Swal.fire({
              background: 'transparent',
              title: '<span class="text-white">Nom dupliqué!</span>',
              html: '<span class="text-white">Un autre magasin utilise déjà ce nom.</span>',
              icon: 'error',
              timer: 2000,
              showConfirmButton: false,
              customClass: {
                popup: 'bg-transparent',
                title: 'text-white',
                content: 'text-white'
              }
            });
            return;
          }
          
          // Vérifier l'unicité du code Inditex
          if (!isCodeInditexUnique) {
            Swal.fire({
              background: 'transparent',
              title: '<span class="text-white">Code Inditex dupliqué!</span>',
              html: '<span class="text-white">Un autre magasin utilise déjà ce code Inditex.</span>',
              icon: 'error',
              timer: 2000,
              showConfirmButton: false,
              customClass: {
                popup: 'bg-transparent',
                title: 'text-white',
                content: 'text-white'
              }
            });
            return;
          }
          
          // Vérifier l'unicité du code Futura
          if (!isCodeFuturaUnique) {
            Swal.fire({
              background: 'transparent',
              title: '<span class="text-white">Code Futura dupliqué!</span>',
              html: '<span class="text-white">Un autre magasin utilise déjà ce code Futura.</span>',
              icon: 'error',
              timer: 2000,
              showConfirmButton: false,
              customClass: {
                popup: 'bg-transparent',
                title: 'text-white',
                content: 'text-white'
              }
            });
            return;
          }
          
          const response = await api.put(`api/magasins/${magasin.id}`, updatedData);
          
          // Mettre à jour la liste des magasins
          setMagasins(magasins.map(mag => 
            mag.id === magasin.id ? response.data.data : mag
          ));
          
          Swal.fire({
            background: 'transparent',
            title: '<span class="text-white">Confirmé!</span>',
            html: '<span class="text-white">Les modifications ont été enregistrées.</span>',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            customClass: {
              popup: 'bg-transparent',
              title: 'text-white',
              content: 'text-white'
            }
          });
        } catch (err) {
          console.error('Erreur lors de la modification du magasin:', err);
          
          let errorMessage = 'Une erreur est survenue lors de la modification du magasin.';
          if (err.response && err.response.data && err.response.data.message) {
            errorMessage = err.response.data.message;
          }
          
          Swal.fire({
            background: 'transparent',
            title: '<span class="text-white">Erreur!</span>',
            html: `<span class="text-white">${errorMessage}</span>`,
            icon: 'error',
            timer: 3000,
            showConfirmButton: false,
            customClass: {
              popup: 'bg-transparent',
              title: 'text-white',
              content: 'text-white'
            }
          });
        }
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Simplification du traitement des valeurs en supprimant les vérifications Stradi
    setNewMagasin(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="w-300 relative">
      <div className="bg-white rounded-2xl border-3 text-blue-900 p-4 text-center">
        <div className="mb-4">
          <HousePlus strokeWidth={0.75} size={60} className="mx-auto mb-3 text-blue-900" />
          
          <div className="mb-3 grid grid-cols-4 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code Inditex</label>
              <input
                type="text"
                name="codeInditex"
                value={newMagasin.codeInditex}
                onChange={handleInputChange}
                placeholder="00001"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du magasin</label>
              <input
                type="text"
                name="nomMagasin"
                value={newMagasin.nomMagasin}
                onChange={handleInputChange}
                placeholder="STRADI AGADIR"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code Futura</label>
              <input
                type="text"
                name="codeFutura"
                value={newMagasin.codeFutura}
                onChange={handleInputChange}
                placeholder="00001"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                name="statut"
                value={newMagasin.statut}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>

          <button
            onClick={addMagasin}
            className="addMagasin_btn"
          >
            Ajouter Magasin
          </button>
        </div>
      </div>
      <br />
      <div className="bg-white rounded-2xl border-3 p-4 mb-4 max-h-96 overflow-y-auto text-blue-900">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement des magasins...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">
            {error}
          </div>
        ) : (
          <>
            <h3 className="font-medium text-gray-700 mb-2 text-center">
              Liste des Magasins
              <span className={`ml-2 px-2 py-1 rounded-full text-xs text-white ${magasins && magasins.length === 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                {magasins ? magasins.length : 0}
              </span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Code Inditex</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du magasin</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Code Futura</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-center">
                  {!magasins || magasins.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        Aucun magasin trouvé
                      </td>
                    </tr>
                  ) : (
                    magasins.map((magasin) => (
                      <tr key={magasin.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{magasin.codeInditex}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{magasin.nomMagasin}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{magasin.codeFutura}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${magasin.statut === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {magasin.statut === 'active' ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => editMagasin(magasin)}
                              className="edit_Inv p-1 rounded-full hover:bg-blue-100"
                              title="Modifier"
                            >
                              <Edit size={16}  />
                            </button>
                            <button
                              onClick={() => removeMagasin(magasin.id)}
                              className="remove_Inv p-1 rounded-full hover:bg-red-100"
                              title="Supprimer"
                            >
                              <X size={16}  />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Add_Magasin;