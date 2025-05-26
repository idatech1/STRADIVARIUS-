import { Menu, X, CalendarDays, Upload, Boxes, HousePlus, UserCog, LogOut, DatabaseBackup, BarChart2, Zap, Database, RefreshCw, Folder, Barcode } from 'lucide-react';
import { useState, useEffect } from 'react';
import '../Css/SideToolsComponent.css';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import FolderUrlManager from '../Url_Manager/FolderUrlManager'; // Assurez-vous d'ajuster le chemin

const MySwal = withReactContent(Swal);

const SideToolsComponent = ({ activeComponent, setActiveComponent, onLogout, userRole }) => {
  const [user, setUser] = useState(null);
  const [menuVisible, setMenuVisible] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [automateOpen, setAutomateOpen] = useState(false);
  const [subMenuRotating, setSubMenuRotating] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showFolderManager, setShowFolderManager] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      const currentZoom = window.devicePixelRatio || 1;
      setZoomLevel(currentZoom);
    };

    window.addEventListener('resize', handleResize);
    setZoomLevel(window.devicePixelRatio || 1);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMenu = () => {
    setRotating(true);
    setTimeout(() => {
      setRotating(false);
      setMenuVisible(!menuVisible);
    }, 300);
  };

  const toggleAutomate = (e) => {
    e.stopPropagation();
    setSubMenuRotating(true);
    setTimeout(() => {
      setSubMenuRotating(false);
      setAutomateOpen(!automateOpen);
    }, 300);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      if (automateOpen) {
        setAutomateOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [automateOpen]);

  const getMenuItems = () => {
    if (!user) return [];
    
    const allMenuItems = [
      { id: 'calendar', icon: CalendarDays, tooltip: 'Calendrier Transfert', order: 1, adminOnly: false },
      { id: 'automate', icon: Zap, tooltip: 'Automate', order: 2, adminOnly: true, isAutomateButton: true },
      { id: 'upload', icon: Upload, tooltip: 'Importer Transfert', order: 3, adminOnly: false },
      { id: 'flagged', icon: DatabaseBackup, tooltip: 'Transferts intégrés', order: 4, adminOnly: false },
      { id: 'stats', icon: BarChart2, tooltip: 'Statistiques', order: 5, adminOnly: false },
      { id: 'boxes', icon: Boxes, tooltip: 'Inventaires', order: 6, adminOnly: true },
      { id: 'house', icon: HousePlus, tooltip: 'Magasin', order: 7, adminOnly: true },
      { id: 'user', icon: UserCog, tooltip: 'Utilisateurs', order: 8, adminOnly: true },
      { id: 'folder', icon: Folder, tooltip: 'Gérer le dossier', order: 9, adminOnly: true },
      // Dans SideToolsComponent.js, dans le tableau getMenuItems()
{ id: 'barcode', icon: Barcode, tooltip: 'Vérifier codes-barres', order: 4, adminOnly: false }
    ];
    
    return allMenuItems
      .filter(item => !item.adminOnly || user.role === 'Admin')
      .sort((a, b) => a.order - b.order);
  };

  const executeBatch = async () => {
    try {
      setIsLoading(true);
      MySwal.fire({
        title: 'Traitement en cours...',
        text: 'Veuillez patienter pendant l\'exécution du batch',
        allowOutsideClick: false,
        didOpen: () => {
          MySwal.showLoading();
        }
      });

      const response = await fetch('http://192.168.1.15:30000/process_ibt_files/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        let logsHtml = '<div class="mt-4 text-left">';
        for (const [key, value] of Object.entries(data.logs)) {
          logsHtml += `<p><strong>${key}:</strong> ${value}</p>`;
        }
        logsHtml += '</div>';

        MySwal.fire({
          icon: 'success',
          title: 'Succès',
          html: `${data.message}<br>${logsHtml}`,
          confirmButtonColor: '#3085d6'
        }).then(() => {
          window.location.reload();
        });
      } else {
        MySwal.fire({
          icon: 'error',
          title: 'Erreur',
          text: data.message || 'Une erreur est survenue lors du traitement du batch',
          confirmButtonColor: '#d33'
        }).then(() => {
          window.location.reload();
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution du batch:', error);
      MySwal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors de la communication avec le serveur',
        confirmButtonColor: '#d33'
      }).then(() => {
        window.location.reload();
      });
    } finally {
      setIsLoading(false);
    }
  };

  const insertIntoDatabase = async () => {
    try {
      setIsLoading(true);
      MySwal.fire({
        title: 'Insertion en cours...',
        text: 'Veuillez patienter pendant le téléchargement et l\'insertion des fichiers',
        allowOutsideClick: false,
        didOpen: () => {
          MySwal.showLoading();
        }
      });

      const response = await fetch('http://192.168.1.15:30000/download_sftp_insert_db/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.traitement_info) {
        let summaryHtml = '<div class="mt-4 text-left">';
        summaryHtml += '<h3 class="font-bold mb-2">Résultats de l\'insertion:</h3>';
        
        for (const [key, value] of Object.entries(data.traitement_info)) {
          summaryHtml += `<p><strong>${key}:</strong> ${value}</p>`;
        }
        
        summaryHtml += '<h3 class="font-bold mt-3 mb-2">Informations de téléchargement:</h3>';
        summaryHtml += `<p><strong>Fichiers téléchargés:</strong> ${data.download_info.downloaded_files_count}</p>`;
        summaryHtml += `<p><strong>Temps écoulé:</strong> ${data.download_info.elapsed_time_download.toFixed(2)} secondes</p>`;
        summaryHtml += '</div>';

        MySwal.fire({
          icon: 'success',
          title: 'Insertion terminée',
          html: summaryHtml,
          confirmButtonColor: '#3085d6'
        }).then(() => {
          window.location.reload();
        });
      } else {
        MySwal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur est survenue lors de l\'insertion des données',
          confirmButtonColor: '#d33'
        }).then(() => {
          window.location.reload();
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'insertion dans la base de données:', error);
      MySwal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors de la communication avec le serveur',
        confirmButtonColor: '#d33'
      }).then(() => {
        window.location.reload();
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuClick = (componentId) => {
    if (componentId === 'batch') {
      executeBatch();
      return;
    }
    
    if (componentId === 'insert') {
      insertIntoDatabase();
      return;
    }

    if (componentId === 'folder') {
      setShowFolderManager(true);
      return;
    }
    
    if (['calendar', 'upload', 'flagged', 'stats'].includes(componentId) || user?.role === 'Admin') {
      setActiveComponent(componentId);
      if (automateOpen) {
        setAutomateOpen(false);
      }
    } else {
      setActiveComponent('calendar');
      if (automateOpen) {
        setAutomateOpen(false);
      }
    }
  };

  const calculateButtonSize = () => {
    const baseSize = 38;
    return baseSize * (1 / zoomLevel);
  };

  const buttonSize = calculateButtonSize();
  const buttonStyle = {
    width: `${buttonSize}px`,
    height: `${buttonSize}px`,
    fontSize: `${buttonSize * 0.5}px`,
    minWidth: `${buttonSize}px`,
    minHeight: `${buttonSize}px`
  };

  const menuItems = getMenuItems();
  const ToggleIcon = menuVisible ? X : Menu;

  const renderAutomateSubMenu = (item) => {
    if (!item.isAutomateButton) return null;
    
    return (
      <div className="relative">
        <div className="relative group">
          <button
            onClick={(e) => toggleAutomate(e)}
            style={buttonStyle}
            className={`rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
              automateOpen ? 'bg-yellow-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 cursor-pointer'
            } ${subMenuRotating ? 'rotate-45' : ''}`}
          >
            <Zap style={{ width: `${buttonSize * 0.5}px`, height: `${buttonSize * 0.5}px` }} />
          </button>
          <span className="hidden group-hover:block absolute cursor-pointer z-10 right-full top-1/2 transform -translate-y-1/2 bg-blue-900 text-white text-xs px-3 py-2 rounded whitespace-nowrap mr-2 pointer-events-none">
            {item.tooltip}
          </span>
        </div>

        <div 
          className={`absolute right-full mr-2 top-0 transition-all duration-300 ease-in-out ${
            automateOpen ? 'opacity-100 translate-x-0 ' : 'opacity-0 translate-x-4 pointer-events-none '
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col space-y-3">
            <div className="relative group">
              <button
                onClick={() => handleMenuClick('insert')}
                style={buttonStyle}
                className="rounded-full shadow-lg flex items-center justify-center bg-white text-gray-600 hover:bg-green-100 cursor-pointer transition-colors duration-200"
                disabled={isLoading}
              >
                <Database style={{ width: `${buttonSize * 0.5}px`, height: `${buttonSize * 0.5}px` }} />
              </button>
              <span className="hidden group-hover:block absolute z-10 right-full top-1/2 transform -translate-y-1/2 bg-blue-900 text-white text-xs px-3 py-2 rounded whitespace-nowrap mr-2 pointer-events-none">
                Insertion dans la base
              </span>
            </div>

            <div className="relative group">
              <button
                onClick={() => handleMenuClick('batch')}
                style={buttonStyle}
                className="rounded-full shadow-lg flex items-center justify-center bg-white text-gray-600 hover:bg-purple-100 cursor-pointer transition-colors duration-200"
                disabled={isLoading}
              >
                <RefreshCw style={{ width: `${buttonSize * 0.5}px`, height: `${buttonSize * 0.5}px` }} />
              </button>
              <span className="hidden group-hover:block absolute z-10 right-full top-1/2 transform -translate-y-1/2 bg-blue-900 text-white text-xs px-3 py-2 rounded whitespace-nowrap mr-2 pointer-events-none">
                Executer le batch
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRegularButton = (item) => {
    if (item.isAutomateButton) return null;
    
    const Icon = item.icon;
    const isActive = activeComponent === item.id;

    return (
      <div className="relative group">
        <button
          onClick={() => handleMenuClick(item.id)}
          style={buttonStyle}
          className={`rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 relative ${
            isActive ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 cursor-pointer'
          }`}
        >
          <Icon style={{ width: `${buttonSize * 0.5}px`, height: `${buttonSize * 0.5}px` }} />
        </button>
        <span className="hidden group-hover:block absolute z-10 right-full top-1/2 transform -translate-y-1/2 bg-blue-900 text-white text-xs px-3 py-2 rounded whitespace-nowrap mr-2 pointer-events-none">
          {item.tooltip}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="fixed right-6 top-[30%] z-50">
        <div className="relative group">
          <button
            onClick={toggleMenu}
            style={buttonStyle}
            className={`bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 cursor-pointer
              transition-transform duration-300 ${rotating ? 'rotate-180' : ''}`}
          >
            <ToggleIcon className="text-gray-700" style={{ width: `${buttonSize * 0.5}px`, height: `${buttonSize * 0.5}px` }} />
          </button>
          <span className="hidden group-hover:block absolute z-10 right-full top-1/2 transform -translate-y-1/2 bg-blue-900 text-white text-xs px-3 py-2 rounded whitespace-nowrap mr-2 pointer-events-none">
            {menuVisible ? 'Masquer le menu' : 'Afficher le menu'}
          </span>
        </div>
      </div>

      <div 
        className={`fixed right-6 z-40 transition-all duration-300 ease-in-out ${
          menuVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
        style={{ top: '37%' }}
      >
        <div className="space-y-3">
          {menuItems.map((item) => (
            <div key={item.id}>
              {item.isAutomateButton ? renderAutomateSubMenu(item) : renderRegularButton(item)}
            </div>
          ))}

          <div className="relative group">
            <button
              onClick={onLogout}
              id="btn_logout"
              style={buttonStyle}
              className="rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 bg-white text-gray-600 hover:bg-red-100"
            >
              <LogOut style={{ width: `${buttonSize * 0.5}px`, height: `${buttonSize * 0.5}px` }} />
            </button>
            <span className="hidden group-hover:block absolute z-10 right-full top-1/2 transform -translate-y-1/2 bg-red-500 text-white text-xs px-3 py-2 rounded whitespace-nowrap mr-2 pointer-events-none">
              Déconnexion
            </span>
          </div>
        </div>
      </div>

      {showFolderManager && (
  <div className="fixed inset-0 bg-transparent backdrop-blur-sm bg-opacity-30 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Gestion du dossier</h2>
        <button 
          onClick={() => setShowFolderManager(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
      </div>
      <FolderUrlManager onClose={() => setShowFolderManager(false)} />
    </div>
  </div>
)}
    </>
  );
};

export default SideToolsComponent;