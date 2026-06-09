import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('jwt_token'));
  const navigate = useNavigate();

  const login = (newToken) => {
    localStorage.setItem('jwt_token', newToken);
    setToken(newToken);
    navigate('/');
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    setToken(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};
