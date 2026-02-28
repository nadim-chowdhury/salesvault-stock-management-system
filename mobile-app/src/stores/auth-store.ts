import { create } from "zustand";
import api from "../services/api";
import * as authService from "../services/auth";
import { Endpoints } from "../constants/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "SALESPERSON";
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      const token = await authService.getAccessToken();
      const userData = await authService.getUser();

      if (token && userData) {
        const user: User = {
          id: userData.id as string,
          name: userData.name as string,
          email: userData.email as string,
          role: userData.role as User["role"],
        };
        set({
          user,
          isAuthenticated: true,
          isInitialized: true,
        });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      await authService.clearTokens();
      set({ isInitialized: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(Endpoints.LOGIN, { email, password });
      const data = response.data?.data || response.data;

      const { user, access_token, refresh_token } = data;

      await authService.storeTokens(access_token, refresh_token);
      await authService.storeUser(user);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Login failed. Please try again.";
      set({
        isLoading: false,
        error:
          typeof message === "string" ? message : message[0] || "Login failed",
      });
      throw err;
    }
  },

  logout: async () => {
    try {
      const refreshToken = await authService.getRefreshToken();
      await api
        .post(Endpoints.LOGOUT, { refresh_token: refreshToken })
        .catch(() => {});
    } catch {
      // Ignore logout API errors
    } finally {
      await authService.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
