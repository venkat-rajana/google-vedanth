import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  lastActiveAt: number;
  login: (user: User) => void;
  logout: () => void;
  updateActivity: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      lastActiveAt: Date.now(),
      login: (user) => set({ user, lastActiveAt: Date.now() }),
      logout: () => set({ user: null }),
      updateActivity: () => set({ lastActiveAt: Date.now() }),
    }),
    {
      name: 'vedanth-auth',
    }
  )
);
