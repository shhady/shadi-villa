'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// Custom axios instance that ensures all requests use the current window origin
const createApi = () => {
  const instance = axios.create();
  
  // Add request interceptor to dynamically set the base URL
  instance.interceptors.request.use(config => {
    // Get the current origin if in browser environment
    if (typeof window !== 'undefined') {
      // Extract just the origin part (protocol + host + port)
      const currentOrigin = window.location.origin;
      
      // If the URL is a relative URL (starts with '/'), prepend the current origin
      if (config.url.startsWith('/')) {
        config.url = `${currentOrigin}${config.url}`;
      }
      
      console.log('Making request to:', config.url);
    }
    
    return config;
  });
  
  return instance;
};

// Create auth context
const AuthContext = createContext();

// Context provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const api = createApi();

  // Load user from local storage on initial load
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (typeof window === 'undefined') {
          setLoading(false);
          return;
        }
        
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Verify token is still valid
          try {
            const response = await api.get('/api/auth/me', {
              headers: {
                Authorization: `Bearer ${parsedUser.token}`
              }
            });
            
            if (response.data.success) {
              // Update user data with latest from server
              setUser({
                ...parsedUser,
                ...response.data.data
              });
            } else {
              // If token is invalid, logout
              logout();
            }
          } catch (error) {
            console.error('Token validation error:', error);
            logout();
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading user:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  // Register a new user
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/auth/register', userData);
      
      if (response.data.success) {
        router.push('/auth/login');
        return true;
      }
    } catch (err) {
      console.error('Registration error details:', err);
      console.error('Response data:', err.response?.data);
      setError(err.response?.data?.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Login a user
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/auth/login', credentials);
      
      if (response.data.success) {
        const userData = response.data.data;
        
        // Save user data to state and local storage
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Redirect based on role
        if (userData.role === 'admin') {
          router.push('/dashboard/admin');
        } else {
          router.push('/dashboard/agent');
        }
        
        return true;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout a user
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user;
  };

  // Check if user has a specific role
  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  const userRole = user?.role
  // Get auth token
  const getToken = () => {
    // First try to get the token from the user state
    if (user && user.token) {
      return user.token;
    }
    
    // If not in state, try to get from localStorage as fallback
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.token) {
            return parsedUser.token;
          }
        }
      } catch (error) {
        console.error('Error retrieving token from localStorage:', error);
      }
    }
    
    return null;
  };

  // Get current user ID
  const getUserId = () => {
    if (user && user._id) {
      return user._id;
    }
    
    // If not in state, try to get from localStorage as fallback
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser._id) {
            return parsedUser._id;
          }
        }
      } catch (error) {
        console.error('Error retrieving user ID from localStorage:', error);
      }
    }
    
    return null;
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated,
    hasRole,
    getToken,
    api,
    userRole,
    getUserId
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 