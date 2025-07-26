import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { loginUser, registerUser } from '@/lib/api';
import healthtrackerapi from '../lib/healthtrackerapi';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        setUser(null);
        setToken(null);
      }
    }
    setLoading(false);
  }, [token]);
  
  const signIn = async (email, password, role) => {
    setLoading(true);
    healthtrackerapi.post('/auth/login', {
      email,
      password,
      role,
    })
    .then(response => {
      const { token, user } = response.data.result;
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      return { data: response.data.result, error: null };
    })
    .catch(error => {
      console.error("Sign in error:", error);
      return { data: null, error: error.response?.data || { message: 'An error occurred during sign in' } };
    })
    .finally(() => setLoading(false));
    // try {
    //   const data = await loginUser(email, password, role);
    //   if (data && data.accessToken) {
    //     localStorage.setItem('authToken', data.accessToken);
    //     localStorage.setItem('user', JSON.stringify(data.user));
    //     setToken(data.accessToken);
    //     setUser(data.user);
    //     return { data, error: null };
    //   }
    //   throw new Error('Login failed: No token received.');
    // } catch (error) {
    //   console.error("Sign in error:", error);
    //   return { data: null, error };
    // } finally {
    //   setLoading(false);
    // }
  };

  const signUp = async (name, email, password, role) => {
    setLoading(true);
    healthtrackerapi.post('/auth/register', {
      name,
      email,
      password,
      role,
    })
    .then(response => {
      toast({
        title: '🎉 Account Created!' ,
        description: "You can now log in with your new credentials.",
      });
      navigate('/login');
    })
    .catch(error => {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.response?.data?.message || "Something went wrong",
      });
    })
    .finally(() => setLoading(false));
    // try {
    //   const data = await registerUser(name, email, password, role);
    //   return { data, error: null };
    // } catch (error) {
    //   console.error("Sign up error:", error);
    //   return { data: null, error };
    // } finally {
    //   setLoading(false);
    // }
  };

  const signOut = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  const value = useMemo(() => ({
    user,
    token,
    loading,
    signIn,
    signOut,
    signUp,
    setUser,
    setToken,
    setLoading,
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};