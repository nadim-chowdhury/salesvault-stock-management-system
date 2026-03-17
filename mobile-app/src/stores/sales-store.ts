import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export interface SaleItem {
  product_id: string;
  name?: string;
  sku?: string;
  quantity: number;
  price?: number;
}

export interface SalePayload {
  idempotency_key: string;
  warehouse_id?: string;
  store_id?: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  items: SaleItem[];
}

interface QueuedSale extends SalePayload {
  queued_at: string;
}

interface SalesState {
  offlineQueue: QueuedSale[];
  isSyncing: boolean;
  addToCart: (item: SaleItem) => void;
  queueSale: (payload: SalePayload) => void;
  syncOfflineSales: () => Promise<void>;
  clearQueue: () => void;
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set, get) => ({
      offlineQueue: [],
      isSyncing: false,

      addToCart: (item) => {
        // Implementation for cart management would go here.
        // For MVP, we pass the payload directly to queueSale
      },

      queueSale: (payload) => {
        const newSale: QueuedSale = {
          ...payload,
          queued_at: new Date().toISOString(),
        };
        set((state) => ({
          offlineQueue: [...state.offlineQueue, newSale], // Optimistic UI: queued locally
        }));
        
        // Attempt immediate sync
        get().syncOfflineSales();
      },

      syncOfflineSales: async () => {
        const { offlineQueue, isSyncing } = get();
        
        if (isSyncing || offlineQueue.length === 0) return;

        set({ isSyncing: true });

        const remainingQueue: QueuedSale[] = [];

        for (const sale of offlineQueue) {
          try {
            await api.post('/sales', sale);
            // If successful, we don't push it to remainingQueue (it gets removed)
          } catch (error: any) {
            console.warn(`Failed to sync sale: ${sale.idempotency_key}`, error);
            // If network error, keep in queue (Status 0 or no response)
            if (!error.response || error.response.status >= 500) {
              remainingQueue.push(sale);
            } 
            // If 4xx (e.g. duplicate idempotency key or bad request), we might want to discard it or log it
            // For MVP, we assume non-5xx errors mean it was either processed already or invalid, so we discard
          }
        }

        set({ offlineQueue: remainingQueue, isSyncing: false });
      },

      clearQueue: () => set({ offlineQueue: [] }),
    }),
    {
      name: 'sales-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
