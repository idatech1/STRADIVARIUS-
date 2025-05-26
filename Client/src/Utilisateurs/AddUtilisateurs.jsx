import React, { useState, useEffect } from 'react';
import { UserCog, Edit, X, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';
import '../Css/addUtilisateur.css';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ;

const AddUtilisateurs = () => {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [newUtilisateur, setNewUtilisateur] = useState({
    nom: '',
    prenom: '',
    matricule: '',
    username: '',
    password: '',
    role: 'User'
  });

  const roles = ['Admin', 'User'];
const togglePasswordVisibility = () => {
  setShowPassword(!showPassword);
};
  // Récupérer tous les utilisateurs
  const fetchUtilisateurs = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUtilisateurs(data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error.response?.data?.message || error.message);
      showErrorAlert(error.response?.data?.message || 'Erreur lors de la récupération des utilisateurs');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUtilisateurs();
  }, []);

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

  const addUtilisateur = async () => {
    if (!newUtilisateur.nom || !newUtilisateur.prenom || !newUtilisateur.matricule || 
        !newUtilisateur.username || !newUtilisateur.password) {
      showErrorAlert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        nom: newUtilisateur.nom,
        prenom: newUtilisateur.prenom,
        matricule: newUtilisateur.matricule,
        username: newUtilisateur.username,
        password: newUtilisateur.password,
        role: newUtilisateur.role
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setUtilisateurs([...utilisateurs, data]);
      setNewUtilisateur({
        nom: '',
        prenom: '',
        matricule: '',
        username: '',
        password: '',
        role: 'User'
      });

      showSuccessAlert('L\'utilisateur a été ajouté avec succès.');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'utilisateur:', error.response?.data?.message || error.message);
      showErrorAlert(error.response?.data?.message || 'Erreur lors de l\'ajout de l\'utilisateur');
    }
  };

  const removeUtilisateur = async (id) => {
    Swal.fire({
      background: 'white',
      color: 'black',
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
          const token = localStorage.getItem('token');
          await axios.delete(`${API_BASE_URL}/api/users/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          setUtilisateurs(utilisateurs.filter(user => user._id !== id));
          showSuccessAlert('L\'utilisateur a été supprimé.');
        } catch (error) {
          console.error('Erreur lors de la suppression de l\'utilisateur:', error.response?.data?.message || error.message);
          showErrorAlert(error.response?.data?.message || 'Erreur lors de la suppression de l\'utilisateur');
        }
      }
    });
  };
// Dans le composant React AddUtilisateurs.jsx, modifiez la fonction editUtilisateur:

const editUtilisateur = (utilisateur) => {
  // État local pour gérer la visibilité du mot de passe dans la fenêtre d'édition
  let passwordVisible = false;
  
  Swal.fire({
    background: 'white',
    color: 'black',
    customClass: {
      popup: 'custom-swal-popup',
      input: 'custom-swal-input',
      confirmButton: 'custom-swal-confirm-button',
      actions: 'custom-swal-actions'
    },
    title: 'Modifier l\'utilisateur',
    html: `
      <style>
        .custom-swal-popup { border-radius: 50px; }
        .custom-swal-input { 
          border: 1px solid black !important; 
          color: black !important;
          background: transparent !important;
          margin-bottom: 10px;
        }
        .custom-swal-input::placeholder { color: rgba(0,0,0,0.7) !important; }
        .custom-swal-confirm-button { 
          background-color: white !important; 
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
        .password-field-container {
          position: relative;
          width: 100%;
        }
        .toggle-password-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #666;
        }
        .toggle-password-btn:hover {
          color: #333;
        }
        .swal-password-label {
          display: block;
          text-align: left;
          margin-bottom: 5px;
          font-size: 14px;
          color: #333;
        }
      </style>
      <input id="swal-input-nom" type="text" class="swal2-input custom-swal-input" 
        value="${utilisateur.nom}" placeholder="Nom">
      <input id="swal-input-prenom" type="text" class="swal2-input custom-swal-input" 
        value="${utilisateur.prenom}" placeholder="Prénom">
      <input id="swal-input-matricule" type="text" class="swal2-input custom-swal-input" 
        value="${utilisateur.matricule}" placeholder="Matricule">
      <input id="swal-input-username" type="text" class="swal2-input custom-swal-input" 
        value="${utilisateur.username}" placeholder="Nom d'utilisateur">
      
      <div class="password-field-container">
        <label for="swal-input-password" class="swal-password-label">Nouveau mot de passe (laisser vide pour ne pas modifier)</label>
        <input id="swal-input-password" type="password" class="swal2-input custom-swal-input" 
          value="" placeholder="Nouveau mot de passe">
        <button type="button" id="toggle-password-btn" class="toggle-password-btn">
          <svg id="eye-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <svg id="eye-off-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
            <line x1="2" x2="22" y1="2" y2="22"></line>
          </svg>
        </button>
      </div>
      
      <select id="swal-input-role" class="swal2-input custom-swal-input">
        ${roles.map(role => 
          `<option value="${role}" ${utilisateur.role === role ? 'selected' : ''}>${role}</option>`
        ).join('')}
      </select>
      <div class="w-full flex justify-center space-x-4 pb-4 mt-4">
        <button id="close-btn" class="bg-transparent border text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-black/10">
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
        nom: document.getElementById('swal-input-nom').value,
        prenom: document.getElementById('swal-input-prenom').value,
        matricule: document.getElementById('swal-input-matricule').value,
        username: document.getElementById('swal-input-username').value,
        password: document.getElementById('swal-input-password').value,
        role: document.getElementById('swal-input-role').value
      };
    },
    didOpen: () => {
      // Gestion de l'affichage/masquage du mot de passe
      const togglePasswordBtn = document.getElementById('toggle-password-btn');
      const passwordInput = document.getElementById('swal-input-password');
      const eyeIcon = document.getElementById('eye-icon');
      const eyeOffIcon = document.getElementById('eye-off-icon');
      
      togglePasswordBtn.addEventListener('click', () => {
        passwordVisible = !passwordVisible;
        
        if (passwordVisible) {
          passwordInput.type = 'text';
          eyeIcon.style.display = 'none';
          eyeOffIcon.style.display = 'block';
        } else {
          passwordInput.type = 'password';
          eyeIcon.style.display = 'block';
          eyeOffIcon.style.display = 'none';
        }
      });
      
      document.getElementById('confirm-btn').addEventListener('click', () => {
        Swal.close({ 
          isConfirmed: true, 
          value: {
            nom: document.getElementById('swal-input-nom').value,
            prenom: document.getElementById('swal-input-prenom').value,
            matricule: document.getElementById('swal-input-matricule').value,
            username: document.getElementById('swal-input-username').value,
            password: document.getElementById('swal-input-password').value,
            role: document.getElementById('swal-input-role').value
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
        const token = localStorage.getItem('token');
        const updateData = {
          nom: result.value.nom,
          prenom: result.value.prenom,
          matricule: result.value.matricule,
          username: result.value.username,
          role: result.value.role
        };
        
        // Ajouter le mot de passe seulement s'il a été fourni
        if (result.value.password.trim() !== '') {
          updateData.password = result.value.password;
        }
        
        const { data } = await axios.put(`${API_BASE_URL}/api/users/${utilisateur._id}`, updateData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
  
        setUtilisateurs(utilisateurs.map(user => 
          user._id === utilisateur._id ? data : user
        ));
        
        showSuccessAlert('Les modifications ont été enregistrées.');
      } catch (error) {
        console.error('Erreur lors de la modification de l\'utilisateur:', error.response?.data?.message || error.message);
        showErrorAlert(error.response?.data?.message || 'Erreur lors de la modification de l\'utilisateur');
      }
    }
  });
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUtilisateur(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="w-300 relative">
      <div className="bg-white rounded-2xl border-3 p-4 text-center text-blue-900">
        <div className="mb-4">
          <UserCog strokeWidth={0.75} size={60} className="mx-auto mb-3 text-blue-900" />
          
          <div className="mb-3 grid grid-cols-4 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                name="nom"
                value={newUtilisateur.nom}
                onChange={handleInputChange}
                placeholder="Doe"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                name="prenom"
                value={newUtilisateur.prenom}
                onChange={handleInputChange}
                placeholder="John"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matricule</label>
              <input
                type="text"
                name="matricule"
                value={newUtilisateur.matricule}
                onChange={handleInputChange}
                placeholder="EMP001"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
              <select
                name="role"
                value={newUtilisateur.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {roles.map((role, index) => (
                  <option key={index} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
              <input
                type="text"
                name="username"
                value={newUtilisateur.username}
                onChange={handleInputChange}
                placeholder="john.doe"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div className="relative">
  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
  <input
    type={showPassword ? "text" : "password"}
    name="password"
    value={newUtilisateur.password}
    onChange={handleInputChange}
    placeholder="••••••••"
    className="w-full px-3 py-2 border rounded-lg pr-10"
  />
  <button
    type="button"
    onClick={togglePasswordVisibility}
    className="absolute inset-y-0 right-0 pr-3 flex items-center pt-5 "
    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
  >
    {showPassword ? (
     <Eye id='masquer_btnadd'/>
    ) : (
      <EyeOff id='masquer_btnadd'/>
    )}
  </button>
</div>
          </div>

          <button
            onClick={addUtilisateur}
            className="addUtilisateur_btn"
          >
            Ajouter Utilisateur
          </button>
        </div>
      </div>
      <br />
      <div className="bg-white rounded-2xl border-3 text-blue-900 p-4 mb-4 max-h-96 overflow-y-auto">
        <h3 className="font-medium text-gray-700 mb-2 text-center">
          Liste des Utilisateurs
          <span className={`ml-2 px-2 py-1 rounded-full text-xs text-white ${utilisateurs.length === 0 ? 'bg-red-500' : 'bg-green-500'}`}>
            {utilisateurs.length}
          </span>
        </h3>
        {loading ? (
          <div className="text-center py-4">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-xs font-medium  
                  id='masquer_btnadd'uppercase tracking-wider">Nom</th>
                  <th className="px-4 py-2 text-xs font-medium  
                  id='masquer_btnadd'uppercase tracking-wider">Prénom</th>
                  <th className="px-4 py-2 text-xs font-medium  
                  id='masquer_btnadd'uppercase tracking-wider">Matricule</th>
                  <th className="px-4 py-2 text-xs font-medium  
                  id='masquer_btnadd'uppercase tracking-wider">Nom d'utilisateur</th>
                  <th className="px-4 py-2 text-xs font-medium  
                  id='masquer_btnadd'uppercase tracking-wider">Rôle</th>
                  <th className="px-4 py-2 text-xs font-medium  
                  id='masquer_btnadd'uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-center">
                {utilisateurs.map((utilisateur) => (
                  <tr key={utilisateur._id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{utilisateur.nom}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{utilisateur.prenom}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{utilisateur.matricule}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{utilisateur.username}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${utilisateur.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {utilisateur.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => editUtilisateur(utilisateur)}
                          className="edit_Inv p-1 rounded-full hover:bg-blue-100"
                          title="Modifier"
                        >
                          <Edit size={16}  />
                        </button>
                        <button
                          onClick={() => removeUtilisateur(utilisateur._id)}
                          className="remove_Inv p-1 rounded-full hover:bg-red-100"
                          title="Supprimer"
                        >
                          <X size={16}  />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {utilisateurs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-sm "
                    id='masquer_btnadd'>
                      Aucun utilisateur enregistré
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddUtilisateurs;