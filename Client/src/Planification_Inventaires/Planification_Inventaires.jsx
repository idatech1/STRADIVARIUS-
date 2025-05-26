import React, { useState, useEffect } from 'react';
import MiniCalendar_inventaires from './MiniCalendar_inventaires';
import { Boxes, Edit, RotateCcw, X, ChevronUp, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import '../Css/Planification_Inventaires.css';
import logo from "/Logo-nesk-investment@2x.png";
import DatePicker from './DatePicker';

const Planification_Inventaires = () => {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Toggle states for sections
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [showInventoryList, setShowInventoryList] = useState(true);

  // États pour le mini calendrier
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [miniCalendarDays, setMiniCalendarDays] = useState([]);
  const [destinations, setDestinations] = useState([]); // Array of { _id, nomMagasin } objects
const [selectedStore, setSelectedStore] = useState(''); // Store magasin _id instead of name
const [newInventory, setNewInventory] = useState({
  date: '',
  destination: '', // Will store magasin _id
  comment: '',
  status: 'En attente'
});

  // Helper function to get auth headers
  const getAuthHeaders = (includeContentType = true) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  };

  // Formater le mois pour l'affichage
  const formatMonth = (date) => {
    const options = { month: 'long', year: 'numeric' };
    const formatted = date.toLocaleDateString('fr-FR', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Générer les jours pour le mini calendrier
  const generateCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDay = firstDayOfMonth.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Obtenir le dernier jour du mois précédent
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const weeks = [];
    let days = [];
    
    // Ajouter les jours du mois précédent
    for (let i = startDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push({
        day,
        month: 'prev',
        isCurrentDay: false,
        hasEvent: false,
        hasInventory: false,
        transferCount: 0,
        inventoryCount: 0
      });
    }
    
    // Marquer les jours qui ont des inventaires
    const today = new Date();
    const isToday = (year === today.getFullYear() && month === today.getMonth());
    
    // Ajouter les jours du mois courant
    for (let i = 1; i <= daysInMonth; i++) {
      const isCurrentDay = isToday && i === today.getDate();
      
      // Vérifier si ce jour a des inventaires
      const inventoriesOnThisDay = inventories.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getDate() === i && 
               invDate.getMonth() === month && 
               invDate.getFullYear() === year;
      });
      
      days.push({
        day: i,
        month: 'current',
        isCurrentDay,
        hasEvent: inventoriesOnThisDay.length > 0,
        hasInventory: inventoriesOnThisDay.length > 0,
        transferCount: 0,
        inventoryCount: inventoriesOnThisDay.length
      });
      
      if (days.length === 7) {
        weeks.push([...days]);
        days = [];
      }
    }
    
    // Ajouter les jours du mois suivant
    let nextMonthDay = 1;
    while (days.length < 7) {
      days.push({
        day: nextMonthDay++,
        month: 'next',
        isCurrentDay: false,
        hasEvent: false,
        hasInventory: false,
        transferCount: 0,
        inventoryCount: 0
      });
    }
    
    weeks.push(days);
    
    // Assurer que nous avons 6 semaines pour une apparence uniforme
    while (weeks.length < 6) {
      days = [];
      for (let i = 0; i < 7; i++) {
        days.push({
          day: nextMonthDay++,
          month: 'next',
          isCurrentDay: false,
          hasEvent: false,
          hasInventory: false,
          transferCount: 0,
          inventoryCount: 0
        });
      }
      weeks.push(days);
    }
    
    return weeks;
  };

  // Navigation du calendrier
  const goToPrevMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(date);
  };

  const goToNextMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(date);
  };

  const selectDay = (day, monthType) => {
    let date = new Date(currentMonth);
    
    if (monthType === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else if (monthType === 'next') {
      date.setMonth(date.getMonth() + 1);
    }
    
    date.setDate(day);
    
    // Formater la date pour le input de type date (YYYY-MM-DD)
    const formattedDate = date.toISOString().split('T')[0];
    
    setNewInventory(prev => ({
      ...prev,
      date: formattedDate
    }));
    
    // Stocker le jour sélectionné pour le style
    setSelectedDate(date);
  };

  // Mettre à jour le mois et l'année
  const handleMonthYearChange = (newDate) => {
    setCurrentMonth(newDate);
  };

  // Filtrer les inventaires
  const filteredInventories = inventories.filter(inventory => {
    // Filtre par magasin
    if (selectedStore && inventory.destination._id !== selectedStore) {
      return false;
    }
  
    // Filtre par date
    if (selectedDate) {
      const invDate = new Date(inventory.date);
      return (
        invDate.getDate() === selectedDate.getDate() &&
        invDate.getMonth() === selectedDate.getMonth() &&
        invDate.getFullYear() === selectedDate.getFullYear()
      );
    }
  
    return true;
  });
  // Fetch inventories and destinations on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inventoriesRes, destinationsRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventories`, {
            headers: getAuthHeaders(false)
          }),
          fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventories/destinations`, {
            headers: getAuthHeaders(false)
          })
        ]);
  
        if (!inventoriesRes.ok) {
          const errorData = await inventoriesRes.json();
          throw new Error(errorData.message || 'Failed to fetch inventories');
        }
  
        if (!destinationsRes.ok) {
          const errorData = await destinationsRes.json();
          throw new Error(errorData.message || 'Failed to fetch destinations');
        }
  
        const inventoriesData = await inventoriesRes.json();
        const destinationsData = await destinationsRes.json();
  
        setInventories(inventoriesData.data);
        setDestinations(destinationsData.data); // Array of { _id, nomMagasin }
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
        setLoading(false);
        showErrorAlert(err.message);
      }
    };
  
    fetchData();
  }, []);

  // Mettre à jour le miniCalendarDays lorsque les inventaires ou le mois courant changent
  useEffect(() => {
    setMiniCalendarDays(generateCalendarDays(currentMonth));
  }, [inventories, currentMonth]);

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

  const addInventory = async () => {
    if (!newInventory.date || !newInventory.destination) {
      Swal.fire({
        background: 'transparent',
        title: '<span class="text-white">Champs manquants!</span>',
        html: '<span class="text-white">Veuillez remplir la date et la destination.</span>',
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
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventories`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date: newInventory.date,
          destination: newInventory.destination,
          comment: newInventory.comment,
          status: newInventory.status
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create inventory');
      }
  
      const createdInventory = await response.json();
      
      // Trouver le magasin complet par son ID
      const selectedDestination = destinations.find(dest => dest._id === newInventory.destination);
      
      // Ajouter l'inventaire avec le magasin complet
      setInventories([...inventories, {
        ...createdInventory.data,
        destination: selectedDestination // Remplacer par l'objet magasin complet
      }]);
      
      setNewInventory({ date: '', destination: '', comment: '', status: 'En attente' });
      showSuccessAlert('L\'inventaire a été planifié avec succès');
      
      // Mettre à jour le calendrier après l'ajout
      setMiniCalendarDays(generateCalendarDays(currentMonth));
    } catch (err) {
      console.error('Add inventory error:', err);
      showErrorAlert(err.message);
    }
  };
  const removeInventory = async (id) => {
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
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventories/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(false)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete inventory');
          }

          setInventories(inventories.filter(inv => inv._id !== id));
          showSuccessAlert('L\'inventaire a été supprimé');
          
          // Mettre à jour le calendrier après la suppression
          setMiniCalendarDays(generateCalendarDays(currentMonth));
        } catch (err) {
          console.error('Delete inventory error:', err);
          showErrorAlert(err.message);
        }
      }
    });
  };

  const editInventory = async (inventory) => {
    Swal.fire({
      background: 'white',
      color: 'white',
      customClass: {
        popup: 'custom-swal-popup',
        input: 'custom-swal-input',
        confirmButton: 'custom-swal-confirm-button',
        actions: 'custom-swal-actions'
      },
      title: 'Modifier l\'inventaire',
      html: `
        <style>
          .custom-swal-popup { border-radius: 50px; color: black !important; }
          .custom-swal-input { 
            border: 1px solid black !important; 
            color: black !important;
            background: transparent !important;
            margin-bottom: 10px;
          }
          .custom-swal-input::placeholder { color: rgba(255,255,255,0.7) !important; }
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
        </style>
        <input id="swal-input-date" type="date" class="swal2-input custom-swal-input" 
          value="${inventory.date.split('T')[0]}" placeholder="Date">
        <select id="swal-input-destination" class="swal2-input custom-swal-input">
          ${destinations.map(dest => 
            `<option value="${dest._id}" ${inventory.destination._id === dest._id ? 'selected' : ''}>${dest.nomMagasin}</option>`
          ).join('')}
        </select>
        <select id="swal-input-status" class="swal2-input custom-swal-input">
          <option value="En attente" ${inventory.status === 'En attente' ? 'selected' : ''}>En attente</option>
          <option value="En cours" ${inventory.status === 'En cours' ? 'selected' : ''}>En cours</option>
          <option value="Confirmé" ${inventory.status === 'Confirmé' ? 'selected' : ''}>Confirmé</option>
          <option value="Annulé" ${inventory.status === 'Annulé' ? 'selected' : ''}>Annulé</option>
        </select>
        <input id="swal-input-comment" type="text" class="swal2-input custom-swal-input" 
          value="${inventory.comment || ''}" placeholder="Commentaire (optionnel)">
        <div class="w-full flex justify-center space-x-4 pb-4 mt-4">
          <button id="close-btn" class="bg-transparent border text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
          <button id="confirm-btn" class="bg-transparent border text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/10">
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
          date: document.getElementById('swal-input-date').value,
          destination: document.getElementById('swal-input-destination').value,
          status: document.getElementById('swal-input-status').value,
          comment: document.getElementById('swal-input-comment').value
        };
      },
      didOpen: () => {
        document.getElementById('confirm-btn').addEventListener('click', () => {
          Swal.close({ 
            isConfirmed: true, 
            value: {
              date: document.getElementById('swal-input-date').value,
              destination: document.getElementById('swal-input-destination').value,
              status: document.getElementById('swal-input-status').value,
              comment: document.getElementById('swal-input-comment').value
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
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventories/${inventory._id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              date: result.value.date,
              destination: result.value.destination,
              status: result.value.status,
              comment: result.value.comment
            })
          });
        
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update inventory');
          }
        
          const updatedInventory = await response.json();
          
          // Trouver le magasin complet par son ID
          const selectedDestination = destinations.find(dest => dest._id === result.value.destination);
          
          setInventories(inventories.map(inv => 
            inv._id === inventory._id ? {
              ...updatedInventory.data,
              destination: selectedDestination // Remplacer par l'objet magasin complet
            } : inv
          ));
          
          showSuccessAlert('Les modifications ont été enregistrées');
        
          // Mettre à jour le calendrier après la modification
          setMiniCalendarDays(generateCalendarDays(currentMonth));
        } catch (err) {
          console.error('Update inventory error:', err);
          showErrorAlert(err.message);
        }
      }
    });
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewInventory(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Toggle handlers
  const toggleCreateForm = () => {
    setShowCreateForm(!showCreateForm);
  };

  const toggleInventoryList = () => {
    setShowInventoryList(!showInventoryList);
  };

  if (loading) {
    return (
      <div className="w-300 relative flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-300 relative bg-white rounded-2xl text-blue-900 border-3 p-4 text-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className='ALL_Import'>
      
      <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mini Calendrier */}
        
        {/* Mini Calendrier */}
<div className="minicalendarinv rounded-2xl text-white border-3 p-4 shadow-lg h-[600px] overflow-hidden">
   <div className="flex flex-col items-center justify-center pt-6">
      <div className="h-12">
        <img 
          src={logo} 
          alt="IDOA TECH" 
          className="h-full object-contain"
        />
      </div>
    </div>
  <MiniCalendar_inventaires
    currentMonth={currentMonth}
    miniCalendarDays={miniCalendarDays}
    goToPrevMonth={goToPrevMonth}
    goToNextMonth={goToNextMonth}
    selectDay={selectDay}
    formatMonth={formatMonth}
    onMonthYearChange={handleMonthYearChange}
  />
</div>
        
        {/* Formulaire d'inventaire */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl text-blue-900 border-3 p-4 text-center mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-lg">Création d'inventaire</h3>
              <button 
                onClick={toggleCreateForm}
                className="p-2 rounded-full hover:bg-gray-100 cursor-pointer transition-all duration-300"
                aria-label={showCreateForm ? "Masquer le formulaire" : "Afficher le formulaire"}
              >
                {showCreateForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            
            <div 
              className={`transition-all duration-500 ${showCreateForm ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
            >
              <div className="mb-4">
                <Boxes strokeWidth={0.75} size={60} className="mx-auto mb-3 text-blue-900" />
                
                <div className="mb-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
  <DatePicker
    selectedDate={newInventory.date}
    onDateChange={(date) => {
      setNewInventory(prev => ({
        ...prev,
        date: date
      }));
      
      // Mettre à jour également le selectedDate pour la cohérence avec le mini-calendrier
      if (date) {
        setSelectedDate(new Date(date));
      }
    }}
  />
</div>
                  
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
  <select
    name="destination"
    value={newInventory.destination}
    onChange={handleInputChange}
    className="w-full px-3 py-2 border rounded-lg"
  >
    <option value="">Sélectionnez une destination</option>
    {destinations.map((dest) => (
      <option key={dest._id} value={dest._id}>{dest.nomMagasin}</option>
    ))}
  </select>
</div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                    <select
                      name="status"
                      value={newInventory.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="En attente">En attente</option>
                      <option value="En cours">En cours</option>
                      <option value="Confirmé">Confirmé</option>
                      <option value="Annulé">Annulé</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
                    <input
                      type="text"
                      name="comment"
                      value={newInventory.comment}
                      onChange={handleInputChange}
                      placeholder="Optionnel"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <button
                  onClick={addInventory}
                  className="addInventory_btn"
                >
                  Planifier Inventaire
                </button>
              </div>
            </div>
          </div>
          
          {/* Liste des inventaires */}
          <div className="bg-white rounded-2xl border-3 p-4 mb-4 text-blue-900">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-lg">
                Liste des Inventaires
                <span className={`ml-2 px-2 py-1 rounded-full text-xs text-white ${filteredInventories.length === 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                  {filteredInventories.length}
                </span>
              </h3>
              
              <div className="flex items-center ">
              <select
  value={selectedStore}
  onChange={(e) => setSelectedStore(e.target.value)}
  className="px-3 py-2 border rounded-lg text-sm mr-2 cursor-pointer"
>
  <option value="">Tous les magasins</option>
  {destinations.map((dest) => (
    <option key={dest._id} value={dest._id}>{dest.nomMagasin}</option>
  ))}
</select>
                
                <button 
                  onClick={toggleInventoryList}
                  className="p-2 rounded-full hover:bg-gray-100 cursor-pointer transition-all duration-300"
                  aria-label={showInventoryList ? "Masquer la liste" : "Afficher la liste"}
                >
                  {showInventoryList ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>
            </div>

            <div 
              className={`transition-all duration-500  ${showInventoryList ? 'max-h-96 opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'}`}
            >
              {selectedStore || selectedDate ? (
                <button 
                  onClick={() => {
                    setSelectedStore('');
                    setSelectedDate(null);
                  }}
                  className="text-blue-800 text-sm underline mt-2 mb-2 flex items-center cursor-pointer "
                >
                  <RotateCcw size={16} className="mr-1"/> Réinitialiser les filtres
                </button>
              ) : null}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Commentaire</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-center">
                  {filteredInventories.length > 0 ? (
                    filteredInventories.map((inventory) => (
                      <tr key={inventory._id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {inventory.date ? new Date(inventory.date).toLocaleDateString() : 'Non spécifiée'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {inventory.destination.nomMagasin}
                        </td>
                        <td className={`px-4 py-2 whitespace-nowrap text-sm ${
                          inventory.status === 'En attente' ? 'text-orange-500' :
                          inventory.status === 'En cours' ? 'text-blue-600' :
                          inventory.status === 'Confirmé' ? 'text-green-600' :
                          'text-red-600'
                        }`}>
                          {inventory.status}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {inventory.comment || '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => editInventory(inventory)}
                              className="edit_Inv p-1 rounded-full hover:bg-blue-100"
                              title="Modifier"
                            >
                              <Edit size={16}  />
                            </button>
                            <button
                              onClick={() => removeInventory(inventory._id)}
                              className="remove_Inv p-1 rounded-full hover:bg-red-100"
                              title="Supprimer"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-500">
                        Aucun inventaire trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Planification_Inventaires;