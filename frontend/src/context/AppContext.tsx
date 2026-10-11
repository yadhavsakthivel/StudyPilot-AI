import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';
import { Material, MaterialSummary, QuizSummaryResponse, HealthResponse } from '../types';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  materials: MaterialSummary[];
  activeMaterialId: string | null;
  activeMaterial: Material | null;
  latestSummary: QuizSummaryResponse | null;
  health: HealthResponse | null;
  isBackendConnected: boolean;
  isLoadingMaterials: boolean;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  refreshMaterials: () => Promise<void>;
  setActiveMaterial: (id: string) => Promise<void>;
  refreshSummary: () => Promise<void>;
  checkHealth: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [materials, setMaterials] = useState<MaterialSummary[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);
  const [latestSummary, setLatestSummary] = useState<QuizSummaryResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const data = await api.checkHealth();
      setHealth(data);
      setIsBackendConnected(true);
      if (data.active_material_id) {
        setActiveMaterialId(data.active_material_id);
      }
    } catch {
      setIsBackendConnected(false);
    }
  }, []);

  const refreshMaterials = useCallback(async () => {
    setIsLoadingMaterials(true);
    try {
      const items = await api.getMaterials();
      setMaterials(items);
      const active = items.find((m) => m.is_active);
      if (active) {
        setActiveMaterialId(active.id);
        // Fetch full material for active preview if needed
        try {
          const full = await api.getMaterialById(active.id);
          setActiveMaterial(full);
        } catch {
          // ignore
        }
      } else if (items.length > 0) {
        setActiveMaterialId(items[0].id);
        try {
          const full = await api.getMaterialById(items[0].id);
          setActiveMaterial(full);
        } catch {
          // ignore
        }
      } else {
        setActiveMaterialId(null);
        setActiveMaterial(null);
      }
    } catch {
      setIsBackendConnected(false);
    } finally {
      setIsLoadingMaterials(false);
    }
  }, []);

  const setActive = useCallback(async (id: string) => {
    try {
      await api.setActiveMaterial(id);
      setActiveMaterialId(id);
      const full = await api.getMaterialById(id);
      setActiveMaterial(full);
      // Update materials list is_active property
      setMaterials((prev) =>
        prev.map((m) => ({
          ...m,
          is_active: m.id === id,
        }))
      );
      showToast(`Active material set to "${full.title}"`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to switch active material';
      showToast(msg, 'error');
    }
  }, [showToast]);

  const refreshSummary = useCallback(async () => {
    try {
      const sum = await api.getLatestSummary();
      setLatestSummary(sum);
    } catch {
      // It's normal if no quiz completed yet
      setLatestSummary(null);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkHealth();
    refreshMaterials();
    refreshSummary();
  }, [checkHealth, refreshMaterials, refreshSummary]);

  return (
    <AppContext.Provider
      value={{
        materials,
        activeMaterialId,
        activeMaterial,
        latestSummary,
        health,
        isBackendConnected,
        isLoadingMaterials,
        toasts,
        showToast,
        removeToast,
        refreshMaterials,
        setActiveMaterial: setActive,
        refreshSummary,
        checkHealth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
