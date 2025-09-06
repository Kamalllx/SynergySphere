'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/about', '/contact', '/pricing'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Load user from token on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Redirect logic based on auth state
  useEffect(() => {
    if (!loading) {
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
      const isAuthRoute = ['/login', '/signup'].includes(pathname);
      
      if (!user && !isPublicRoute) {
        // Redirect to login if trying to access protected route
        router.push('/login');
      } else if (user && isAuthRoute) {
        // Redirect to dashboard if already logged in
        router.push('/projects');
      }
    }
  }, [user, loading, pathname, router]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Try to get current user
      const response = await api.get('/api/auth/me');
      
      if (response.success && response.data) {
        // Backend returns { success: true, data: { user: {...} } }
        const userData = response.data.user || response.data;
        setUser(userData);
      } else if (refreshToken) {
        // Try to refresh token if current one is invalid
        await refreshTokenHandler();
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      // Clear invalid tokens
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const refreshTokenHandler = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await api.post('/api/auth/refresh', { refreshToken });
      
      if (response.success && response.data) {
        const tokens = response.data.tokens || response.data;
        localStorage.setItem('authToken', tokens.accessToken || tokens.token);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        // Get user data with new token
        const userResponse = await api.get('/api/auth/me');
        if (userResponse.success && userResponse.data) {
          const userData = userResponse.data.user || userResponse.data;
          setUser(userData);
        }
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/api/auth/login', { email, password });
      
      if (response.success && response.data) {
        const { user, tokens } = response.data;
        const { accessToken, refreshToken } = tokens || {};
        
        // Store tokens
        localStorage.setItem('authToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // Set user state
        setUser(user);
        
        // Redirect to dashboard
        router.push('/projects');
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/api/auth/register', { 
        email, 
        password, 
        fullName: name  // Backend expects fullName, not name
      });
      
      if (response.success && response.data) {
        const { user, tokens } = response.data;
        const { accessToken, refreshToken } = tokens || {};
        
        // Store tokens
        localStorage.setItem('authToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // Set user state
        setUser(user);
        
        // Redirect to dashboard
        router.push('/projects');
      } else {
        setError(response.error || 'Signup failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint (optional, for server-side cleanup)
      await api.post('/api/auth/logout');
    } catch (err) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', err);
    } finally {
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      // Clear user state
      setUser(null);
      
      // Redirect to home
      router.push('/');
    }
  };

  const clearError = () => setError(null);

  // Set up token refresh interval (refresh every 45 minutes)
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        refreshTokenHandler().catch(console.error);
      }, 45 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Set up axios interceptor for automatic token refresh on 401
  useEffect(() => {
    const interceptor = api.interceptors?.response?.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && !error.config._retry) {
          error.config._retry = true;
          
          try {
            await refreshTokenHandler();
            // Retry original request with new token
            return api.request(error.config);
          } catch (refreshError) {
            // Refresh failed, logout user
            await logout();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      if (interceptor) {
        api.interceptors?.response?.eject(interceptor);
      }
    };
  }, []);

  return (
    <AuthContext.Provider 
      value={{
        user,
        loading,
        error,
        login,
        signup,
        logout,
        refreshToken: refreshTokenHandler,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protecting pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
}
