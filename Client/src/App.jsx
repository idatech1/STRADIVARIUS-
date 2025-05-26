import React, { useState, useEffect } from 'react';
import CalendrierTransferts from './calendrier_transfert/Main/CalendrierTransferts';
import SideToolsComponent from './menu/SideToolsComponent';
import Loader from './Loader/Loader';
import LoaderNesk from './Loader NESK/LoaderNesk';
import Login from './Login/Login';
import "./App.css";
import Importer from './Importer/Importer';
import Inventaires from './Planification_Inventaires/Inventaires';
import Magasin from './Magasin/Magasin';
import Utilisateurs from './Utilisateurs/Utilisateurs';
import FlaggedTransfersComponent from './FlaggedTransfersComponent';
import Statistic from './Statistic/Statistic'; // Import du nouveau composant Statistic
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import BarcodeChecker from './BarcodeChecker';

const MySwal = withReactContent(Swal);

function AppRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}

function App() {
  const [activeComponent, setActiveComponent] = useState('calendar');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showLoaderAfterLogin, setShowLoaderAfterLogin] = useState(false);
  const [showInitialLoader, setShowInitialLoader] = useState(true);
  const [showLogoutLoader, setShowLogoutLoader] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [showWakeUpLoader, setShowWakeUpLoader] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Synchroniser activeComponent avec la route actuelle
  useEffect(() => {
    const pathToComponent = {
      '/': 'calendar',
      '/upload': 'upload',
      '/flagged': 'flagged',
      '/stats': 'stats', // Nouvelle route pour les statistiques
      '/inventaires': 'boxes',
      '/magasin': 'house',
      '/utilisateurs': 'user',
        '/barcode': 'barcode' // Ajoutez cette ligne

    };

    const currentComponent = pathToComponent[location.pathname] || 'calendar';
    if (currentComponent !== activeComponent) {
      setActiveComponent(currentComponent);
    }
  }, [location.pathname]);


  // Vérifier la visibilité de l'onglet
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setShowWakeUpLoader(true);
        setTimeout(() => setShowWakeUpLoader(false), 3000);
      }
      setIsTabVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Vérification de l'expiration du token
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const isExpired = payload.exp * 1000 < Date.now();

          if (isExpired) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            MySwal.fire({
              title: 'Session expirée',
              text: 'Votre session a expiré, veuillez vous reconnecter',
              icon: 'warning'
            });
          }
        } catch (error) {
          console.error('Erreur lors de la vérification du token:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const initialLoaderTimer = setTimeout(() => {
      setShowInitialLoader(false);
    }, 3000);

    return () => {
      clearTimeout(initialLoaderTimer);
    };
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setShowLoaderAfterLogin(true);
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      setShowLoaderAfterLogin(false);
      navigate('/'); // Rediriger vers la page d'accueil après connexion
    }, 5000);
  };

  const handleLogout = () => {
    setShowLogoutLoader(true);
    setTimeout(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      setShowLogoutLoader(false);
      navigate('/login'); // Rediriger vers la page de login
    }, 3000);
  };

  const hasAccess = (componentName) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    if (user.role === 'User') return ['calendar', 'upload', 'flagged', 'stats', 'barcode'].includes(componentName); // Ajout de 'stats'
    return false;
  };

  const handleNavigation = (component) => {
    setActiveComponent(component);
    const componentToPath = {
      'calendar': '/',
      'upload': '/upload',
      'flagged': '/flagged',
      'stats': '/stats', // Mapping pour la nouvelle route
          'barcode': '/barcode', // Nouvelle route

      'boxes': '/inventaires',
      'house': '/magasin',
      'user': '/utilisateurs'
    };
    navigate(componentToPath[component] || '/');
  };

  // Display logic with clear priorities
  if (showLogoutLoader) {
    return <LoaderNesk />;
  }
  
  if (!user) {
    if (showInitialLoader) {
      return <LoaderNesk />;
    }
    
    if (showWakeUpLoader) {
      return <LoaderNesk />;
    }
    
    return (
      <Routes>
        <Route path="*" element={<Login onLogin={handleLogin} />} />
      </Routes>
    );
  }
  
  if (isLoading || showLoaderAfterLogin) {
    return <Loader user={user} />;
  }
  
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={
          <>
            {hasAccess('calendar') && <CalendrierTransferts />}
            <SideToolsComponent 
              activeComponent={activeComponent} 
              setActiveComponent={handleNavigation}
              onLogout={handleLogout}
              userRole={user.role}
            />
          </>
        } />
        <Route path="/upload" element={
          <>
            {hasAccess('upload') && <Importer />}
            <SideToolsComponent 
              activeComponent={activeComponent} 
              setActiveComponent={handleNavigation}
              onLogout={handleLogout}
              userRole={user.role}
            />
          </>
        } />
        <Route path="/flagged" element={
          <>
            {hasAccess('flagged') && <FlaggedTransfersComponent />}
            <SideToolsComponent 
              activeComponent={activeComponent} 
              setActiveComponent={handleNavigation}
              onLogout={handleLogout}
              userRole={user.role}
            />
          </>
        } />
        {/* Nouvelle route pour les statistiques */}
        <Route path="/stats" element={
          <>
            {hasAccess('stats') && <Statistic />}
            <SideToolsComponent 
              activeComponent={activeComponent} 
              setActiveComponent={handleNavigation}
              onLogout={handleLogout}
              userRole={user.role}
            />
          </>
        } />
        <Route path="/inventaires" element={
          <>
            {hasAccess('boxes') && <Inventaires />}
            <SideToolsComponent 
              activeComponent={activeComponent} 
              setActiveComponent={handleNavigation}
              onLogout={handleLogout}
              userRole={user.role}
            />
          </>
        } />
        <Route path="/barcode" element={
          <>
            {hasAccess('barcode') && <BarcodeChecker  />}
            <SideToolsComponent 
              activeComponent={activeComponent} 
              setActiveComponent={handleNavigation}
              onLogout={handleLogout}
              userRole={user.role}
            />
          </>
        } />
        <Route path="/magasin" element={
          <>
            {hasAccess('house') && <Magasin />}
            <SideToolsComponent 
              activeComponent={activeComponent} 
              setActiveComponent={handleNavigation}
              onLogout={handleLogout}
              userRole={user.role}
            />
          </>
        } />
        <Route path="/utilisateurs" element={
          <>
            {hasAccess('user') && <Utilisateurs />}
            <SideToolsComponent 
              activeComponent={activeComponent} 
              setActiveComponent={handleNavigation}
              onLogout={handleLogout}
              userRole={user.role}
            />
          </>
        } />
      </Routes>
    </div>
  );
}

export default AppRouter;