import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';

const DatePicker = ({ selectedDate, onDateChange }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const calendarRef = useRef(null);
  
  // Initialiser la date d'affichage du calendrier
  const [viewDate, setViewDate] = useState(() => {
    return selectedDate ? new Date(selectedDate) : new Date();
  });
  
  // Mettre à jour la date d'affichage lorsque selectedDate change
  useEffect(() => {
    if (selectedDate) {
      setViewDate(new Date(selectedDate));
    }
  }, [selectedDate]);

  // Formater la date pour l'affichage
  const formatDisplayDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Fermer le calendrier si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
        setShowYearSelector(false);
        setShowMonthSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Générer le mois courant pour le calendrier
  const generateCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Ajuster pour que la semaine commence le lundi (1) au lieu du dimanche (0)
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay === -1) startDay = 6; // Dimanche devient le 7ème jour
    
    const daysInMonth = lastDayOfMonth.getDate();
    
    const calendar = [];
    
    // Jours de la semaine
    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    
    // Ajouter jours vides pour aligner le premier jour
    let days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Ajouter les jours du mois
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
      
      if (days.length === 7) {
        calendar.push([...days]);
        days = [];
      }
    }
    
    // Compléter la dernière semaine
    if (days.length > 0) {
      while (days.length < 7) {
        days.push(null);
      }
      calendar.push(days);
    }
    
    return { weekDays, calendar, year, month };
  };
  
  const { weekDays, calendar, year, month } = generateCalendarDays();
  
  // Mois en français
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Navigation entre les mois
  const goToPrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
    setShowMonthSelector(false);
    setShowYearSelector(false);
  };

  const goToNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
    setShowMonthSelector(false);
    setShowYearSelector(false);
  };

  // Sélectionner un mois
  const selectMonth = (monthIndex) => {
    setViewDate(new Date(year, monthIndex, 1));
    setShowMonthSelector(false);
  };

  // Sélectionner une année
  const selectYear = (selectedYear) => {
    setViewDate(new Date(selectedYear, month, 1));
    setShowYearSelector(false);
  };

  // Générer les années pour le sélecteur
  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  // Sélectionner une date
  const handleDayClick = (year, month, day) => {
    const newDate = new Date(year, month, day);
    const formattedDate = newDate.toISOString().split('T')[0];
    onDateChange(formattedDate);
    setShowCalendar(false);
  };
  
  // Vérifier si un jour est aujourd'hui
  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };
  
  // Vérifier si un jour est sélectionné
  const isSelected = (day) => {
    if (!selectedDate || !day) return false;
    const date = new Date(selectedDate);
    return day === date.getDate() && 
           month === date.getMonth() && 
           year === date.getFullYear();
  };

  // Ouvrir/fermer le calendrier
  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
    setShowYearSelector(false);
    setShowMonthSelector(false);
  };

  // Ouvrir/fermer le sélecteur de mois
  const toggleMonthSelector = (e) => {
    e.stopPropagation();
    setShowMonthSelector(!showMonthSelector);
    setShowYearSelector(false);
  };

  // Ouvrir/fermer le sélecteur d'année
  const toggleYearSelector = (e) => {
    e.stopPropagation();
    setShowYearSelector(!showYearSelector);
    setShowMonthSelector(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={formatDisplayDate(selectedDate)}
          readOnly
          placeholder="Sélectionner une date"
          className="w-full px-3 py-2 border rounded-lg cursor-pointer"
          onClick={toggleCalendar}
        />
        <Calendar 
          size={20}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
        />
      </div>
      
      {showCalendar && (
        <div 
          ref={calendarRef}
          className="absolute z-10 mt-1 p-2 bg-white border rounded-lg shadow-lg"
          style={{ width: '280px' }}
        >
          {/* En-tête avec navigation */}
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={goToPrevMonth}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex items-center space-x-1">
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-medium"
                onClick={toggleMonthSelector}
              >
                {months[month]}
              </button>
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-medium flex items-center"
                onClick={toggleYearSelector}
              >
                {year} <ChevronsUpDown size={12} className="ml-1" />
              </button>
            </div>
            
            <button 
              onClick={goToNextMonth}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          {/* Sélecteur de mois */}
          {showMonthSelector && (
            <div className="grid grid-cols-3 gap-1 mb-2">
              {months.map((monthName, idx) => (
                <button
                  key={idx}
                  className={`py-1 text-sm rounded ${
                    idx === month ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => selectMonth(idx)}
                >
                  {monthName.substr(0, 3)}
                </button>
              ))}
            </div>
          )}
          
          {/* Sélecteur d'année */}
          {showYearSelector && (
            <div className="h-52 overflow-y-auto">
              <div className="grid grid-cols-3 gap-1">
                {generateYears().map((yearNum) => (
                  <button
                    key={yearNum}
                    className={`py-1 text-sm rounded ${
                      yearNum === year ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => selectYear(yearNum)}
                  >
                    {yearNum}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Calendrier */}
          {!showMonthSelector && !showYearSelector && (
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day, index) => (
                <div key={index} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
              
              {calendar.map((week, weekIndex) => (
                week.map((day, dayIndex) => (
                  <div 
                    key={`${weekIndex}-${dayIndex}`}
                    className={`text-center py-1 rounded-full ${
                      day ? 'cursor-pointer hover:bg-blue-100' : ''
                    } ${
                      isToday(day) ? 'bg-blue-100' : ''
                    } ${
                      isSelected(day) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
                    }`}
                    onClick={() => day && handleDayClick(year, month, day)}
                  >
                    {day || ''}
                  </div>
                ))
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatePicker;