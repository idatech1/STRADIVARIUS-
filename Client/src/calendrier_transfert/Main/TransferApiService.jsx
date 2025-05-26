import axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

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
        
        MySwal.fire({
          title: 'Session expirée',
          text: 'Votre session a expiré, veuillez vous reconnecter',
          icon: 'warning'
        });
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        window.location.reload();
      }
      return Promise.reject(error);
    }
  );
  
  return api;
};

export const fetchWarehouses = async () => {
  try {
    const api = getApi();
    const response = await api.get('/api/magasins');
    return response.data.data || response.data;
  } catch (err) {
    console.error('Erreur lors du chargement des magasins:', err);
    MySwal.fire({
      title: 'Erreur',
      text: 'Impossible de charger la liste des magasins',
      icon: 'error'
    });
    throw err;
  }
};

const fetchAllInventories = async () => {
  try {
    const api = getApi();
    const response = await api.get('/api/inventories');
    return response.data;
  } catch (err) {
    console.error('Erreur lors du chargement des inventaires:', err);
    if (!err.response || err.response.status !== 401) {
      MySwal.fire({
        title: 'Erreur',
        text: 'Impossible de charger les inventaires',
        icon: 'error'
      });
    }
    return { success: false, data: {} };
  }
};

export const getManualTransfers = async () => {
  try {
    const api = getApi();
    const response = await api.get('/api/transfers-manuel');
    return response.data;
  } catch (error) {
    console.error('Error fetching manual transfers:', error);
    throw error;
  }
};

export const fetchAllTransfers = async (setAllTransfers, setIsLoading, setError) => {
  try {
    setIsLoading(true);
    const api = getApi();
    
    const [transfersResponse, inventoriesResponse, manualTransfersResponse] = await Promise.all([
      api.get('/api/transfers'),
      fetchAllInventories(),
      getManualTransfers()
    ]);
    
    const mergedData = mergeTransfersAndInventories(
      transfersResponse.data, 
      inventoriesResponse,
      manualTransfersResponse
    );
    
    setAllTransfers(mergedData);
    setIsLoading(false);
  } catch (err) {
    setError(err.message);
    setIsLoading(false);
    if (!err.response || err.response.status !== 401) {
      MySwal.fire({
        title: 'Erreur',
        text: 'Impossible de charger les données',
        icon: 'error'
      });
    }
  }
};

export const createTransfer = async (transferData) => {
  try {
    const api = getApi();
    const magasinsResponse = await api.get('/api/magasins');
    const magasins = magasinsResponse.data.data || magasinsResponse.data;

    const fromMagasin = magasins.find((m) => m._id === transferData.from || m.id === transferData.from);
    const toMagasin = magasins.find((m) => m._id === transferData.to || m.id === transferData.to);

    if (!fromMagasin || !toMagasin) {
      throw new Error('Magasin source ou destination introuvable');
    }

    const response = await api.post('/api/transfers', {
      ...transferData,
      from: fromMagasin._id || fromMagasin.id,
      to: toMagasin._id || toMagasin.id,
      Date: transferData.Date || new Date().toISOString().split('T')[0],
      documentNumber: transferData.Document_Number || transferData.documentNumber,
    });
    return response.data;
  } catch (err) {
    if (!err.response || err.response.status !== 401) {
      MySwal.fire({
        title: 'Erreur',
        text: err.response?.data?.message || 'Erreur lors de la création du transfert',
        icon: 'error',
      });
    }
    throw err;
  }
};

export const updateTransfer = async (id, transferData) => {
  try {
    const api = getApi();
    const response = await api.put(`/api/transfers/${id}`, {
      ...transferData,
      Date: transferData.date,
      documentNumber: transferData.Document_Number || transferData.documentNumber,
    });
    return response.data;
  } catch (err) {
    MySwal.fire({
      title: 'Erreur',
      text: err.response?.data?.message || 'Erreur lors de la mise à jour du transfert',
      icon: 'error',
    });
    throw err;
  }
};

export const deleteTransfer = async (id) => {
  try {
    const api = getApi();
    await api.delete(`/api/transfers/${id}`);
    MySwal.fire({
      title: 'Succès',
      text: 'Transfert supprimé avec succès',
      icon: 'success'
    });
  } catch (err) {
    MySwal.fire({
      title: 'Erreur',
      text: err.response?.data?.message || 'Erreur lors de la suppression du transfert',
      icon: 'error'
    });
    throw err;
  }
};

export const updateInventory = async (id, inventoryData) => {
  try {
    const api = getApi();
    
    const warehousesResponse = await api.get('/api/magasins');
    const warehouses = warehousesResponse.data.data || warehousesResponse.data;
    
    const destinationWarehouse = warehouses.find(wh => {
      const normalizedInput = inventoryData.destination.toLowerCase().replace(/^stradi\s*/i, '').trim();
      const normalizedWarehouse = wh.nomMagasin.toLowerCase().replace(/^stradi\s*/i, '').trim();
      
      return normalizedWarehouse === normalizedInput ||
            wh.nomMagasin.toLowerCase() === inventoryData.destination.toLowerCase() ||
            wh._id === inventoryData.destination ||
            wh.id === inventoryData.destination;
    });

    if (!destinationWarehouse) {
      console.error('Destination warehouse not found. Input:', inventoryData.destination);
      console.error('Available warehouses:', warehouses.map(w => w.nomMagasin));
      throw new Error(`Magasin destination "${inventoryData.destination}" introuvable`);
    }

    const dataToSend = {
      date: inventoryData.date,
      destination: destinationWarehouse._id || destinationWarehouse.id,
      status: inventoryData.status,
      comment: inventoryData.description
    };

    const response = await api.put(`/api/inventories/${id}`, dataToSend);
    return response.data;
  } catch (err) {
    console.error('Error updating inventory:', err);
    MySwal.fire({
      title: 'Erreur',
      text: err.response?.data?.message || err.message || 'Erreur lors de la mise à jour de l\'inventaire',
      icon: 'error'
    });
    throw err;
  }
};

export const deleteInventory = async (id) => {
  try {
    const api = getApi();
    await api.delete(`/api/inventories/${id}`);
    MySwal.fire({
      title: 'Succès',
      text: 'Inventaire supprimé avec succès',
      icon: 'success'
    });
  } catch (err) {
    if (!err.response || err.response.status !== 401) {
      MySwal.fire({
        title: 'Erreur',
        text: err.response?.data?.message || 'Erreur lors de la suppression de l\'inventaire',
        icon: 'error'
      });
    }
    throw err;
  }
};

export const updateManualTransfer = async (id, transferData) => {
  try {
    console.log("Données avant envoi API:", transferData);
    
    if (!transferData.fromLocation || !transferData.toLocation) {
      console.error("IDs de magasins manquants:", {
        fromLocation: transferData.fromLocation,
        toLocation: transferData.toLocation
      });
      throw new Error("Les IDs des magasins source et destination sont requis");
    }
    
    const api = getApi();
    const dataToSend = {
      transferDate: transferData.transferDate,
      fromLocation: transferData.fromLocation,
      toLocation: transferData.toLocation,
      status: transferData.status,
      totalQuantity: transferData.totalQuantity,
      items: transferData.items || []
    };
    
    console.log("Données envoyées à l'API:", dataToSend);
    
    const response = await api.put(`/api/transfers-manuel/${id}`, dataToSend);
    
    console.log("Réponse API:", response.data);
    return response.data;
  } catch (err) {
    console.error("Erreur complète:", err);
    MySwal.fire({
      title: 'Erreur',
      text: err.response?.data?.message || err.message || 'Erreur lors de la mise à jour du transfert manuel',
      icon: 'error',
    });
    throw err;
  }
};

export const mergeTransfersAndInventories = (transfersResponse, inventoriesResponse, manualTransfersResponse) => {
  const mergedData = {};



  if (transfersResponse?.data) {
    transfersResponse.data.forEach((transfer) => {
      const dateKey = formatDateToKey(transfer.Date);
      if (!mergedData[dateKey]) {
        mergedData[dateKey] = {
          date: new Date(transfer.Date).getDate().toString(),
          transfers: [],
        };
      }

      mergedData[dateKey].transfers.push({
        ...transfer,
        isInventory: false,
        isManualTransfer: false,
        documentNumber: transfer.Document_Number,
        date: formatDateString(transfer.Date),
        Date: transfer.Date,
        from: transfer.from?._id || transfer.from,
        to: transfer.to?._id || transfer.to,
        fromName: transfer.from?.nomMagasin || 'Magasin inconnu',
        toName: transfer.to?.nomMagasin || 'Magasin inconnu',
      });
    });
  }

  if (inventoriesResponse?.data) {
    if (Array.isArray(inventoriesResponse.data)) {
      inventoriesResponse.data.forEach((inventory) => {
        const dateKey = formatDateToKey(inventory.date);
        if (!mergedData[dateKey]) {
          mergedData[dateKey] = {
            date: new Date(inventory.date).getDate().toString(),
            transfers: [],
          };
        }

        mergedData[dateKey].transfers.push(createInventoryObject(inventory));
      });
    } else {
      Object.entries(inventoriesResponse.data).forEach(([dateKey, inventories]) => {
        const inventoryList = Array.isArray(inventories) ? inventories : [inventories];

        if (!mergedData[dateKey]) {
          mergedData[dateKey] = {
            date: new Date(dateKey).getDate().toString(),
            transfers: [],
          };
        }

        inventoryList.forEach((inventory) => {
          mergedData[dateKey].transfers.push(createInventoryObject(inventory));
        });
      });
    }
  }

  if (manualTransfersResponse?.data) {
    manualTransfersResponse.data.forEach((manualTransfer) => {
      const dateKey = formatDateToKey(manualTransfer.transferDate);
      if (!mergedData[dateKey]) {
        mergedData[dateKey] = {
          date: new Date(manualTransfer.transferDate).getDate().toString(),
          transfers: [],
        };
      }

      mergedData[dateKey].transfers.push({
        _id: manualTransfer._id,
        from: manualTransfer.fromLocation?._id,
        to: manualTransfer.toLocation?._id,
        fromName: manualTransfer.fromLocation?.nomMagasin || 'Magasin inconnu',
        toName: manualTransfer.toLocation?.nomMagasin || 'Magasin inconnu',
        fromLocationId: manualTransfer.fromLocation?._id,
        toLocationId: manualTransfer.toLocation?._id,
        status: manualTransfer.status,
        type: getManualTransferTypeColor(manualTransfer.status),
        isInventory: false,
        isManualTransfer: true,
        showBoxIcon: false,
        quantity: manualTransfer.totalQuantity,
        Document_Number: `MAN-${manualTransfer._id.toString().slice(-6)}`,
        date: formatDateString(manualTransfer.transferDate),
        Date: manualTransfer.transferDate,
        items: manualTransfer.items,
        createdBy: manualTransfer.createdBy?.name || 'Utilisateur inconnu',
      });
    });
  }

  return mergedData;
};

export const formatDateToKey = (date) => {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

export const formatDateString = (dateString) => {
  const date = new Date(dateString);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

export const formatDateTimeString = (dateString) => {
  const date = new Date(dateString);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const getManualTransferTypeColor = (status) => {
  switch (status) {
    case 'En attente': return 'orange';
    case 'En cours': return 'blue';
    case 'Confirmé': return 'green';
    case 'Annulé': return 'red';
    default: return 'blue';
  }
};

export const createInventoryObject = (inventory) => ({
  _id: inventory._id,
  from: '',
  to: inventory.destination?._id || inventory.destination?.id,
  toName: inventory.destination?.nomMagasin || 'Magasin inconnu',
  destinationId: inventory.destination?._id || inventory.destination?.id,
  status: inventory.status,
  type: getInventoryTypeColor(inventory.status),
  isInventory: true,
  showBoxIcon: true,
  description: inventory.comment || 'Inventaire planifié',
  documentNumber: inventory.documentNumber || '',
  date: formatDateString(inventory.date),
  createdAt: formatDateTimeString(inventory.createdAt),
  updatedAt: inventory.updatedAt ? formatDateTimeString(inventory.updatedAt) : undefined,
});

export const getInventoryTypeColor = (status) => {
  switch (status) {
    case 'Planifié': return 'yellow';
    case 'En cours': return 'blue';
    case 'Terminé': return 'green';
    case 'Annulé': return 'red';
    default: return 'yellow';
  }
};


