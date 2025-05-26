import { useState, useEffect } from 'react';
import { getMagasins } from '../../les apis/magasinService';

export const useTransferOptions = () => {
  const [transferOptions, setTransferOptions] = useState({
    fromOptions: [],
    toOptions: [],
    statusOptions: ['En cours', 'Confirmé', 'En attente', 'Annulé'],
    activeWarehouses: [],
  });

  useEffect(() => {
    const fetchActiveWarehouses = async () => {
      try {
        const response = await getMagasins();
        let warehouseData = [];

        if (response && response.data) {
          if (Array.isArray(response.data.data)) {
            warehouseData = response.data.data;
          } else if (Array.isArray(response.data)) {
            warehouseData = response.data;
          }
        } else if (Array.isArray(response)) {
          warehouseData = response;
        } else if (response && response.results && Array.isArray(response.results)) {
          warehouseData = response.results;
        }

        const activeWarehouses = warehouseData.filter((warehouse) => warehouse.statut === 'active');

        const options = activeWarehouses.map((magasin) => {
          const baseName = magasin.nomMagasin.trim();
          const normalizedName = `Stradi ${baseName.replace(/^STRADI\s+|^Stradi\s+/i, '')}`;
          return {
            value: magasin._id || magasin.id,
            label: normalizedName,
            rawName: baseName,
          };
        });

        const uniqueOptions = Array.from(
          new Map(options.map((opt) => [opt.value, opt])).values()
        );

        setTransferOptions((prev) => ({
          ...prev,
          fromOptions: uniqueOptions,
          toOptions: uniqueOptions,
          activeWarehouses,
        }));
      } catch (error) {
        console.error('Erreur lors du chargement des magasins:', error);
        setTransferOptions((prev) => ({
          ...prev,
          fromOptions: [],
          toOptions: [],
          activeWarehouses: [],
        }));
      }
    };

    fetchActiveWarehouses();
  }, []);

  return transferOptions;
};