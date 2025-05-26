import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Boxes, Menu, X, Calendar as CalendarIcon } from 'lucide-react';
import MultiSelectWarehouse from '../calendrier_transfert/MultiSelectWarehouse';

const FilterComponent = ({ 
  goToPrevWeek, 
  goToNextWeek, 
  goToCurrentWeek,
  onFilterAll,
  onFilterInventory,
  onFilterTransfers,
  onFilterWarehouse,
  activeFilter,
  formatSelectedDate,
  onWeekSelect,
  currentMonth,
  filterDirection,
  setFilterDirection,
  selectedWarehouses = { from: [], to: [] }, // Modifié pour gérer deux listes
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [rotating, setRotating] = useState(false);
  
  const toggleMenu = () => {
    setRotating(true);
    setTimeout(() => {
      setRotating(false);
      setMenuVisible(!menuVisible);
    }, 300);
  };

  const getWeekNumber = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const generateWeekButtons = () => {
    const weeks = [];
    const year = currentMonth.getFullYear();
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    
    let currentWeekStart = new Date(firstDay);
    if (currentWeekStart.getDay() !== 1) {
      const diff = currentWeekStart.getDay() === 0 ? -6 : 1 - currentWeekStart.getDay();
      currentWeekStart.setDate(currentWeekStart.getDate() + diff);
    }
    
    while (currentWeekStart <= lastDay) {
      const weekNumber = getWeekNumber(currentWeekStart);
      weeks.push({
        start: new Date(currentWeekStart),
        weekNumber,
        isCurrent: weekNumber === getWeekNumber(currentMonth)
      });
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return weeks;
  };

  const handleDirectionChange = (direction) => {
    setFilterDirection(prev => ({
      ...prev,
      [direction]: !prev[direction]
    }));
  };

  const handleWeekSelect = (weekStart) => {
    onWeekSelect(weekStart);
  };

  const handleWarehouseChange = (type, warehouses) => {
    onFilterWarehouse({
      ...selectedWarehouses,
      [type]: warehouses
    });
  };

  const ToggleIcon = menuVisible ? X : CalendarIcon;

  return (
    <div className="flex flex-col relative">
      {/* Bouton de toggle pour les semaines */}
      <div className="flex justify-end pr-2">
        <div className="relative group">
          <button
            onClick={toggleMenu}
            className={`w-10 h-10 mt-1 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 cursor-pointer
              transition-transform duration-300 ${rotating ? 'rotate-180' : ''}`}
          >
            <ToggleIcon className="text-gray-700" size={20} />
          </button>
          <span className="hidden group-hover:block absolute z-10 right-full top-1/2 transform -translate-y-1/2 bg-blue-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap mr-2 pointer-events-none">
            {menuVisible ? 'Masquer les semaines' : 'Afficher les semaines'}
          </span>
        </div>
      </div>

      {/* Rangée des boutons de semaine - Position absolue */}
      {menuVisible && (
        <div id='All_calendar' className="absolute right-2 top-12 z-50 bg-white p-4 rounded-lg shadow-lg">
          <div className="flex flex-wrap gap-1 ">
            {generateWeekButtons().map((week, index) => (
              <div key={index} className="relative group">
                <button
                  className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-colors duration-200 relative ${
                    week.isCurrent 
                      ? 'bg-blue-900 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 cursor-pointer'
                  }`}
                  onClick={() => handleWeekSelect(week.start)}
                >
                  S{week.weekNumber}
                </button>
                <span className="hidden group-hover:block absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 bg-blue-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap mb-2">
                  Semaine {week.weekNumber}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barre de navigation principale */}
      <div className="flex items-center p-3 bg-white">
        {/* Navigation entre semaines */}
        <div className="flex items-center mr-6">
          <button 
            id='Today1' 
            className="px-3 py-1 group relative" 
            onClick={goToPrevWeek}
          >
            <ChevronLeft />
            <span className="hidden group-hover:block absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 bg-blue-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap mb-2">
              Semaine précédente
            </span>
          </button>
          
          <button 
            id='Today1' 
            className="px-3 py-1 group relative" 
            onClick={goToCurrentWeek}
          >
            CETTE SEMAINE
            <span className="
              hidden group-hover:block 
              absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 
              bg-blue-900 text-white text-xs 
              px-2 py-1 rounded 
              whitespace-nowrap 
              mb-2
            ">
              Retour à la semaine actuelle
            </span>
          </button>
          
          <button 
            id='Today1' 
            className="px-3 py-1 group relative" 
            onClick={goToNextWeek}
          >
            <ChevronRight />
            <span className="hidden group-hover:block absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 bg-blue-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap mb-2">
              Semaine suivante
            </span>
          </button>
        </div>
        
        {/* Date sélectionnée */}
        <div className='flex items-center ml-auto text-lg font-bold'>
          {formatSelectedDate()}
        </div> 
        
        {/* Filtres */}
        <div className='flex items-center ml-auto space-x-2'>
          {/* Conteneur pour la sélection des magasins et les checkboxes */}
          <div className="flex items-center border border-gray-200 rounded-lg p-1 bg-white">
            {/* Checkbox "De" */}
            <label className="flex items-center mx-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterDirection.from}
                onChange={() => handleDirectionChange('from')}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">De</span>
            </label>

            {/* Sélection multiple pour les magasins source */}
            <MultiSelectWarehouse
              selectedWarehouses={selectedWarehouses.from}
              onChange={(warehouses) => handleWarehouseChange('from', warehouses)}
              placeholder="Magasins source"
              className="mr-2"
            />

            {/* Checkbox "Vers" */}
            <label className="flex items-center mx-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterDirection.to}
                onChange={() => handleDirectionChange('to')}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Vers</span>
            </label>

            {/* Sélection multiple pour les magasins destination */}
            <MultiSelectWarehouse
              selectedWarehouses={selectedWarehouses.to}
              onChange={(warehouses) => handleWarehouseChange('to', warehouses)}
              placeholder="Magasins destination"
            />
          </div>

          <div className="flex"> 
            {/* Bouton Tout */}
            <button 
              id='All1' 
              className={`px-3 py-1 rounded-md transition-all group relative ${
                activeFilter === 'all' 
                  ? 'border-2 border-blue-900 shadow-md shadow-blue-200 bg-blue-50' 
                  : 'border border-blue-200'
              }`}
              onClick={onFilterAll}
            >
              TOUT
              <span className="
                hidden group-hover:block 
                absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 
                bg-blue-900 text-white text-xs 
                px-2 py-1 rounded 
                whitespace-nowrap 
                mb-2
              ">
                Afficher tous les éléments
              </span>
            </button>
            
            {/* Bouton Inventaire */}
            <button 
              id='All1' 
              className={`p-2 mx-1 rounded-md transition-all group relative ${
                activeFilter === 'inventory' 
                  ? 'border-2 border-blue-900 shadow-md shadow-blue-200 bg-blue-50' 
                  : 'border border-blue-200'
              }`}
              onClick={onFilterInventory}
            >
              <Boxes />
              <span className="
                hidden group-hover:block 
                absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 
                bg-blue-900 text-white text-xs 
                px-2 py-1 rounded 
                whitespace-nowrap 
                mb-2
              ">
                Filtrer l'inventaire
              </span>
            </button>
            
            {/* Bouton Transferts */}
            <button 
              id='All1' 
              className={`px-3 py-1 rounded-md transition-all group relative ${
                activeFilter === 'transfers' 
                  ? 'border-2 border-blue-900 shadow-md shadow-blue-200 bg-blue-50' 
                  : 'border border-blue-200'
              }`}
              onClick={onFilterTransfers}
            >
              Transferts
              <span className="
                hidden group-hover:block 
                absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 
                bg-blue-900 text-white text-xs 
                px-2 py-1 rounded 
                whitespace-nowrap 
                mb-2
              ">
                Filtrer les transferts
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterComponent;