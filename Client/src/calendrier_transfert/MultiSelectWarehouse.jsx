import React, { useState, useRef, useEffect } from 'react';
import { Warehouse, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { getMagasins } from "../les apis/magasinService";

const MultiSelectWarehouse = ({ 
  selectedWarehouses = [], 
  onChange,
  placeholder = "Sélectionner magasins",
  className = "",
  singleSelect = false // Ajouté pour permettre une sélection unique si nécessaire
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        setLoading(true); 
        const response = await getMagasins('/api/magasins');
        
        let warehouseData = [];
        
        if (response && response.data) {
          if (Array.isArray(response.data.data)) {
            warehouseData = response.data.data;
          } else if (Array.isArray(response.data)) {
            warehouseData = response.data;
          }
        }
        
        // Filtrer pour ne garder que les magasins actifs
        const activeWarehouses = warehouseData.filter(warehouse => warehouse.statut === 'active');
        
        // Ajouter uniquement l'option "Magasin inconnu" à la liste des actifs
        const warehousesWithUnknown = [
          ...activeWarehouses,
          { id: 'unknown', nomMagasin: 'Magasin inconnu', statut: 'inactive' }
        ];
        
        setWarehouses(warehousesWithUnknown);
        setError(null);
      } catch (err) {
        console.error('Erreur lors de la récupération des magasins:', err);
        setError('Impossible de charger les magasins');
        setWarehouses([]);
      } finally {
        setLoading(false);
      }
    };
  
    fetchWarehouses();
  }, []);

  // Modifiez filteredWarehouses pour utiliser les propriétés de l'objet
  const filteredWarehouses = warehouses.filter(
    warehouse => warehouse.nomMagasin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleWarehouse = (warehouse) => {
    if (singleSelect) {
      // Pour une sélection unique, remplacez la sélection actuelle
      onChange([warehouse]);
    } else {
      // Pour une sélection multiple
      const updatedSelection = selectedWarehouses.includes(warehouse)
        ? selectedWarehouses.filter(item => item !== warehouse)
        : [...selectedWarehouses, warehouse];
      
      onChange(updatedSelection);
    }
  };

  const toggleSelectAll = () => {
    if (singleSelect) return; // Pas de sélection totale en mode singleSelect
    onChange(selectedWarehouses.length === warehouses.length ? [] : [...warehouses]);
  };

  const removeWarehouse = (warehouse, e) => {
    e.stopPropagation();
    onChange(selectedWarehouses.filter(item => item !== warehouse));
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main dropdown button */}
      <div
        className={`flex items-center justify-between p-3 border rounded-lg bg-white cursor-pointer transition-all duration-200 ${
          isOpen ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300 hover:border-blue-400"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-2 items-center flex-1 min-h-8 overflow-hidden">
          {selectedWarehouses.length === 0 ? (
            <span className="text-gray-500 truncate">{placeholder}</span>
          ) : selectedWarehouses.length <= 3 ? (
            selectedWarehouses.map(warehouse => (
              <div 
                key={warehouse.id} 
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1 transition-all hover:bg-blue-200"
              >
                <span className="truncate max-w-[120px]">{warehouse.nomMagasin}</span>
                <X 
                  size={14} 
                  className="flex-shrink-0 cursor-pointer text-blue-600 hover:text-blue-800" 
                  onClick={(e) => removeWarehouse(warehouse, e)}
                />
              </div>
            ))
          ) : (
            <div className="text-blue-800 font-medium">
              {selectedWarehouses.length} magasins sélectionnés
            </div>
          )}
        </div>
        
        <div className="flex items-center ml-2">
          <Warehouse size={18} className="text-blue-600" />
          {isOpen ? (
            <ChevronUp size={20} className="text-gray-600 ml-1" />
          ) : (
            <ChevronDown size={20} className="text-gray-600 ml-1" />
          )}
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute mt-2  w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden animate-fadeIn">
          {/* Search input */}
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full p-2 pl-9 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              
            </div>
          </div>

          {/* Gestion des états de chargement et d'erreur */}
          {loading && (
            <div className="p-4 text-center text-gray-500 text-sm">
              Chargement des magasins...
            </div>
          )}
          
          {error && (
            <div className="p-4 text-center text-red-500 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Select all option */}
              {!singleSelect && (
                <div 
                  className="p-2 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={toggleSelectAll}
                >
                  <label className="flex items-center cursor-pointer px-2 py-1.5">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                      selectedWarehouses.length === warehouses.length 
                        ? "bg-blue-500 border-blue-500" 
                        : "border-gray-300"
                    }`}>
                      {selectedWarehouses.length === warehouses.length && (
                        <Check size={14} className="text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium">Sélectionner tout</span>
                  </label>
                </div>
              )}

              {/* List of warehouses */}
              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                {filteredWarehouses.length > 0 ? (
                  filteredWarehouses.map((warehouse) => (
                    <div 
                      key={warehouse.id} 
                      className={`py-1.5 hover:bg-blue-50 cursor-pointer transition-colors ${
                        selectedWarehouses.some(w => w.id === warehouse.id) ? "bg-blue-50" : ""
                      }`}
                      onClick={() => toggleWarehouse(warehouse)}
                    >
                      <div className="flex items-center px-2 py-1.5">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                          selectedWarehouses.some(w => w.id === warehouse.id)
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300"
                        }`}>
                          {selectedWarehouses.some(w => w.id === warehouse.id) && (
                            <Check size={14} className="text-white" />
                          )}
                        </div>
                        <span className="text-sm flex-1">{warehouse.nomMagasin}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Aucun magasin trouvé
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Animation styles */}
      <style >{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default MultiSelectWarehouse;