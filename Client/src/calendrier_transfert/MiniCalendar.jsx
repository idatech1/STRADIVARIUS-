import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CircleCheckBig, ChevronUp, ChevronDown, Circle, CircleX } from 'lucide-react';
import '../Css/calendriertransfer.css';

const MiniCalendar = ({ 
  currentMonth, 
  miniCalendarDays, 
  goToPrevMonth, 
  goToNextMonth, 
  selectDay,
  formatMonth,
  onMonthYearChange
}) => {
  const [showMonthYearSelector, setShowMonthYearSelector] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.getMonth());
  const [yearRange, setYearRange] = useState(() => {
    const currentYear = currentMonth.getFullYear();
    const startDecade = Math.floor(currentYear / 10) * 10;
    return [startDecade, startDecade + 9];
  });
  
  const [availableYears] = useState(() => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  });

  const months = [
    { value: 0, label: 'janv.' },
    { value: 1, label: 'févr.' },
    { value: 2, label: 'mars' },
    { value: 3, label: 'avr.' },
    { value: 4, label: 'mai' },
    { value: 5, label: 'juin' },
    { value: 6, label: 'juil.' },
    { value: 7, label: 'août' },
    { value: 8, label: 'sept.' },
    { value: 9, label: 'oct.' },
    { value: 10, label: 'nov.' },
    { value: 11, label: 'déc.' }
  ];

  const handleMonthSelect = (monthIndex) => {
    setSelectedMonth(monthIndex);
    const newDate = new Date(currentMonth);
    newDate.setMonth(monthIndex);
    onMonthYearChange(newDate);
    setShowMonthYearSelector(false);
  };

  const handleYearSelect = (year) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(year);
    onMonthYearChange(newDate);
    setShowYearSelector(false);
  };

  const toggleMonthYearSelector = () => {
    setShowMonthYearSelector(!showMonthYearSelector);
    setShowYearSelector(false);
  };

  const toggleYearSelector = () => {
    setShowYearSelector(!showYearSelector);
    setShowMonthYearSelector(false);
  };

  const goToPrevYearRange = () => {
    setYearRange([yearRange[0] - 10, yearRange[1] - 10]);
  };

  const goToNextYearRange = () => {
    setYearRange([yearRange[0] + 10, yearRange[1] + 10]);
  };

  const generateYears = () => {
    const years = [];
    for (let i = yearRange[0] - 2; i <= yearRange[1] + 2; i++) {
      years.push(i);
    }
    return years;
  };

  const years = generateYears();

  return (
    <div className="px-5 pt-2">
  {/* Header with current selection and navigation */}
  <div className="px-3 py-4 flex items-center justify-between text-white">
    {showYearSelector ? (
      <div >
     
        <span className="years  ">{yearRange[0]} - {yearRange[1]}</span>
      </div>
    ) : (
      <div 
        className='date-minicalendrier cursor-pointer rounded  py-1 relative group hover:bg-gray-500 transition-colors duration-200'
        onClick={showMonthYearSelector ? toggleYearSelector : toggleMonthYearSelector}
        title={showMonthYearSelector ? "Sélectionner l'année" : "Sélectionner le mois"}
      >
        {!showMonthYearSelector ? (
          <div className="years">
            <span>{formatMonth(currentMonth).split(' ')[0]} </span>
            <span>{formatMonth(currentMonth).split(' ')[1]}</span>
          </div>
        ) : (
          <span className="flex items-center gap-1">
            {currentMonth.getFullYear()}
          </span>
        )}
      </div>
    )}
    
    {!showMonthYearSelector && !showYearSelector ? (
      <div className="flex space-x-1">
        <button 
          onClick={goToPrevMonth} 
          className="p-1 rounded-full hover:bg-gray-500 cursor-pointer duration-500"
          aria-label="Mois précédent"
        >
          <ChevronLeft size={20} />
        </button>
        <button 
          onClick={goToNextMonth} 
          className="p-1 rounded-full hover:bg-gray-500 cursor-pointer duration-500"
          aria-label="Mois suivant"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    ) : showMonthYearSelector ? (
      <div className="flex space-x-2">
      
      </div>
    ) : (
      <div className="flex space-x-2">
  
        <button 
          onClick={goToPrevYearRange} 
          className="p-1 rounded-full hover:bg-gray-500 cursor-pointer duration-500"
          aria-label="Décennie précédente"
        >
          <ChevronUp size={20} />
        </button>
        <button 
          onClick={goToNextYearRange} 
          className="p-1 rounded-full hover:bg-gray-500 cursor-pointer duration-500"
          aria-label="Décennie suivante"
        >
          <ChevronDown size={20} />
        </button>
        <CircleX size={35}className="p-1 text-red-300 rounded-full hover:text-red-500 cursor-pointer duration-500" onClick={toggleYearSelector}/>
      </div>
    )}
  </div>
      
      {/* Month Selector with Fade Transition */}
      <div 
        className={`
           text-white 
          transition-opacity duration-900 ease-in-out 
          ${showMonthYearSelector && !showYearSelector ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}
        `}
      >
        <div className="grid grid-cols-4 gap-2 p-2">
          {months.map((month) => (
            <button
              key={month.value}
              className={`py-4 rounded text-center hover:bg-gray-500 cursor-pointer transition-all duration-300 ${
                selectedMonth === month.value ? 'bg-blue-900 text-white font-medium' : ''
              }`}
              onClick={() => handleMonthSelect(month.value)}
            >
              {month.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Year Selector with Fade Transition */}
      <div 
        className={`
           text-white 
          transition-opacity duration-900 ease-in-out 
          ${showYearSelector ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}
        `}
      >
        <div className="grid grid-cols-4 gap-2 p-2">
          {years.map((year) => (
            <button
              key={year}
              className={`py-4 rounded text-center hover:bg-gray-700 cursor-pointer transition-all duration-900 ${
                currentMonth.getFullYear() === year 
                  ? 'bg-blue-900 text-white font-medium' 
                  : year < yearRange[0] || year > yearRange[1] 
                    ? 'text-gray-500' 
                    : ''
              }`}
              onClick={() => handleYearSelect(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
      
      {/* Calendar View with Fade Transition */}
      <div 
        className={`
          transition-opacity duration-300 ease-in-out 
          ${!showMonthYearSelector && !showYearSelector ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}
        `}
      >
        <table className="w-full">
          <thead>
            <tr>
              {['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'].map((day, index) => (
                <th key={index} className="text-xs py-1">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {miniCalendarDays.map((week, weekIndex) => (
              <tr key={weekIndex}>
                {week.map((day, dayIndex) => (
                  <td 
                    key={dayIndex} 
                    className={`text-center py-2 cursor-pointer relative ${
                      day.isCurrentDay ? 'font-bold' : ''
                    }`}
                    onClick={() => selectDay(day.day, day.month)}
                  >
                    <div className="relative group">
                      <span className={`
                        inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-600
                        transition-colors duration-300
                        ${day.isCurrentDay ? 'bg-blue-900 text-white' : ''}
                        ${day.month !== 'current' && !day.isCurrentDay ? "text-gray-400" : ""}
                        ${day.hasEvent && !day.isCurrentDay ? "text-white font-semibold" : ""}
                        ${day.hasInventory ? "border-2 border-yellow-500" : ""}
                      `}>
                        {day.day}
                      </span>
                      
                      {/* Points indicateurs */}
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex justify-center space-x-1">
                        {day.hasEvent && !day.isCurrentDay && (
                          <span className="w-1 h-1 bg-blue-900 rounded-full"></span>
                        )}
                      </div>
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex justify-center space-x-1">
  {day.hasEvent && !day.isCurrentDay && (
    <>
      {day.transferCount > 0 && <span className="w-1 h-1 bg-blue-900 rounded-full"></span>}
      {day.manualTransferCount > 0 && <span className="w-1 h-1 bg-white rounded-full"></span>}
    </>
  )}
</div>
                      
                      {/* Tooltip avec fade */}
                      {(day.transferCount > 0 || day.inventoryCount > 0 || day.manualTransferCount > 0) && (
  <div className="
    absolute z-50 bottom-full ml-2 transform -translate-x-1/2
    bg-gray-800 text-white text-xs px-4 py-2 rounded whitespace-nowrap
    mb-2 pointer-events-none opacity-0 group-hover:opacity-100
    transition-opacity duration-300 shadow-lg
  ">
    <div className="flex flex-col items-start">
      {day.transferCount > 0 && (
        <div className="flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
          <span>{day.transferCount} transfert{day.transferCount > 1 ? 's' : ''} standard{day.transferCount > 1 ? 's' : ''}</span>
        </div>
      )}
      {day.manualTransferCount > 0 && (
        <div className="flex items-center mt-1">
          <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
          <span>{day.manualTransferCount} transfert{day.manualTransferCount > 1 ? 's' : ''} manuel{day.manualTransferCount > 1 ? 's' : ''}</span>
        </div>
      )}
      {day.inventoryCount > 0 && (
        <div className="flex items-center mt-1">
          <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
          <span>{day.inventoryCount} inventaire{day.inventoryCount > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-gray-800 rotate-45"></div>
  </div>
)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MiniCalendar;