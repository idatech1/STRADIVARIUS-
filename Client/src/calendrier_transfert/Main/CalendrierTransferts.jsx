import React, { useState, useEffect, useRef } from 'react';
import FilterComponent from '../../filter/FilterComponents';
import '../../Css/calendriertransfer.css'
import { PanelLeft, PanelLeftOpen } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import logo from "/Logo-nesk-investment@2x.png";
import MiniCalendar from '../MiniCalendar';
import TransferLegend from '../TransferLegend';
import MainCalendarHeader from '../MainCalendarHeader';
import CalendarGrid from '../grid/CalendarGrid';
import { 
  fetchWarehouses, 
  fetchAllTransfers, 
  createTransfer, 
  updateTransfer, 
  deleteTransfer, 
  updateInventory, 
  deleteInventory, 
  updateManualTransfer,
  formatDateToKey,
} from './TransferApiService';

const MySwal = withReactContent(Swal);
export const defaultDate = new Date(2021, 1, 25); // 25 février 2021
export const daysOfWeek = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

export const transferLegend = [
  { type: 'blue', label: 'En cours' },
  { type: 'green', label: 'Confirmé' },
  { type: 'orange', label: 'En attente' },
  { type: 'red', label: 'Annulé' },
  { type: 'yellow', label: 'Inventaire' },
  { type: 'manual', label: 'Transferts manuels' }
];

export const colorUtils = {
  getDotColor: (type) => {
    switch (type) {
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-green-500';
      case 'orange': return 'bg-orange-500';
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      case 'manual': return 'bg-black';
      default: return '';
    }
  },
  
  getBorderColor: (type) => {
    switch (type) {
      case 'blue': return 'border-blue-500';
      case 'green': return 'border-green-500';
      case 'orange': return 'border-orange-500';
      case 'red': return 'border-red-500';
      case 'yellow': return 'border-yellow-500';
      case 'manual': return 'border-black';
      default: return '';
    }
  },
  
  getBgColor: (type) => {
    switch (type) {
      case 'red': return 'bg-red-50';
      case 'blue': return 'bg-blue-50';
      case 'orange': return 'bg-orange-50';
      case 'green': return 'bg-green-50';
      case 'yellow': return 'bg-yellow-50';
      case 'manual': return 'bg-black-50';
      default: return '';
    }
  }
};

const CalendrierTransferts = () => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date();
    return isNaN(date.getTime()) ? new Date() : date;
  });
  const [filterDirection, setFilterDirection] = useState({
    from: true,
    to: true
  });
  const [miniCalendarDays, setMiniCalendarDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(defaultDate.getDate());
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [transfersData, setTransfersData] = useState({});
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [isMiniCalendarVisible, setIsMiniCalendarVisible] = useState(true);
  const [allTransfers, setAllTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const hoverAreaRef = useRef(null);
  const sidebarRef = useRef(null);
  const [selectedWarehouses, setSelectedWarehouses] = useState({ from: [], to: [] }); // Modifié pour gérer source et destination
  const { getDotColor, getBorderColor, getBgColor } = colorUtils;
  const [filter, setFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeLegend, setActiveLegend] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    if (!hoverAreaRef.current || !sidebarRef.current) return;

    const handleMouseEnter = () => {
      setTimeout(() => {
        setIsMiniCalendarVisible(true);
      }, 0);
    };

    const handleMouseLeave = (e) => {
      if (
        sidebarRef.current && (
          e.relatedTarget === sidebarRef.current || 
          sidebarRef.current.contains(e.relatedTarget)
        )
      ) {
        return;
      }
      
      setTimeout(() => {
        setIsMiniCalendarVisible(false);
      }, 0);
    };

    const hoverArea = hoverAreaRef.current;
    
    if (hoverArea) {
      hoverArea.removeEventListener('mouseenter', handleMouseEnter);
      hoverArea.removeEventListener('mouseleave', handleMouseLeave);
      
      hoverArea.addEventListener('mouseenter', handleMouseEnter);
      hoverArea.addEventListener('mouseleave', handleMouseLeave);
    }
  
    return () => {
      if (hoverArea) {
        hoverArea.removeEventListener('mouseenter', handleMouseEnter);
        hoverArea.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [hoverAreaRef.current, sidebarRef.current]);

  const handleFilterWarehouse = (warehouses) => {
    setSelectedWarehouses(warehouses);
  };

  const generateMiniCalendarDays = (date) => {
    const days = [];
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const daysFromPrevMonth = startingDay === 0 ? 6 : startingDay - 1;
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    let weekStart = selectedWeek ? new Date(selectedWeek) : null;
    let weekEnd = weekStart ? new Date(weekStart) : null;
    if (weekEnd) weekEnd.setDate(weekEnd.getDate() + 6);
    
    let dayCount = 1;
    let nextMonthDay = 1;
    
    for (let i = 0; i < 6; i++) {
      const week = [];
      
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < daysFromPrevMonth) {
          const prevDay = daysInPrevMonth - daysFromPrevMonth + j + 1;
          week.push({
            day: prevDay,
            month: 'prev',
            hasEvent: false,
            hasInventory: false,
            isCurrentDay: false
          });
        } else if (dayCount > daysInMonth) {
          week.push({
            day: nextMonthDay,
            month: 'next',
            hasEvent: false,
            hasInventory: false,
            isCurrentDay: false
          });
          nextMonthDay++;
        } else {
          const currentDate = new Date(year, month, dayCount);
          const dateStr = formatDateToKey(currentDate);
          const dayTransfers = allTransfers[dateStr]?.transfers || [];
          
          const hasTransfer = dayTransfers.some(t => !t.showBoxIcon);
          const hasInventory = dayTransfers.some(t => t.showBoxIcon);
          const hasManualTransfer = dayTransfers.some(t => t.isManualTransfer);
          
          week.push({
            day: dayCount,
            month: 'current',
            hasEvent: hasTransfer || hasInventory || hasManualTransfer,
            hasInventory,
            hasManualTransfer,
            isCurrentDay: dayCount === selectedDay && month === currentMonth.getMonth(),
            transferCount: dayTransfers.filter(t => !t.showBoxIcon && !t.isManualTransfer).length,
            inventoryCount: dayTransfers.filter(t => t.showBoxIcon).length,
            manualTransferCount: dayTransfers.filter(t => t.isManualTransfer).length,
            dateStr
          });
          dayCount++;
        }
      }
      
      days.push(week);
      
      if (dayCount > daysInMonth && nextMonthDay > (7 - ((dayCount - 1) % 7))) {
        break;
      }
    }
    
    return days;
  };

  const handleLegendClick = (legendType) => {
    if (legendType === null) {
      setActiveLegend([]);
      setActiveFilter('all');
    } else {
      setActiveLegend((prev) => {
        if (prev.includes(legendType)) {
          return prev.filter((type) => type !== legendType);
        } else {
          return [...prev, legendType];
        }
      });
      setActiveFilter('all');
    }
  };

  const generateWeekData = (weekStartDate) => {
    const result = {};
    const currentDate = new Date(weekStartDate);
  
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = daysOfWeek[currentDate.getDay()];
      const dateStr = formatDateToKey(currentDate);
  
      const dayData = allTransfers[dateStr] || {
        date: String(currentDate.getDate()),
        transfers: [],
      };
  
      const filteredTransfers = dayData.transfers.filter((transfer) => {
        if (activeLegend.length > 0) {
          if (activeLegend.includes('manual')) {
            if (!transfer.isManualTransfer) return false;
            const otherLegends = activeLegend.filter((l) => l !== 'manual');
            if (otherLegends.length > 0 && !otherLegends.includes(transfer.type)) {
              return false;
            }
          } else if (!activeLegend.includes(transfer.type)) {
            return false;
          }
        }
  
        if (activeFilter === 'inventory' && !transfer.isInventory) return false;
        if (activeFilter === 'transfers' && transfer.isInventory) return false;
  
        // Logique de filtrage pour les magasins source et destination
        let fromMatch = true;
        let toMatch = true;
  
        if (selectedWarehouses.from.length > 0 && filterDirection.from) {
          const hasUnknownWarehouse = selectedWarehouses.from.some(wh => wh.id === 'unknown');
          if (hasUnknownWarehouse) {
            fromMatch = !transfer.fromName || 
                       transfer.fromName === 'Inconnu' || 
                       !warehouses.some(wh => wh.nomMagasin === transfer.fromName && wh.statut === 'active');
          } else {
            fromMatch = selectedWarehouses.from.some((wh) => transfer.fromName && transfer.fromName.includes(wh.nomMagasin));
          }
        }
  
        if (selectedWarehouses.to.length > 0 && filterDirection.to) {
          const hasUnknownWarehouse = selectedWarehouses.to.some(wh => wh.id === 'unknown');
          if (hasUnknownWarehouse) {
            toMatch = !transfer.toName || 
                     transfer.toName === 'Inconnu' || 
                     !warehouses.some(wh => wh.nomMagasin === transfer.toName && wh.statut === 'active');
          } else {
            if (transfer.isInventory) {
              toMatch = selectedWarehouses.to.some((wh) => transfer.toName && transfer.toName.includes(wh.nomMagasin));
            } else {
              toMatch = selectedWarehouses.to.some((wh) => transfer.toName && transfer.toName.includes(wh.nomMagasin));
            }
          }
        }
  
        return (filterDirection.from ? fromMatch : true) && (filterDirection.to ? toMatch : true);
      });
  
      result[dayOfWeek] = {
        ...dayData,
        transfers: filteredTransfers,
        date: String(currentDate.getDate()),
        fullDate: dateStr,
      };
  
      currentDate.setDate(currentDate.getDate() + 1);
    }
  
    return result;
  };

  const handleWeekSelect = (weekStart) => {
    const newWeekStart = new Date(weekStart);
    setSelectedWeek(newWeekStart);
    setCurrentMonth(new Date(newWeekStart));
    setSelectedDay(newWeekStart.getDate());
  };

  const handleFilterAll = () => {
    setActiveFilter('all');
    setFilter('all');
  };
  
  const handleFilterInventory = () => {
    setActiveFilter('inventory');
    setFilter('inventory');
  };
  
  const handleFilterTransfers = () => {
    setActiveFilter('transfers');
    setFilter('transfers');
  };

  const getCurrentWeekStart = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const warehousesData = await fetchWarehouses();
        setWarehouses(warehousesData);
        await fetchAllTransfers(setAllTransfers, setIsLoading, setError);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    fetchData();
    const currentWeekStart = getCurrentWeekStart();
    setSelectedWeek(new Date(currentWeekStart));
    setSelectedDay(new Date().getDate());
    setCurrentMonth(new Date());
  }, []);

  useEffect(() => {
    setMiniCalendarDays(generateMiniCalendarDays(currentMonth));
  }, [currentMonth, selectedDay, allTransfers]);

  useEffect(() => {
    if (selectedWeek) {
      const newTransfersData = generateWeekData(new Date(selectedWeek));
      setTransfersData(newTransfersData);
    }
  }, [selectedWeek, filter, activeFilter, activeLegend, selectedWarehouses, filterDirection, allTransfers]);

  useEffect(() => {
    const events = findEventsForDay(selectedDay);
    setSelectedDayEvents(events);
  }, [selectedDay, transfersData]);

  const findEventsForDay = (day) => {
    const date = new Date(currentMonth);
    date.setDate(day);
    const dateStr = formatDateToKey(date);
    return allTransfers[dateStr]?.transfers || [];
  };

  const handleMonthYearChange = (newDate) => {
    const validDate = new Date(newDate);
    if (isNaN(validDate.getTime())) return;
    
    setCurrentMonth(validDate);
    
    const firstDayOfWeek = new Date(validDate);
    firstDayOfWeek.setDate(1);
    const dayOfWeek = firstDayOfWeek.getDay();
    const diff = firstDayOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(firstDayOfWeek.setDate(diff));
    
    setSelectedWeek(weekStart);
    setSelectedDay(validDate.getDate());
  };

  const formatSelectedDate = () => {
    const date = new Date(currentMonth);
    date.setDate(selectedDay);
    if (isNaN(date.getTime())) return '';
    
    const dayNames = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
    const dayName = dayNames[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${dayName} ${day} / ${month} / ${year}`;
  };

  const goToPrevMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
    const firstDayOfNewMonth = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1);
    setSelectedWeek(firstDayOfNewMonth);
  };
  
  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
    const firstDayOfNewMonth = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1);
    setSelectedWeek(firstDayOfNewMonth);
  };

  const goToPrevWeek = () => {
    if (selectedWeek) {
      const newWeek = new Date(selectedWeek);
      newWeek.setDate(newWeek.getDate() - 7);
      setSelectedWeek(newWeek);
      if (newWeek.getMonth() !== currentMonth.getMonth()) {
        setCurrentMonth(new Date(newWeek));
      }
    }
  };
  
  const goToNextWeek = () => {
    if (selectedWeek) {
      const newWeek = new Date(selectedWeek);
      newWeek.setDate(newWeek.getDate() + 7);
      setSelectedWeek(newWeek);
      if (newWeek.getMonth() !== currentMonth.getMonth()) {
        setCurrentMonth(new Date(newWeek));
      }
    }
  };

  const selectDay = (day, monthType) => {
    let targetDate = new Date(currentMonth);
    
    if (monthType === 'prev') {
      targetDate.setMonth(targetDate.getMonth() - 1);
    } else if (monthType === 'next') {
      targetDate.setMonth(targetDate.getMonth() + 1);
    }
    
    targetDate.setDate(day);
    setCurrentMonth(new Date(targetDate));
    setSelectedDay(day);
    
    const dayOfWeek = targetDate.getDay();
    const weekStart = new Date(targetDate);
    weekStart.setDate(targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    
    setSelectedWeek(weekStart);
    setSelectedTransfer(null);
  };

  const handleTransferClick = (transfer, date, e) => {
    e.stopPropagation();
    selectDay(parseInt(date));
    setSelectedTransfer(transfer);
  };

  const formatMonth = (date) => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const currentWeekStart = new Date(today.setDate(diff));
    
    setSelectedWeek(new Date(currentWeekStart));
    setSelectedDay(today.getDate());
    setCurrentMonth(new Date(today));
  };

  const handleCreateTransfer = async (newTransfer) => {
    try {
      await createTransfer(newTransfer);
      MySwal.fire({
        title: 'Succès',
        text: 'Transfert créé avec succès',
        icon: 'success'
      });
    } catch (err) {
      console.error('Erreur lors de la création du transfert:', err);
    }
  };

  const handleDeleteTransfer = async (transferId) => {
    try {
      await deleteTransfer(transferId);
      setSelectedTransfer(null);
    } catch (err) {
      console.error('Erreur lors de la suppression du transfert:', err);
    }
  };

  const handleUpdateTransfer = async (date, updatedItem) => {
    try {
      const formatDateForAPI = (dateStr) => {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      };

      const getTypeFromStatus = (status) => {
        switch (status) {
          case 'En cours': return 'blue';
          case 'Confirmé': return 'green';
          case 'En attente': return 'orange';
          case 'Annulé': return 'red';
          default: return 'blue';
        }
      };

      const formattedData = {
        ...updatedItem,
        Date: formatDateForAPI(updatedItem.date),
        type: getTypeFromStatus(updatedItem.status),
        documentNumber: updatedItem.documentNumber || updatedItem.Document_Number,
        from: updatedItem.from,
        to: updatedItem.to,
      };

      if (updatedItem.showBoxIcon) {
        await updateInventory(updatedItem._id, {
          date: formattedData.Date,
          destination: updatedItem.to,
          description: updatedItem.description,
          status: updatedItem.status,
        });
      } else if (updatedItem.isManualTransfer) {
        const manualTransferData = {
          transferDate: formatDateForAPI(updatedItem.date),
          fromLocation: updatedItem.from,
          toLocation: updatedItem.to,
          status: updatedItem.status,
          totalQuantity: updatedItem.quantity,
          items: updatedItem.items || [],
        };
        await updateManualTransfer(updatedItem._id, manualTransferData);
      } else {
        await updateTransfer(updatedItem._id, formattedData);
      }

      setTransfersData((prevData) => {
        const dateStr = formatDateToKey(new Date(formattedData.Date));
        if (!prevData[dateStr]) return prevData;

        return {
          ...prevData,
          [dateStr]: {
            ...prevData[dateStr],
            transfers: prevData[dateStr].transfers.map((t) =>
              t._id === updatedItem._id
                ? {
                    ...t,
                    ...updatedItem,
                    Date: formattedData.Date,
                    type: getTypeFromStatus(updatedItem.status),
                    documentNumber: formattedData.documentNumber,
                    from: updatedItem.from,
                    to: updatedItem.to,
                  }
                : t
            ),
          },
        };
      });

      await fetchAllTransfers(setAllTransfers, setIsLoading, setError);
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      MySwal.fire({
        title: 'Erreur',
        text: 'Erreur lors de la mise à jour du transfert',
        icon: 'error',
      });
    }
  };

  const handleDeleteItem = async (itemId, isInventory) => {
    try {
      if (isInventory) {
        await deleteInventory(itemId);
      } else {
        await deleteTransfer(itemId);
      }
      setSelectedTransfer(null);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
          <span className="loader"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div id="All_calendar" className="flex h-screen overflow-hidden">
      <div
        ref={hoverAreaRef}
        className="fixed left-0 top-0 bottom-0 w-4 z-20 hover:w-8 transition-all"
      />

      <div
        ref={sidebarRef}
        className={`flex ${isMiniCalendarVisible ? 'w-87' : 'w-0'} transition-all duration-300 overflow-hidden relative`}
      >
        <div id='rediusboxes' className="text-white overflow-y-auto flex-1">
          {isMiniCalendarVisible && (
            <>
              <div className="flex flex-col items-center justify-center pt-6">
                <div className="h-12">
                  <img 
                    src={logo} 
                    alt="IDOA TECH" 
                    className="h-full object-contain"
                  />
                </div>
              </div>
              
              <MiniCalendar
                currentMonth={currentMonth}
                miniCalendarDays={miniCalendarDays}
                selectedDay={selectedDay}
                goToPrevMonth={goToPrevMonth}
                goToNextMonth={goToNextMonth}
                selectDay={selectDay}
                formatMonth={formatMonth}
                onMonthYearChange={handleMonthYearChange}
                onWeekSelect={handleWeekSelect}
              />
              
              <TransferLegend 
                transferLegend={transferLegend}
                getDotColor={getDotColor}
                onLegendClick={handleLegendClick}
                activeLegend={activeLegend}
              />
            </>
          )}
        </div>
        
        <button 
          onClick={() => setIsMiniCalendarVisible(!isMiniCalendarVisible)}
          className="panelbg relative group"
          aria-label={isMiniCalendarVisible ? "Hide calendar" : "Show calendar"}
          title={isMiniCalendarVisible ? "Hide calendar" : "Show calendar"}
        >
          {isMiniCalendarVisible ? (
            <PanelLeft className="panel cursor-pointer" />
          ) : (
            <PanelLeftOpen className="panel cursor-pointer" />
          )}
          
          <span className="
            hidden group-hover:block 
            absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 
            bg-gray-800 text-white text-xs 
            px-3 py-2 rounded 
            whitespace-nowrap 
            mb-2
            pointer-events-none
          ">
            {isMiniCalendarVisible ? "Hide calendar" : "Show calendar"}
          </span>
        </button>
      </div>
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        isMiniCalendarVisible ? 'ml-0' : 'ml-0'
      }`}>
        <MainCalendarHeader/>
        <FilterComponent 
          goToPrevWeek={goToPrevWeek}
          goToNextWeek={goToNextWeek}
          goToCurrentWeek={goToCurrentWeek}
          onFilterAll={handleFilterAll}
          onFilterInventory={handleFilterInventory}
          onFilterTransfers={handleFilterTransfers}
          activeFilter={activeFilter}
          formatSelectedDate={formatSelectedDate}
          onWeekSelect={handleWeekSelect}
          currentMonth={currentMonth}
          selectedWarehouses={selectedWarehouses}
          onFilterWarehouse={handleFilterWarehouse}
          filterDirection={filterDirection}
          setFilterDirection={setFilterDirection}
          onCreateTransfer={handleCreateTransfer}
        />   
        
        <div className="flex-1 overflow-auto">
          <CalendarGrid
            transfersData={transfersData}
            selectedDay={selectedDay}
            selectDay={selectDay}
            handleTransferClick={handleTransferClick}
            selectedTransfer={selectedTransfer}
            getDotColor={getDotColor}
            getBorderColor={getBorderColor}
            getBgColor={getBgColor}
            fetchAllTransfers={fetchAllTransfers} // Add this prop
  formatDateToKey={formatDateToKey}
  setAllTransfers={setAllTransfers} // Add this prop
  setIsLoading={setIsLoading} // Add this prop
  setError={setError} // Add this prop
            setTransfersData={setTransfersData} // Ajout de cette prop
            updateTransfer={handleUpdateTransfer}
            onDeleteTransfer={(id, isInventory) => handleDeleteItem(id, isInventory)}
          />
        </div>
      </div>
    </div>
  );
};

export default CalendrierTransferts; 