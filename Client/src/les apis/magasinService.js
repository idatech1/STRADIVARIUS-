// src/services/magasinService.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getMagasins = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/magasins`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des magasins:', error);
    throw error;
  }
};

// Fonction pour vérifier si un magasin existe dans la liste des magasins actifs
export const isMagasinActive = (magasinName, activeWarehouses) => {
  // Normaliser le nom du magasin (supprimer "Stradi " s'il existe)
  const normalizedName = magasinName.replace(/^Stradi\s+/i, '');
  
  // Vérifier si le magasin existe dans la liste
  return activeWarehouses.some(warehouse => {
    const warehouseName = warehouse.nomMagasin.replace(/^Stradi\s+/i, '');
    return warehouseName.toLowerCase() === normalizedName.toLowerCase();
  });
};