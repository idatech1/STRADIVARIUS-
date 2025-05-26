import React, { useState } from 'react';
import './Login.css';
import logo from '/Logo-nesk-investment@2x.png';
import Swal from 'sweetalert2';
import { Eye, EyeOff } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Récupération de l'URL de base depuis les variables d'environnement
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ;

  const showErrorAlert = (message) => {
    Swal.fire({
      title: 'Erreur',
      text: message,
      icon: 'error',
      background: 'transparent',
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        content: 'custom-swal-content',
        confirmButton: 'custom-swal-confirm-button'
      },
      showConfirmButton: true,
      confirmButtonColor: 'red',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Échec de la connexion');
      }

      // Stocker les informations utilisateur et le token dans localStorage
      localStorage.setItem('user', JSON.stringify({
        id: data._id,
        username: data.username,
        nom: data.nom,
        prenom: data.prenom,
        role: data.role
      }));
      localStorage.setItem('token', data.token);

      // Informer le composant parent que l'utilisateur est connecté
      onLogin(data);
      
    } catch (error) {
      setError(error.message || 'Une erreur est survenue lors de la connexion');
      showErrorAlert(error.message || 'Une erreur est survenue lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container" id='All_Login'>
      <div className="login-card">
        <div className="login-logo">
          <img src={logo} alt="NESK Investment Logo" />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group password-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            className="login-button" 
            disabled={isLoading}
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;