import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from './les apis/api';
import { getMagasins } from './les apis/magasinService';
import { List, Truck, ClipboardList, Clock, X } from 'lucide-react';  
import { DatabaseBackup } from 'lucide-react';
import { Calendar as CalendarIcon } from 'lucide-react';
export default function FlaggedTransfersComponent() {
  const [regularTransfers, setRegularTransfers] = useState([]);
  const [manualTransfers, setManualTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stores, setStores] = useState([]);
  const [activeTab, setActiveTab] = useState('tous');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filtres locaux
  const [fromStoreFilter, setFromStoreFilter] = useState('');
  const [toStoreFilter, setToStoreFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Couleurs inspirées du logo NESK Investment
  const colors = {
    darkTeal: '#155E63',
    mediumTeal: '#2D8C8C',
    lightTeal: '#6EB9B3',
    gray: '#A0A9A9',
    darkGray: '#4A5859',
    white: '#FFFFFF'
  };
  

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      await Promise.all([
        fetchStores(),
        fetchAllTransfers()
      ]);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors du chargement des données');
    }
  };

  const fetchStores = async () => {
    try {
      const data = await getMagasins();
      setStores(data.data);
    } catch (err) {
      console.error('Erreur lors du chargement des magasins:', err);
    }
  };

  const fetchAllTransfers = async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchRegularTransfers(),
        fetchManualTransfers()
      ]);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors du chargement des transferts');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchRegularTransfers = async () => {
    try {
      const response = await api.get('/api/transfers/flagged');
      setRegularTransfers(response.data.success ? response.data.data : []);
    } catch (err) {
      console.error('Erreur transferts standards:', err);
      setRegularTransfers([]);
    }
  };

  const fetchManualTransfers = async () => {
    try {
      const response = await api.get('/api/transfers-manuel/flagged');
      setManualTransfers(response.data.success ? response.data.data : []);
    } catch (err) {
      console.error('Erreur transferts manuels:', err);
      setManualTransfers([]);
    }
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  // Fonction pour calculer les quantités totales
  const calculateTotals = () => {
    const regularTotal = regularTransfers.reduce((sum, transfer) => {
      return sum + (transfer.quantity || transfer.totalQuantity || 0);
    }, 0);
    
    const manualTotal = manualTransfers.reduce((sum, transfer) => {
      return sum + (transfer.quantity || transfer.totalQuantity || 0);
    }, 0);
    
    return {
      regularTotal,
      manualTotal,
      allTotal: regularTotal + manualTotal,
      filteredTotal: getFilteredTransfers().reduce((sum, transfer) => {
        return sum + (transfer.quantity || transfer.totalQuantity || 0);
      }, 0)
    };
  };

  // Fonction pour vérifier si une date est dans la plage sélectionnée
  const isDateInRange = (dateString) => {
    if (!startDateFilter && !endDateFilter) return true;
    
    const date = new Date(dateString);
    const startDate = startDateFilter ? new Date(startDateFilter) : null;
    const endDate = endDateFilter ? new Date(endDateFilter) : null;
    
    if (startDate && endDate) {
      return date >= startDate && date <= endDate;
    } else if (startDate) {
      return date >= startDate;
    } else if (endDate) {
      return date <= endDate;
    }
    return true;
  };

  // Fonction pour filtrer localement les transferts
  const getFilteredTransfers = () => {
    let transfers = [];
    
    // Combiner les transferts selon l'onglet actif
    switch (activeTab) {
      case 'regular':
        transfers = [...regularTransfers.map(t => ({ ...t, transferType: 'regular' }))];
        break;
      case 'manual':
        transfers = [...manualTransfers.map(t => ({ ...t, transferType: 'manual' }))];
        break;
      default:
        transfers = [
          ...regularTransfers.map(t => ({ ...t, transferType: 'regular' })),
          ...manualTransfers.map(t => ({ ...t, transferType: 'manual' }))
        ];
    }

    // Appliquer les filtres locaux
    if (fromStoreFilter) {
      transfers = transfers.filter(transfer => {
        const fromStoreName = (transfer.from && transfer.from.nomMagasin) || 
                            (transfer.fromLocation && transfer.fromLocation.nomMagasin);
        return fromStoreName === fromStoreFilter;
      });
    }

    if (toStoreFilter) {
      transfers = transfers.filter(transfer => {
        const toStoreName = (transfer.to && transfer.to.nomMagasin) || 
                          (transfer.toLocation && transfer.toLocation.nomMagasin);
        return toStoreName === toStoreFilter;
      });
    }

    // Filtrer par date
    transfers = transfers.filter(transfer => {
      const transferDate = transfer.Date || transfer.transferDate;
      return isDateInRange(transferDate);
    });

    // Trier par date (plus récent d'abord)
    return transfers.sort((a, b) => new Date(b.Date || b.transferDate) - new Date(a.Date || a.transferDate));
  };

  const totalRegularTransfers = regularTransfers.length;
  const totalManualTransfers = manualTransfers.length;
  const totalTransfers = totalRegularTransfers + totalManualTransfers;
  const filteredTransfers = getFilteredTransfers();
  
  // Calculer les totaux des quantités
  const quantityTotals = calculateTotals();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  // Réinitialiser tous les filtres
  const resetAllFilters = () => {
    setFromStoreFilter('');
    setToStoreFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = fromStoreFilter || toStoreFilter || startDateFilter || endDateFilter;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flagged-transfers-container flex flex-col w-full bg-gray-50 p-4 md:p-6"
    >
      {/* En-tête */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="w-full p-4 mb-6 rounded-lg shadow-md relative overflow-hidden"
        style={{ background: `linear-gradient(to right, ${colors.darkTeal}, ${colors.mediumTeal})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-10"></div>
        <div className="relative z-10 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white">Transferts intégrés</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchAllTransfers}
            className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
            disabled={isRefreshing}
          >
            <DatabaseBackup size={24} className="text-white" />
          </motion.button>
        </div>
      </motion.div>

      {/* Filtres et options */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mb-6 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Filtre par magasin source */}
          <motion.div variants={itemVariants}>
            <label htmlFor="fromStoreFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Magasin source
            </label>
            <select
              id="fromStoreFilter"
              value={fromStoreFilter}
              onChange={(e) => setFromStoreFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              style={{ borderColor: colors.gray }}
            >
              <option value="">Tous les magasins</option>
              {Array.from(new Set(stores.map(store => store.nomMagasin))).map((nomMagasin, index) => (
                <option key={`from-${index}`} value={nomMagasin}>{nomMagasin}</option>
              ))}
            </select>
          </motion.div>

          {/* Filtre par magasin destination */}
          <motion.div variants={itemVariants}>
            <label htmlFor="toStoreFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Magasin destination
            </label>
            <select
              id="toStoreFilter"
              value={toStoreFilter}
              onChange={(e) => setToStoreFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              style={{ borderColor: colors.gray }}
            >
              <option value="">Tous les magasins</option>
              {Array.from(new Set(stores.map(store => store.nomMagasin))).map((nomMagasin, index) => (
                <option key={`to-${index}`} value={nomMagasin}>{nomMagasin}</option>
              ))}
            </select>
          </motion.div>

          {/* Filtre par date de début */}
<motion.div variants={itemVariants} className="flex flex-col">
  <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-1">
    Période
  </label>
  <motion.div 
    className="flex items-center gap-2"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    {/* Sélecteur de date de début */}
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="relative flex-1"
    >
      <div className="absolute inset-y-0 left-0 pl-9 flex items-center pointer-events-none">
      </div>
      <input
        type="date"
        id="startDateFilter"
        value={startDateFilter}
        onChange={(e) => setStartDateFilter(e.target.value)}
        className="block w-full pl-9 pr-3 py-2 border rounded-md shadow-sm hover:cursor-pointer  focus:outline-none focus:ring-1 focus:border-teal-500 text-sm"
        style={{ 
          borderColor: startDateFilter ? colors.mediumTeal : colors.gray,
          backgroundColor: startDateFilter ? 'rgba(45, 140, 140, 0.05)' : 'white'
        }}
      />
      {startDateFilter && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setStartDateFilter('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <X className="h-4 w-4 text-red" style={{ color: colors.mediumTeal }} />
        </motion.button>
      )}
    </motion.div>

    {/* Séparateur élégant */}
    <motion.span 
      className="text-gray-400"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ repeat: Infinity, duration: 2 }}
    >
      →
    </motion.span>

    {/* Sélecteur de date de fin */}
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="relative flex-1"
    >
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      </div>
      <input
        type="date"
        id="endDateFilter"
        value={endDateFilter}
        onChange={(e) => setEndDateFilter(e.target.value)}
        className="block w-full pl-9 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:border-teal-500 text-sm"
        style={{ 
          borderColor: endDateFilter ? colors.mediumTeal : colors.gray,
          backgroundColor: endDateFilter ? 'rgba(45, 140, 140, 0.05)' : 'white'
        }}
      />
      {endDateFilter && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setEndDateFilter('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <X className="h-4 w-4" style={{ color: colors.mediumTeal }} />
        </motion.button>
      )}
    </motion.div>
  </motion.div>

  {/* Affichage de la période sélectionnée */}
  {(startDateFilter || endDateFilter) && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      className="mt-2 text-xs text-gray-500 flex items-center gap-1"
    >
      <CalendarIcon className="h-3 w-3" />
      <span>
        {startDateFilter ? formatDate(startDateFilter) : '∞'} 
        {' → '} 
        {endDateFilter ? formatDate(endDateFilter) : '∞'}
      </span>
    </motion.div>
  )}
</motion.div>
        </div>

        {/* Boutons de contrôle des filtres */}
        <motion.div variants={itemVariants} className="flex gap-4">
          {/* Bouton pour réinitialiser tous les filtres */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={resetAllFilters}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              hasActiveFilters 
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!hasActiveFilters}
          >
            <X size={16} />
            Réinitialiser tous les filtres
          </motion.button>

          {/* Indicateur de filtres actifs */}
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
            >
              Filtres actifs
            </motion.div>
          )}
        </motion.div>

        {/* Tabs pour choisir le type de transfert */}
        <motion.div variants={itemVariants} className="flex rounded-md shadow-sm overflow-hidden">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => changeTab('tous')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'tous' 
                ? 'bg-white text-gray-800' 
                : 'text-white'
            }`}
            style={{ 
              backgroundColor: activeTab === 'tous' ? 'white' : colors.mediumTeal,
            }}
          >
            Tous ({totalTransfers})
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => changeTab('regular')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'regular' 
                ? 'bg-white text-gray-800' 
                : 'text-white'
            }`}
            style={{ 
              backgroundColor: activeTab === 'regular' ? 'white' : colors.lightTeal,
            }}
          >
            Transferts standards ({totalRegularTransfers})
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => changeTab('manual')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'manual' 
                ? 'bg-white text-gray-800' 
                : 'text-white'
            }`}
            style={{ 
              backgroundColor: activeTab === 'manual' ? 'white' : colors.darkTeal,
            }}
          >
            Transferts manuels ({totalManualTransfers})
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Cartes d'informations avec totaux des quantités */}
      <motion.div 
        variants={containerVariants}
        className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Transferts affichés */}
        <motion.div 
          variants={itemVariants}
          className="p-4 bg-white rounded-lg shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-2">
            <List size={30} className="text-gray-400" />
            <p className="text-m font-medium text-gray-500">Transferts affichés</p>
          </div>
          <div className="flex justify-between items-end">
            <motion.p 
              key={`filtered-${filteredTransfers.length}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-1 text-2xl font-semibold"
              style={{ color: colors.darkTeal }}
            >
              {filteredTransfers.length}
            </motion.p>
            <motion.div
              key={`qty-filtered-${quantityTotals.filteredTotal}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-end"
            >
              <p className="text-xs text-gray-500">Quantité totale</p>
              <p className="text-xl font-semibold" style={{ color: colors.darkTeal }}>
                {quantityTotals.filteredTotal}
              </p>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Transferts standards */}
        <motion.div 
          variants={itemVariants}
          className="p-4 bg-white rounded-lg shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-2">
            <Truck size={30} className="text-gray-400" />
            <p className="text-m font-medium text-gray-500">Transferts standards</p>
          </div>
          <div className="flex justify-between items-end">
            <motion.p 
              key={totalRegularTransfers}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-1 text-2xl font-semibold"
              style={{ color: colors.mediumTeal }}
            >
              {totalRegularTransfers}
            </motion.p>
            <motion.div
              key={`qty-regular-${quantityTotals.regularTotal}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-end"
            >
              <p className="text-xs text-gray-500">Quantité totale</p>
              <p className="text-xl font-semibold" style={{ color: colors.mediumTeal }}>
                {quantityTotals.regularTotal}
              </p>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Transferts manuels */}
        <motion.div 
          variants={itemVariants}
          className="p-4 bg-white rounded-lg shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={30} className="text-gray-400" />
            <p className="text-m font-medium text-gray-500">Transferts manuels</p>
          </div>
          <div className="flex justify-between items-end">
            <motion.p 
              key={totalManualTransfers}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-1 text-2xl font-semibold"
              style={{ color: colors.darkTeal }}
            >
              {totalManualTransfers}
            </motion.p>
            <motion.div
              key={`qty-manual-${quantityTotals.manualTotal}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-end"
            >
              <p className="text-xs text-gray-500">Quantité totale</p>
              <p className="text-xl font-semibold" style={{ color: colors.darkTeal }}>
                {quantityTotals.manualTotal}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      <br />

      {/* Contenu principal */}
      <motion.div 
        variants={containerVariants}
        className="bg-white rounded-lg shadow-md overflow-hidden"
      >
        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center items-center p-12"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="rounded-full h-12 w-12 border-t-2 border-b-2"
              style={{ borderColor: colors.mediumTeal }}
            ></motion.div>
          </motion.div>
        ) : error ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 text-center text-red-600"
          >
            <p>{error}</p>
          </motion.div>
        ) : filteredTransfers.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 text-center text-gray-500"
          >
            <p>Aucun transfert trouvé avec les critères sélectionnés.</p>
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead style={{ backgroundColor: colors.lightTeal }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Numéro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">De</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Vers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Quantité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Dernière MAJ</th>

                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence>
                  {filteredTransfers.map((transfer) => (
                    <motion.tr
                      key={`${transfer.transferType}-${transfer._id}`}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0 }}
                      whileHover={{ backgroundColor: 'rgba(110, 185, 179, 0.05)' }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <motion.span 
                          whileHover={{ scale: 1.05 }}
                          className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white"
                          style={{ 
                            backgroundColor: transfer.transferType === 'manual' ? colors.darkTeal : colors.mediumTeal
                          }}
                        >
                          {transfer.transferType === 'manual' ? 'Manuel' : 'Standard'}
                        </motion.span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.Document_Number || `TM-${transfer._id.slice(-6)}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transfer.Date || transfer.transferDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(transfer.from && transfer.from.nomMagasin) || 
                          (transfer.fromLocation && transfer.fromLocation.nomMagasin) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(transfer.to && transfer.to.nomMagasin) || 
                          (transfer.toLocation && transfer.toLocation.nomMagasin) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.quantity || transfer.totalQuantity || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <motion.span 
                          whileHover={{ scale: 1.05 }}
                          className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-white" 
                          style={{ 
                            backgroundColor: 
                              (transfer.status === 'Confirmé' || transfer.status === 'confirmed') ? colors.darkTeal :
                              (transfer.status === 'En cours' || transfer.status === 'processing') ? colors.mediumTeal :
                              (transfer.status === 'En attente' || transfer.status === 'pending') ? colors.gray :
                              (transfer.status === 'Annulé' || transfer.status === 'cancelled') ? '#DC2626' :
                              colors.lightTeal
                          }}
                        >
                          {transfer.status}
                        </motion.span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock size={16} className="mr-2 text-gray-400" />
                          <span className="text-sm text-gray-900" 
                                style={{ color: transfer.updatedAt ? colors.darkGray : colors.gray }}>
                            {transfer.updatedAt || 'N/A'}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}