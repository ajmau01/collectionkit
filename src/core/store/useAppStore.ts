import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { SyncStatus } from '../types';

// ---------------------------------------------------------------------------
// SecureStore key
// ---------------------------------------------------------------------------

const AUTH_TOKEN_KEY = 'collectionkit_auth_token';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface AppState {
  // Auth
  userId: string | null;
  authToken: string | null;

  // Sync
  syncStatus: SyncStatus;
  syncProgress: number;
  lastSyncTime: number | null;

  // Actions — Auth
  setAuth: (userId: string, authToken: string) => Promise<void>;
  clearAuth: () => Promise<void>;

  /**
   * Hydrate authToken from SecureStore after store rehydration.
   * Call this once on app startup (e.g. in a root layout useEffect).
   */
  hydrateAuthToken: () => Promise<void>;

  // Actions — Sync
  setSyncStatus: (status: SyncStatus) => void;
  setSyncProgress: (progress: number) => void;
  setLastSyncTime: (time: number) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // ---- Initial state ----
      userId: null,
      authToken: null,
      syncStatus: 'idle',
      syncProgress: 0,
      lastSyncTime: null,

      // ---- Auth actions ----

      setAuth: async (userId, authToken) => {
        // Persist token to SecureStore; never let it touch AsyncStorage.
        try {
          await SecureStore.setItemAsync(AUTH_TOKEN_KEY, authToken);
        } catch (error) {
          console.error('[AppStore] Failed to save authToken to SecureStore:', error);
          throw error;
        }
        // userId goes into AsyncStorage via persist middleware (partialize below).
        set({ userId, authToken });
      },

      clearAuth: async () => {
        try {
          await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        } catch (error) {
          console.error('[AppStore] Failed to delete authToken from SecureStore:', error);
        }
        set({ userId: null, authToken: null, syncStatus: 'idle', syncProgress: 0 });
      },

      hydrateAuthToken: async () => {
        try {
          const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
          if (token) {
            set({ authToken: token });
          }
        } catch (error) {
          console.error('[AppStore] Failed to hydrate authToken from SecureStore:', error);
        }
      },

      // ---- Sync actions ----

      setSyncStatus: (status) => set({ syncStatus: status }),
      setSyncProgress: (progress) => set({ syncProgress: progress }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
    }),
    {
      name: 'collectionkit-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // authToken intentionally excluded — stored in SecureStore only.
      partialize: (state) => ({
        userId: state.userId,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
