import { Barcode, Check, X, Edit, Save, RotateCw, Search, RefreshCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import api from './les apis/api'; // Assurez-vous que ce chemin est correct

const MySwal = withReactContent(Swal);

const BarcodeChecker = ({ transfers = [] }) => {
  const [invalidBarcodes, setInvalidBarcodes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedBarcode, setEditedBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [localTransfers, setLocalTransfers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fonction pour réinitialiser le filtre
  const resetFilter = () => {
    setSearchTerm('');
  };
  
  // Charger les transferts depuis l'API si non fournis en props
  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/api/transfers');
        if (response.data && response.data.data) {
          setLocalTransfers(response.data.data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des transferts:', error);
        MySwal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les transferts'
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Ne fetch que si transfers est vide ET localTransfers est vide
    if ((!transfers || transfers.length === 0) && localTransfers.length === 0) {
      fetchTransfers();
    } else if (transfers && transfers.length > 0 && localTransfers.length === 0) {
      setLocalTransfers(transfers);
    }
  }, []); // Retirer transfers des dépendances

  // Traiter les codes-barres invalides
  useEffect(() => {
    if (localTransfers.length === 0) return;

    const invalid = [];
    localTransfers.forEach(transfer => {
      if (!transfer.MOVEMENTS) return;
      
      transfer.MOVEMENTS.forEach(movement => {
        if (movement.flag_code_barre === 0 || !movement.code_barre) {
          invalid.push({
            id: `${transfer._id}-${movement.Model}-${movement.Quality}-${movement.Colour}-${movement.Size}`,
            transferId: transfer._id,
            documentNumber: transfer.Document_Number,
            movement,
            originalBarcode: movement.code_barre
          });
        }
      });
    });

    setInvalidBarcodes(invalid);
    setAnimationKey(prev => prev + 1);
  }, [localTransfers]);

  // Filtrer les résultats selon la recherche
  const filteredInvalidBarcodes = invalidBarcodes.filter(item =>
    item.documentNumber.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditedBarcode(item.movement.code_barre || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedBarcode('');
  };

  // Fonction pour vérifier le code-barres via l'API directement avec fetch
  const checkBarcode = async (transferId) => {
    try {
      // Extraire l'ID de l'objet (retirer "$oid" si présent)
      const cleanId = typeof transferId === 'object' && transferId.$oid 
        ? transferId.$oid 
        : transferId;
      
      const response = await fetch(`http://192.168.1.15:30000/check-barcodes/${cleanId}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la vérification du code-barres:', error);
      throw error;
    }
  };

  const saveBarcode = async (item) => {
    if (!editedBarcode) {
      MySwal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Le code-barres ne peut pas être vide',
        confirmButtonColor: '#d33'
      });
      return;
    }

    try {
      setIsLoading(true);

      // Trouver le transfert à mettre à jour
      const transferToUpdate = localTransfers.find(t => t._id === item.transferId);
      if (!transferToUpdate) {
        throw new Error('Transfert non trouvé');
      }

      // Trouver le mouvement à mettre à jour
      const movementIndex = transferToUpdate.MOVEMENTS.findIndex(m => 
        m.Model === item.movement.Model && 
        m.Quality === item.movement.Quality &&
        m.Colour === item.movement.Colour &&
        m.Size === item.movement.Size
      );

      if (movementIndex === -1) {
        throw new Error('Mouvement non trouvé');
      }

      // Créer une copie du transfert
      const updatedTransfer = JSON.parse(JSON.stringify(transferToUpdate));
      
      // Mettre à jour uniquement le code-barres
      updatedTransfer.MOVEMENTS[movementIndex].code_barre = editedBarcode;
      
      // Ne pas mettre à jour le flag_code_barre ici, cela sera fait par l'API de vérification

      // Envoyer la mise à jour à l'API
      const response = await api.put(`/api/transfers/${item.transferId}`, updatedTransfer);

      if (response.status !== 200) {
        throw new Error('Échec de la mise à jour');
      }

      // Appeler l'API de vérification du code-barres
      const checkResult = await checkBarcode(item.transferId);
      
      // Mettre à jour les données locales avec les informations de vérification
      const verifiedTransfer = JSON.parse(JSON.stringify(updatedTransfer));
      
      // Mettre à jour les flags selon la réponse de l'API
      verifiedTransfer.all_barcodes_valid = checkResult.all_barcodes_valid;
      
      // Mettre à jour les mouvements avec les informations de l'API
      if (checkResult.updated_movements && checkResult.updated_movements.length > 0) {
        checkResult.updated_movements.forEach(updatedMovement => {
          const mIndex = verifiedTransfer.MOVEMENTS.findIndex(m => 
            m.Model === updatedMovement.Model && 
            m.Quality === updatedMovement.Quality &&
            m.Colour === updatedMovement.Colour &&
            m.Size === updatedMovement.Size
          );
          
          if (mIndex !== -1) {
            verifiedTransfer.MOVEMENTS[mIndex].flag_code_barre = updatedMovement.flag_code_barre;
          }
        });
      }
      
      // Mettre à jour l'état local
      setLocalTransfers(prev => 
        prev.map(t => t._id === item.transferId ? verifiedTransfer : t)
      );

      // Mettre à jour la liste des codes-barres invalides
      // Si tous les codes-barres sont valides, supprimer l'élément de la liste
      if (verifiedTransfer.MOVEMENTS[movementIndex].flag_code_barre === 1) {
        setInvalidBarcodes(prev => 
          prev.filter(b => b.id !== item.id)
        );
        
        MySwal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Code-barres validé avec succès',
          confirmButtonColor: '#3085d6'
        });
      } else {
        // Sinon, mettre à jour l'élément dans la liste
        setInvalidBarcodes(prev => 
          prev.map(b => {
            if (b.id === item.id) {
              return {
                ...b,
                movement: {
                  ...b.movement,
                  code_barre: editedBarcode,
                  flag_code_barre: verifiedTransfer.MOVEMENTS[movementIndex].flag_code_barre
                }
              };
            }
            return b;
          })
        );
        
        MySwal.fire({
          icon: 'warning',
          title: 'Attention',
          text: 'Le code-barres a été mis à jour mais reste invalide',
          confirmButtonColor: '#f0ad4e'
        });
      }

      setEditingId(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      MySwal.fire({
        icon: 'error',
        title: 'Erreur',
        text: `Une erreur est survenue lors de la mise à jour: ${error.message}`,
        confirmButtonColor: '#d33'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && invalidBarcodes.length === 0) {
    return (
      <div className="flex justify-center items-center h-full p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Barcode className="text-blue-600 mr-3" size={28} />
          <h2 className="text-2xl font-bold text-gray-800">
            Vérification des Codes-Barres
            <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {filteredInvalidBarcodes.length} problème(s)
            </span>
          </h2>
        </div>
        
        {/* Barre de recherche avec bouton de réinitialisation */}
        <div className="flex items-center space-x-2">
          <div className="relative w-300">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            </div>
            <input
              type="text"
              placeholder="Rechercher par numéro de document..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <button
              onClick={resetFilter}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Réinitialiser le filtre"
            >
              <RefreshCcw size={18} />
            </button>
          )}
        </div>
      </div>

      {filteredInvalidBarcodes.length === 0 ? (
        <div className="text-center py-10">
          {invalidBarcodes.length === 0 ? (
            <>
              <Check className="mx-auto text-green-500 mb-4" size={48} />
              <h3 className="text-xl font-semibold text-gray-700">Tous les codes-barres sont valides!</h3>
              <p className="text-gray-500 mt-2">Aucun problème détecté dans les transferts.</p>
            </>
          ) : (
            <>
              <X className="mx-auto text-red-500 mb-4" size={48} />
              <h3 className="text-xl font-semibold text-gray-700">Aucun résultat trouvé</h3>
              <p className="text-gray-500 mt-2">Aucun document ne correspond à votre recherche.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvalidBarcodes.map((item, index) => (
            <div 
              key={`${item.transferId}-${item.movement.Model}-${item.movement.Quality}-${item.movement.Colour}-${item.movement.Size}-${index}`}
              className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${
                item.movement.flag_code_barre === 0 ? 'border-red-500' : 'border-yellow-500'
              } animate-fade-in-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-700">
                    Document #{item.documentNumber} - Modèle: {item.movement.Model}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Qualité: {item.movement.Quality} | Couleur: {item.movement.Colour} | Taille: {item.movement.Size}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {editingId !== item.id ? (
                    <button
                      onClick={() => startEditing(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 cursor-pointer rounded-full transition-colors"
                      title="Modifier"
                    >
                      <Edit size={18} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => saveBarcode(item)}
                        className="p-2 text-green-600 hover:bg-green-50 cursor-pointer rounded-full transition-colors"
                        title="Enregistrer"
                        disabled={isLoading}
                      >
                        {isLoading ? <RotateCw size={18} className="animate-spin" /> : <Save size={18} />}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-2 text-red-600 hover:bg-red-50 cursor-pointer rounded-full transition-colors"
                        title="Annuler"
                      >
                        <X size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3">
                {editingId === item.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editedBarcode}
                      onChange={(e) => setEditedBarcode(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Entrez le nouveau code-barres"
                    />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      item.movement.code_barre 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.movement.code_barre || 'Code-barres manquant'}
                    </span>
                    {item.movement.code_barre && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Longueur: {item.movement.code_barre.length} caractères)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {editingId !== item.id && !item.movement.code_barre && (
                <p className="mt-2 text-xs text-red-600">
                  Ce mouvement n'a pas de code-barres valide
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BarcodeChecker;