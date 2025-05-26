import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  fetchWarehouses, 
  getManualTransfers,
  formatDateString,
  formatDateToKey,
} from '../calendrier_transfert/Main/TransferApiService';
import { DatePicker, Select, Button, Table, Card, Row, Col, Tabs, Radio, Collapse, Tooltip } from 'antd';
import moment from 'moment';
import './StatsStyles.css';
import axios from 'axios';
import 'moment/locale/fr';

// Importations pour ECharts
import ReactECharts from 'echarts-for-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMagasins } from '../les apis/magasinService';
import { 
  BarChart2, 
  Package, 
  Calendar, 
  ShoppingBag, 
  BarChart, 
  PieChart, 
  FileText,
  FilePenLine
} from 'lucide-react';
import { FilterOutlined, TableOutlined, BarChartOutlined } from '@ant-design/icons';
import ExportTools from './ExportTools';
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Panel } = Collapse;
const setupApi = () => {
  const token = localStorage.getItem('token');
  
  return axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
};

const getApi = () => {
  const api = setupApi();
  
  api.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        console.error('Session expired or unauthorized');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      }
      return Promise.reject(error);
    }
  );
  
  return api;
};

// Couleurs pour les graphiques
const chartColors = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', 
  '#73c0de', '#3ba272', '#fc8452', '#9a60b4'
];
const colors = {
  darkTeal: '#155E63',
  mediumTeal: '#2D8C8C',
  lightTeal: '#6EB9B3',
  gray: '#A0A9A9',
  darkGray: '#4A5859',
  white: '#FFFFFF'
};
const Statistic = () => {
  const [transfers, setTransfers] = useState([]);
  const [manualTransfers, setManualTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [fromWarehouseFilter, setFromWarehouseFilter] = useState(null);
  const [toWarehouseFilter, setToWarehouseFilter] = useState(null);
  // Nouvel état pour le type de graphique actif
  const [activeChartTab, setActiveChartTab] = useState('timeline');
  const [showFilters, setShowFilters] = useState(true);
  const [showTables, setShowTables] = useState(true);
  const [showCharts, setShowCharts] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: null,
    monthRange: [],
    year: null,
    fromWarehouse: null,
    toWarehouse: null,
    transferType: 'all'
  });
  const chartRef = useRef(null);
  useEffect(() => {
    // Configurer moment.js pour utiliser le français
    moment.locale('fr');
  }, []);
  const fetchTransfers = async () => {
    try {
      const api = getApi();
      const response = await api.get('/api/transfers');
      return response.data;
    } catch (err) {
      console.error('Error fetching transfers:', err);
      throw err;
    }
  };
  const sectionVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    },
    exit: { opacity: 0, y: 20 }
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [warehousesData, transfersData, manualTransfersData] = await Promise.all([
          fetchWarehouses(),
          fetchTransfers(),
          getManualTransfers()
        ]);

        setWarehouses(warehousesData);
        setTransfers(transfersData?.data || []);
        setManualTransfers(manualTransfersData?.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
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
          { id: 'unknown', _id: 'unknown', nomMagasin: 'Magasin inconnu', statut: 'active' }
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
  const combinedTransfers = useMemo(() => {
    // Normalize dates for normal transfers
    const formattedTransfers = (transfers || []).map(t => {
      const normalizedDate = moment(t.Date).isValid() ? moment(t.Date).toDate() : new Date();
      
      return {
        ...t,
        key: `normal_${t._id}`,
        transferType: 'normal',
        date: normalizedDate,
        idStore: t.Id_Store, 
        fromName: t.from?.nomMagasin || 'Magasin inconnu',
        toName: t.to?.nomMagasin || 'Magasin inconnu',
        quantity: t.MOVEMENTS?.reduce((sum, item) => sum + (parseInt(item.Units) || 0), 0) || t.quantity || 0,
        status: t.status || 'Confirmé',
        documentNumber: t.Document_Number || `TR-${t._id.slice(-6)}`
      };
    });
  
    // Normalize dates for manual transfers
    const formattedManual = (manualTransfers || []).map(t => {
      const normalizedDate = moment(t.transferDate).isValid() ? moment(t.transferDate).toDate() : new Date();
      
      return {
        ...t,
        key: `manual_${t._id}`,
        transferType: 'manual',
        date: normalizedDate,
        idStore: t.fromStoreId || 'N/A', // Adaptation pour les transferts manuels
        fromName: t.fromLocation?.nomMagasin || 'Inconnu',
        toName: t.toLocation?.nomMagasin || 'Inconnu',
        quantity: parseInt(t.totalQuantity) || 0,
        status: t.status || 'Confirmé',
        documentNumber: `TM-${t._id.slice(-6)}`
      };
    });
  
    return [...formattedTransfers, ...formattedManual];
  }, [transfers, manualTransfers]);

  // Handle date range change with proper debugging
  const handleDateRangeChange = (dates, dateStrings) => {
    
    if (dates && dates.length === 2 && dates[0] && dates[1]) {
      setFilters(prev => ({ 
        ...prev, 
        dateRange: dates,
        dateRangeStrings: dateStrings // Stockez également les chaînes de date
      }));
    } else {
      setFilters(prev => ({ 
        ...prev, 
        dateRange: null,
        dateRangeStrings: [] 
      }));
    }
  };

  // Apply filters to data with improved date handling
  const filteredData = useMemo(() => {
    
    let data = combinedTransfers.filter(transfer => {
      // Date range filter - seulement si une plage est sélectionnée
      if (filters.dateRange && filters.dateRange.length === 2 && filters.dateRange[0] && filters.dateRange[1]) {
        // Convertissez les dates en timestamps pour une comparaison numérique simple
        const startTimestamp = filters.dateRange[0].startOf('day').valueOf();
        const endTimestamp = filters.dateRange[1].endOf('day').valueOf();
        const transferTimestamp = moment(transfer.date).valueOf();
        
        const isInRange = transferTimestamp >= startTimestamp && transferTimestamp <= endTimestamp;
        
     
        
        if (!isInRange) {
          return false;
        }
      }

      // Month range filter
      if (filters.monthRange?.length === 2) {
        const startMonth = filters.monthRange[0];
        const endMonth = filters.monthRange[1];
        const transferMonth = moment(transfer.date).month();

        if (transferMonth < startMonth || transferMonth > endMonth) {
          return false;
        }
      }

      // Year filter
      if (filters.year) {
        if (moment(transfer.date).year() !== filters.year) {
          return false;
        }
      }

      if (filters.fromWarehouse && 
        (transfer.fromName !== filters.fromWarehouse && 
         !(filters.fromWarehouse === "Magasin inconnu" && transfer.fromName === "Inconnu"))) {
      return false;
    }
    
    if (filters.toWarehouse && 
        (transfer.toName !== filters.toWarehouse && 
         !(filters.toWarehouse === "Magasin inconnu" && transfer.toName === "Inconnu"))) {
      return false;
    }
      // Transfer type filter
      if (filters.transferType !== 'all' && transfer.transferType !== filters.transferType) {
        return false;
      }

      return true;
    });

    // Additional filters for the table view
    if (fromWarehouseFilter) {
      data = data.filter(transfer => transfer.fromName === fromWarehouseFilter);
    }

    if (toWarehouseFilter) {
      data = data.filter(transfer => transfer.toName === toWarehouseFilter);
    }

    if (activeTab !== 'all') {
      data = data.filter(transfer => transfer.transferType === activeTab);
    }

    return data;
  }, [combinedTransfers, filters, activeTab, fromWarehouseFilter, toWarehouseFilter]);
// Créez un objet de correspondance pour les jours en français
const frenchDays = {
  'Monday': 'Lundi',
  'Tuesday': 'Mardi',
  'Wednesday': 'Mercredi',
  'Thursday': 'Jeudi',
  'Friday': 'Vendredi',
  'Saturday': 'Samedi',
  'Sunday': 'Dimanche'
};
  // Table columns with enhanced quantity display
  const columns = [
    {
      title: 'Type',
      dataIndex: 'transferType',
      key: 'transferType',
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {text === 'manual' ? (
            <>
              <FilePenLine size={16} />
              <span>Manuel</span>
            </>
          ) : (
            <>
              <Package size={16} />
              <span>Normal</span>
            </>
          )}
        </div>
      ),
      filters: [
        { 
          text: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={14} />
              <span>Normal</span>
            </div>
          ), 
          value: 'normal' 
        },
        { 
          text: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FilePenLine size={14} />
              <span>Manuel</span>
            </div>
          ), 
          value: 'manual' 
        },
      ],
      onFilter: (value, record) => record.transferType === value,
    },
  
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => {
        const formattedDate = formatDateString(date);
        const englishDayName = moment(date).format('dddd'); // Récupère le jour en anglais
        const frenchDayName = frenchDays[englishDayName]; // Convertit en français
        return `${formattedDate} (${frenchDayName})`;
      },
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
    },
  // Pour la colonne "De"
  {
    title: 'De',
    dataIndex: 'fromName',
    key: 'fromName',
    filters: [
      ...warehouses
        .filter(wh => wh.statut === 'active' || wh.nomMagasin === 'Magasin inconnu')
        .map(wh => ({
          text: wh.nomMagasin,
          value: wh.nomMagasin,
        })),
      { text: 'Magasin inconnu', value: 'Magasin inconnu' }
    ],
    onFilter: (value, record) => record.fromName === value,
  },
// Pour la colonne "Vers"
{
  title: 'Vers',
  dataIndex: 'toName',
  key: 'toName',
  filters: [
    ...warehouses
      .filter(wh => wh.statut === 'active' || wh.nomMagasin === 'Magasin inconnu')
      .map(wh => ({
        text: wh.nomMagasin,
        value: wh.nomMagasin,
      })),
    { text: 'Magasin inconnu', value: 'Magasin inconnu' }
  ],
  onFilter: (value, record) => record.toName === value,
},
    {
        title: 'ID Store',
        dataIndex: 'idStore',
        key: 'idStore',
      },
    {
      title: 'Quantité',
      dataIndex: 'quantity',
      key: 'quantity',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (quantity) => <span style={{ fontWeight: 'bold' }}>{quantity}</span>,
    },
    {
      title: 'N° Document',
      dataIndex: 'documentNumber',
      key: 'documentNumber',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = '';
        switch (status) {
          case 'Confirmé':
          case 'confirmed':
            color = 'green';
            break;
          case 'En cours':
          case 'processing':
            color = 'blue';
            break;
          case 'En attente':
          case 'pending':
            color = 'orange';
            break;
          case 'Annulé':
          case 'cancelled':
            color = 'red';
            break;
          default:
            color = 'gray';
        }
        return <span style={{ color }}>{status}</span>;
      },
    }
  ];

  const summaryStats = useMemo(() => {
    const total = filteredData.length;
    const totalQuantity = filteredData.reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0);
    const avgQuantity = total > 0 ? totalQuantity / total : 0;
    const manualCount = filteredData.filter(t => t.transferType === 'manual').length;
    const normalCount = total - manualCount;
    
    // Calculer le nombre de jours uniques
    const uniqueDays = new Set();
    filteredData.forEach(transfer => {
      const dateKey = moment(transfer.date).format('YYYY-MM-DD');
      uniqueDays.add(dateKey);
    });
    const daysCount = uniqueDays.size;
  
    return {
      total,
      totalQuantity,
      avgQuantity: avgQuantity.toFixed(2),
      manualCount,
      normalCount,
      daysCount // Ajouter le nombre de jours au résultat
    };
  }, [filteredData]);

  // Reset all filters
  const resetFilters = () => {
    setFromWarehouseFilter(null);
    setToWarehouseFilter(null);
    setFilters({
      dateRange: [],
      monthRange: [],
      year: null,
      fromWarehouse: null,
      toWarehouse: null,
      transferType: 'all'
    });
  };

  // Préparation des données pour les graphiques
  const getTimelineChartData = () => {
    // Grouper les transferts par date
    const dateGroups = {};
    filteredData.forEach(transfer => {
      const dateKey = moment(transfer.date).format('YYYY-MM-DD');
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = {
          total: 0,
          manual: 0,
          normal: 0,
          quantity: 0
        };
      }
      
      dateGroups[dateKey].total += 1;
      dateGroups[dateKey][transfer.transferType] += 1;
      dateGroups[dateKey].quantity += parseInt(transfer.quantity) || 0;
    });
    
    // Convertir en séries pour ECharts
    const dates = Object.keys(dateGroups).sort();
    const seriesData = {
      total: [],
      manual: [],
      normal: [],
      quantity: []
    };
    
    dates.forEach(date => {
      seriesData.total.push([date, dateGroups[date].total]);
      seriesData.manual.push([date, dateGroups[date].manual]);
      seriesData.normal.push([date, dateGroups[date].normal]);
      seriesData.quantity.push([date, dateGroups[date].quantity]);
    });
    
    return {
      dates,
      seriesData
    };
  };
  
  const getWarehouseChartData = () => {
    // Statistiques par entrepôt
    const warehouseStats = {};
    
    // Compter les transferts entrants et sortants par entrepôt
    filteredData.forEach(transfer => {
      // Gérer les transferts sortants
      if (!warehouseStats[transfer.fromName]) {
        warehouseStats[transfer.fromName] = { outgoing: 0, incoming: 0, totalQuantity: 0 };
      }
      warehouseStats[transfer.fromName].outgoing += 1;
      warehouseStats[transfer.fromName].totalQuantity += parseInt(transfer.quantity) || 0;
      
      // Gérer les transferts entrants
      if (!warehouseStats[transfer.toName]) {
        warehouseStats[transfer.toName] = { outgoing: 0, incoming: 0, totalQuantity: 0 };
      }
      warehouseStats[transfer.toName].incoming += 1;
    });
    
    const warehouseNames = Object.keys(warehouseStats);
    const outgoingData = warehouseNames.map(name => warehouseStats[name].outgoing);
    const incomingData = warehouseNames.map(name => warehouseStats[name].incoming);
    const quantityData = warehouseNames.map(name => warehouseStats[name].totalQuantity);
    
    return {
      warehouseNames,
      outgoingData,
      incomingData,
      quantityData
    };
  };
  
  const getTypeChartData = () => {
    // Données pour le graphique en secteurs (pie chart)
    const manualCount = filteredData.filter(t => t.transferType === 'manual').length;
    const normalCount = filteredData.filter(t => t.transferType === 'normal').length;
    
    // Quantités par type
    const manualQuantity = filteredData
      .filter(t => t.transferType === 'manual')
      .reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0);
      
    const normalQuantity = filteredData
      .filter(t => t.transferType === 'normal')
      .reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0);
    
    return {
      counts: [
        { value: normalCount, name: 'Transferts Normaux' },
        { value: manualCount, name: 'Transferts Manuels' }
      ],
      quantities: [
        { value: normalQuantity, name: 'Quantité Transferts Normaux' },
        { value: manualQuantity, name: 'Quantité Transferts Manuels' }
      ]
    };
  };
  
  const getStatusChartData = () => {
    // Statistiques par statut
    const statusCounts = {};
    
    filteredData.forEach(transfer => {
      const status = transfer.status || 'Inconnu';
      if (!statusCounts[status]) {
        statusCounts[status] = 0;
      }
      statusCounts[status] += 1;
    });
    
    const statuses = Object.keys(statusCounts);
    const counts = statuses.map(status => statusCounts[status]);
    
    return {
      statuses,
      counts
    };
  };
  
  const getTransferFlowData = () => {
    // Données pour le diagramme de flux (sankey)
    const flows = [];
    const nodes = new Set();
    
    filteredData.forEach(transfer => {
      const source = transfer.fromName;
      const target = transfer.toName;
      
      nodes.add(source);
      nodes.add(target);
      
      // Chercher si un flux existe déjà
      const existingFlow = flows.find(f => f.source === source && f.target === target);
      
      if (existingFlow) {
        existingFlow.value += parseInt(transfer.quantity) || 1;
      } else {
        flows.push({
          source,
          target,
          value: parseInt(transfer.quantity) || 1
        });
      }
    });
    
    const nodesList = Array.from(nodes).map(name => ({ name }));
    
    return {
      nodes: nodesList,
      links: flows
    };
  };
  
  // Options pour les différents graphiques
  const timelineChartOption = useMemo(() => {
    const { dates, seriesData } = getTimelineChartData();
    
    return {
      title: {
        text: 'Évolution des transferts dans le temps',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const date = params[0].value[0];
          let html = `<div><b>${date}</b></div>`;
          
          params.forEach(param => {
            html += `<div style="display:flex;align-items:center;">
              <span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${param.color};"></span>
              <span>${param.seriesName}: ${param.value[1]}</span>
            </div>`;
          });
          
          return html;
        }
      },
      legend: {
        data: ['Total Transferts', 'Transferts Normaux', 'Transferts Manuels', 'Quantité Totale'],
        bottom: 50
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLabel: {
          formatter: '{dd}/{MM}/{yyyy}'
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Nombre de Transferts',
          position: 'left'
        },
        {
          type: 'value',
          name: 'Quantité',
          position: 'right'
        }
      ],
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          start: 0,
          end: 100
        }
      ],
      series: [
        {
          name: 'Total Transferts',
          type: 'line',
          data: seriesData.total,
          symbolSize: 6,
          itemStyle: {
            color: chartColors[0]
          },
          yAxisIndex: 0
        },
        {
          name: 'Transferts Normaux',
          type: 'line',
          data: seriesData.normal,
          symbolSize: 6,
          itemStyle: {
            color: chartColors[1]
          },
          yAxisIndex: 0
        },
        {
          name: 'Transferts Manuels',
          type: 'line',
          data: seriesData.manual,
          symbolSize: 6,
          itemStyle: {
            color: chartColors[2]
          },
          yAxisIndex: 0
        },
        {
          name: 'Quantité Totale',
          type: 'bar',
          data: seriesData.quantity,
          itemStyle: {
            color: chartColors[3]
          },
          yAxisIndex: 1
        }
      ]
    };
  }, [filteredData]);

  const warehouseChartOption = useMemo(() => {
    const { warehouseNames, outgoingData, incomingData, quantityData } = getWarehouseChartData();
    
    return {
      title: {
        text: 'Transferts par entrepôt',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          const warehouseName = params[0].name;
          let html = `<div><b>${warehouseName}</b></div>`;
          
          params.forEach(param => {
            html += `<div style="display:flex;align-items:center;">
              <span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${param.color};"></span>
              <span>${param.seriesName}: ${param.value}</span>
            </div>`;
          });
          
          return html;
        }
      },
      legend: {
        data: ['Sortants', 'Entrants', 'Quantité Totale'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: warehouseNames,
        axisLabel: {
          interval: 0,
          rotate: 45
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Nombre de Transferts',
          position: 'left'
        },
        {
          type: 'value',
          name: 'Quantité',
          position: 'right'
        }
      ],
      series: [
        {
          name: 'Sortants',
          type: 'bar',
          stack: 'count',
          data: outgoingData,
          itemStyle: {
            color: chartColors[0]
          }
        },
        {
          name: 'Entrants',
          type: 'bar',
          stack: 'count',
          data: incomingData,
          itemStyle: {
            color: chartColors[1]
          }
        },
        {
          name: 'Quantité Totale',
          type: 'line',
          yAxisIndex: 1,
          data: quantityData,
          symbolSize: 6,
          itemStyle: {
            color: chartColors[2]
          }
        }
      ]
    };
  }, [filteredData]);

  const typeChartOption = useMemo(() => {
    const { counts, quantities } = getTypeChartData();
    
    return {
      title: {
        text: 'Répartition par type de transfert',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        bottom: 0,
        data: counts.map(item => item.name)
      },
      series: [
        {
          name: 'Nombre de transferts',
          type: 'pie',
          radius: ['40%', '55%'],
          center: ['25%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: counts
        },
        {
          name: 'Quantité totale',
          type: 'pie',
          radius: ['40%', '55%'],
          center: ['75%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: quantities
        }
      ]
    };
  }, [filteredData]);

  const statusChartOption = useMemo(() => {
    const { statuses, counts } = getStatusChartData();
    
    return {
      title: {
        text: 'Transferts par statut',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        bottom: 0,
        data: statuses
      },
      series: [
        {
          name: 'Statut',
          type: 'pie',
          radius: '55%',
          center: ['50%', '50%'],
          data: statuses.map((status, index) => ({
            value: counts[index],
            name: status,
            itemStyle: {
              color: status === 'Confirmé' || status === 'confirmed' 
                ? '#91cc75' 
                : status === 'En cours' || status === 'processing'
                  ? '#5470c6'
                  : status === 'En attente' || status === 'pending'
                    ? '#fac858'
                    : status === 'Annulé' || status === 'cancelled'
                      ? '#ee6666'
                      : chartColors[index % chartColors.length]
            }
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  }, [filteredData]);

  const flowChartOption = useMemo(() => {
    const { nodes, links } = getTransferFlowData();
    
    return {
      title: {
        text: 'Flux de transferts entre entrepôts',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b0}: {c0}'
      },
      series: [
        {
          type: 'sankey',
          emphasis: {
            focus: 'adjacency'
          },
          nodeAlign: 'left',
          data: nodes,
          links: links,
          lineStyle: {
            color: 'gradient',
            curveness: 0.5
          }
        }
      ]
    };
  }, [filteredData]);

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-xl">Erreur: {error}</div>
      </div>
    );
  }

  return (
    <div className="transfer-stats-container">
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="w-full p-4 mb-6 rounded-lg shadow-md relative overflow-hidden"
        style={{ background: `linear-gradient(to right, ${colors.darkTeal}, ${colors.mediumTeal})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-10"></div>
        <div className="relative z-10 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white">Statistiques</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
          >
          <BarChart2 />
          </motion.button>
        </div>
      </motion.div>

{/* Boutons de contrôle pour afficher/masquer les sections */}
<div className="section-controls" style={{ marginBottom: 20, display: 'flex', gap: '12px' }}>
  <Tooltip title={showFilters ? "Masquer les filtres" : "Afficher les filtres"}>
    <Button 
      onClick={() => setShowFilters(!showFilters)}
      icon={<FilterOutlined style={{ fontSize: '18px' }} />}
      shape="circle"
      style={{ 
        width: '40px',
        height: '40px',
        backgroundColor: showFilters ? '#155E63' : undefined,
        color: showFilters ? '#fff' : undefined,
        borderColor: showFilters ? '#155E63' : undefined,
      }}
    />
  </Tooltip>

  <Tooltip title={showTables ? "Masquer les tableaux" : "Afficher les tableaux"}>
    <Button 
      onClick={() => setShowTables(!showTables)}
      icon={<TableOutlined style={{ fontSize: '18px' }} />}
      shape="circle"
      style={{ 
        width: '40px',
        height: '40px',
        backgroundColor: showTables ? '#155E63' : undefined,
        color: showTables ? '#fff' : undefined,
        borderColor: showTables ? '#155E63' : undefined,
      }}
    />
  </Tooltip>

  <Tooltip title={showCharts ? "Masquer les graphiques" : "Afficher les graphiques"}>
    <Button 
      onClick={() => setShowCharts(!showCharts)}
      icon={<BarChartOutlined style={{ fontSize: '18px' }} />}
      shape="circle"
      style={{ 
        width: '40px',
        height: '40px',
        backgroundColor: showCharts ? '#155E63' : undefined,
        color: showCharts ? '#fff' : undefined,
        borderColor: showCharts ? '#155E63' : undefined,
      }}
    />
  </Tooltip>
</div>

      {/* Section Filtres avec animation */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sectionVariants}
          >
            <Card title="Filtres" className="filters-card">
              <Row gutter={16}>
                <Col span={6}>
                  <div className="filter-item">
                    <label>Période (dates):</label>
                    <RangePicker 
                      onChange={handleDateRangeChange}
                      style={{ width: '100%' }}
                      format="DD/MM/YYYY"
                      value={filters.dateRange}
                    />
                  </div>
                </Col>

                
<Col span={6}>
  <div className="filter-item">
    <label>Magasin source:</label>
    <Select
      placeholder="Tous"
      onChange={(value) => setFromWarehouseFilter(value)}
      style={{ width: '100%' }}
      allowClear
      value={fromWarehouseFilter}
    >
      {warehouses
        .filter(wh => wh.statut === 'active' || wh.nomMagasin === 'Magasin inconnu')
        .map(wh => (
          <Option key={wh._id} value={wh.nomMagasin}>{wh.nomMagasin}</Option>
        ))
      }
      <Option key="unknown-from" value="Magasin inconnu">Magasin inconnu</Option>
    </Select>
  </div>
</Col>

<Col span={6}>
  <div className="filter-item">
    <label>Magasin destination:</label>
    <Select
      placeholder="Tous"
      onChange={(value) => setToWarehouseFilter(value)}
      style={{ width: '100%' }}
      allowClear
      value={toWarehouseFilter}
    >
      {warehouses
        .filter(wh => wh.statut === 'active' || wh.nomMagasin === 'Magasin inconnu')
        .map(wh => (
          <Option key={wh._id} value={wh.nomMagasin}>{wh.nomMagasin}</Option>
        ))
      }
      <Option key="unknown-to" value="Magasin inconnu">Magasin inconnu</Option>
    </Select>
  </div>
</Col>

                <Col span={6}>
                  <Button 
                    type="default" 
                    onClick={resetFilters}
                    style={{ marginTop: 24 }}
                  >
                    Réinitialiser
                  </Button>
                </Col>
              </Row>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards avec animation */}
      <AnimatePresence>
  {showFilters && (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={sectionVariants}
    >
      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col span={4}>
          <Tooltip title="Total des Transferts" placement="top">
            <Card className="stat-card">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={24} color={colors.darkTeal} />
                <p className="stat-value" style={{ marginTop: '10px', marginBottom: 0 }}>{summaryStats.total}</p>
              </div>
            </Card>
          </Tooltip>
        </Col>
        <Col span={4}>
          <Tooltip title="Nombre de Jours" placement="top">
            <Card className="stat-card">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={24} color={colors.darkTeal} />
                <p className="stat-value" style={{ marginTop: '10px', marginBottom: 0 }}>{summaryStats.daysCount}</p>
              </div>
            </Card>
          </Tooltip>
        </Col>
        <Col span={4}>
          <Tooltip title="Quantité Totale" placement="top">
            <Card className="stat-card">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={24} color={colors.darkTeal} />
                <p className="stat-value" style={{ marginTop: '10px', marginBottom: 0 }}>{summaryStats.totalQuantity}</p>
              </div>
            </Card>
          </Tooltip>
        </Col>
        <Col span={4}>
          <Tooltip title="Moyenne Quantité par Transfert" placement="top">
            <Card className="stat-card">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart size={24} color={colors.darkTeal} />
                <p className="stat-value" style={{ marginTop: '10px', marginBottom: 0 }}>{summaryStats.avgQuantity}</p>
              </div>
            </Card>
          </Tooltip>
        </Col>
        <Col span={8}>
          <Tooltip title="Répartition des Transferts" placement="top">
            <Card className="stat-card">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Package size={20} color={colors.darkTeal} />
                    <p style={{ margin: '5px 0 0 0' }}><strong>{summaryStats.normalCount}</strong></p>
                    <small>Normaux</small>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <FileText size={20} color={colors.mediumTeal} />
                    <p style={{ margin: '5px 0 0 0' }}><strong>{summaryStats.manualCount}</strong></p>
                    <small>Manuels</small>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Calendar size={20} color={colors.lightTeal} />
                    <p style={{ margin: '5px 0 0 0' }}><strong>{summaryStats.daysCount}</strong></p>
                    <small>Jours</small>
                  </div>
                </div>
              </div>
            </Card>
          </Tooltip>
        </Col>
      </Row>
    </motion.div>
  )}
</AnimatePresence>

      <AnimatePresence>
        {(
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card style={{ marginTop: 20 }}>
              <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="Tous les transferts" key="all">
                  
                </TabPane>
                <TabPane tab="Transferts normaux" key="normal">
                 
                </TabPane>
                <TabPane tab="Transferts manuels" key="manual">
                 
                </TabPane>
              </Tabs>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>      <AnimatePresence>
        {showTables && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sectionVariants}
          >
            <Card   style={{ marginTop: 20 }}
    >
      
      <ExportTools 
        data={filteredData} 
        columns={columns}
        filename={`transferts-${moment().format('YYYY-MM-DD')}`}
        title="Statistiques des transferts Stradivarius"
        startDate={filters.dateRangeStrings && filters.dateRangeStrings[0] ? moment(filters.dateRangeStrings[0]).format('DD/MM/YYYY') : null}
  endDate={filters.dateRangeStrings && filters.dateRangeStrings[1] ? moment(filters.dateRangeStrings[1]).format('DD/MM/YYYY') : null}
      />
    
              <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="" key="all">
                  <Table
                    columns={columns}
                    dataSource={filteredData}
                    loading={loading}
                    scroll={{ x: true }}
                    rowKey="key"
                  />
                </TabPane>
                <TabPane tab="" key="normal">
                  <Table
                    columns={columns}
                    dataSource={filteredData.filter(t => t.transferType === 'normal')}
                    loading={loading}
                    scroll={{ x: true }}
                    rowKey="key"
                  />
                </TabPane>
                <TabPane tab="" key="manual">
                  <Table
                    columns={columns}
                    dataSource={filteredData.filter(t => t.transferType === 'manual')}
                    loading={loading}
                    scroll={{ x: true }}
                    rowKey="key"
                  />
                </TabPane>
              </Tabs>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Section Graphiques avec animation */}
      <AnimatePresence>
        {showCharts && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sectionVariants}
          >
             <Card 
    title="Visualisation des données" 
    style={{ marginTop: 20 }}
    extra={
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Radio.Group 
          value={activeChartTab} 
          onChange={e => setActiveChartTab(e.target.value)}
        >
          <Radio.Button value="timeline">Chronologie</Radio.Button>
          <Radio.Button value="warehouse">Entrepôts</Radio.Button>
          <Radio.Button value="type">Types</Radio.Button>
          <Radio.Button value="status">Statuts</Radio.Button>
          <Radio.Button value="flow">Flux</Radio.Button>
        </Radio.Group>
        <ExportTools 
          data={filteredData}
          columns={columns}
          chartRef={chartRef}
          filename={`graphique-${activeChartTab}-${moment().format('YYYY-MM-DD')}`}
          title={`Visualisation: ${activeChartTab}`}
          startDate={filters.dateRangeStrings && filters.dateRangeStrings[0] ? moment(filters.dateRangeStrings[0]).format('DD/MM/YYYY') : null}
  endDate={filters.dateRangeStrings && filters.dateRangeStrings[1] ? moment(filters.dateRangeStrings[1]).format('DD/MM/YYYY') : null}
        />
      </div>
    }
  >
              <div style={{ height: '500px', marginBottom: '20px' }}>
              {activeChartTab === 'timeline' && (
    <ReactECharts 
      ref={chartRef}
      option={timelineChartOption} 
      style={{ height: '100%', width: '100%' }}
      notMerge={true}
      lazyUpdate={true}
    />
  )}
                
                {activeChartTab === 'warehouse' && (
                  <ReactECharts 
                    option={warehouseChartOption} 
                    style={{ height: '100%', width: '100%' }}
                    notMerge={true}
                    ref={chartRef}
                    lazyUpdate={true}
                  />
                )}
                
                {activeChartTab === 'type' && (
                  <ReactECharts 
                    option={typeChartOption} 
                    style={{ height: '100%', width: '100%' }}
                    notMerge={true}
                    ref={chartRef}
                    lazyUpdate={true}
                  />
                )}
                
                {activeChartTab === 'status' && (
                  <ReactECharts 
                    option={statusChartOption} 
                    style={{ height: '100%', width: '100%' }}
                    notMerge={true}
                    ref={chartRef}
                    lazyUpdate={true}
                  />
                )}
                
                {activeChartTab === 'flow' && (
                  <ReactECharts 
                    option={flowChartOption} 
                    style={{ height: '100%', width: '100%' }}
                    notMerge={true}
                    ref={chartRef}
                    lazyUpdate={true}
                  />
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Statistic;