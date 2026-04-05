import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Role = 'Farmer' | 'Driver' | 'Admin' | null;
type Phase = 'onboarding' | 'signup' | 'planning' | 'growing' | 'selling' | 'logistics' | 'live';

type CropPlan = {
  name?: string;
  percent?: number;
};

type LockedPlan = {
  safe_crop?: CropPlan;
  healer_crop?: CropPlan;
  jackpot_crop?: CropPlan;
} | null;

interface AppState {
  role: Role;
  setRole: (role: Role) => void;
  
  phase: Phase;
  setPhase: (phase: Phase) => void;
  
  userId: string;
  setUserId: (id: string) => void;
  
  userName: string;
  setUserName: (name: string) => void;
  userPhone: string;
  setUserPhone: (phone: string) => void;
  driverName: string;
  setDriverName: (name: string) => void;
  driverPhone: string;
  setDriverPhone: (phone: string) => void;
  selectedMandi: {
    mandi_id: number;
    mandi_name: string;
    distance_km: number;
    travel_hours: number;
    market_price: number;
    net_profit: number;
  } | null;
  setSelectedMandi: (mandi: {
    mandi_id: number;
    mandi_name: string;
    distance_km: number;
    travel_hours: number;
    market_price: number;
    net_profit: number;
  } | null) => void;
  
  // Field Data
  fieldAllocation: { wheat: number; onion: number; dal: number };
  setFieldAllocation: (newAlloc: { wheat: number; onion: number; dal: number }) => void;
  isFieldLocked: boolean;
  lockField: () => void;
  lastLockDate: string | null;
  setLastLockDate: (iso: string) => void;
  
  // New Additions for Final Polish
  language: string;
  setLanguage: (lang: string) => void;
  district: string;
  setDistrict: (dist: string) => void;
  history: Phase[];
  goBack: () => void;
  location: [number, number] | null;
  setLocation: (loc: [number, number]) => void;
  lockedPlan: LockedPlan;
  setLockedPlan: (plan: LockedPlan) => void;
  hydrated: boolean;
  setHydrated: (val: boolean) => void;
  firstScanComplete: boolean;
  setFirstScanComplete: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      role: null,
      setRole: (role) => set({ role }),
      
      phase: 'onboarding',
      setPhase: (phase) => set((state) => ({ 
          history: [...state.history, state.phase], 
          phase 
      })),
      history: [],
      goBack: () => set((state) => {
          if (state.history.length === 0) return state;
          const prev = state.history[state.history.length - 1];
          return { phase: prev, history: state.history.slice(0, -1) };
      }),
      
      location: null,
      setLocation: (loc) => set({ location: loc }),
      lockedPlan: null,
      setLockedPlan: (plan) => set({ lockedPlan: plan }),
      
      userId: `user_${Math.random().toString(36).substr(2, 9)}`,
      setUserId: (id) => set({ userId: id }),

      userName: '',
      setUserName: (userName) => set({ userName }),
      userPhone: '',
      setUserPhone: (userPhone) => set({ userPhone }),
      driverName: '',
      setDriverName: (driverName) => set({ driverName }),
      driverPhone: '',
      setDriverPhone: (driverPhone) => set({ driverPhone }),
      selectedMandi: null,
      setSelectedMandi: (selectedMandi) => set({ selectedMandi }),
      
      district: '',
      setDistrict: (district) => set({ district }),
      language: 'hi',
      setLanguage: (language) => set({ language }),

      fieldAllocation: { wheat: 60, onion: 10, dal: 30 },
      setFieldAllocation: (alloc) => set({ fieldAllocation: alloc }),
      isFieldLocked: false,
      lastLockDate: null,
      lockField: () => set({ isFieldLocked: true, lastLockDate: new Date().toISOString() }),
      setLastLockDate: (iso: string) => set({ lastLockDate: iso }),
      
      hydrated: false,
      setHydrated: (val: boolean) => set({ hydrated: val }),

      firstScanComplete: false,
      setFirstScanComplete: (val: boolean) => set({ firstScanComplete: val })
    }),
    {
      name: 'krishi-sakhi-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
