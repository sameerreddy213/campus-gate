import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, UserRole } from "@/types";
import api from "@/lib/api";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  login: (data: any) => Promise<User>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => { throw new Error("AuthProvider not mounted"); },
  verifyOtp: async () => { },
  logout: () => { },
  isAuthenticated: false,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
        }
      }
      setIsLoading(false);
    };

    checkAuth();

    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem('token');
      toast.error("Session expired, please login again");
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (data: any) => {
    try {
      const res = await api.post('/auth/login', data);
      const { token, data: userData } = res.data;

      localStorage.setItem('token', token);
      setUser(userData);
      toast.success('Logged in successfully');
      return userData as User;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const verifyOtp = async (phone: string, otp: string) => {
    try {
      const res = await api.post('/auth/parent/verify-otp', { phone, otp });
      const { token, data: userData } = res.data;

      localStorage.setItem('token', token);
      setUser(userData);
      toast.success('Logged in successfully');
    } catch (error: any) {
      console.error('OTP Verify Error:', error);
      const message = error.response?.data?.message || 'Verification failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, verifyOtp, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
