/**
 * Global Store - Zustand State Management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'CUSTOMER' | 'SHOPKEEPER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  phone: string | null;
  isVerified: boolean;
}

export interface Shop {
  id: string;
  name: string;
  description?: string;
  category: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  trustScore: number;
  reviewCount: number;
  logoUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Review {
  id: string;
  priceRating?: number;
  qualityRating?: number;
  behaviorRating?: number;
  serviceRating?: number;
  reviewText: string;
  sentimentScore: number;
  sentimentLabel: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  isComplaint: boolean;
  complaintStatus?: string;
  complaintResponse?: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
  };
  aspects?: Record<string, number>;
}

export interface Bill {
  id: string;
  billNumber: string;
  shopId: string;
  shopName?: string;
  billDate: Date;
  totalAmount: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'USED';
  rejectionReason?: string;
}

export interface TrustScoreData {
  score: number;
  weightedScore: number;
  totalReviews: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  trend: string;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // UI State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Data
  shops: Shop[];
  setShops: (shops: Shop[]) => void;
  
  currentShop: Shop | null;
  setCurrentShop: (shop: Shop | null) => void;
  
  reviews: Review[];
  setReviews: (reviews: Review[]) => void;
  
  userBills: Bill[];
  setUserBills: (bills: Bill[]) => void;

  // Alerts
  unreadAlerts: number;
  setUnreadAlerts: (count: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),

      // UI State
      activeTab: 'home',
      setActiveTab: (activeTab) => set({ activeTab }),

      // Data
      shops: [],
      setShops: (shops) => set({ shops }),

      currentShop: null,
      setCurrentShop: (currentShop) => set({ currentShop }),

      reviews: [],
      setReviews: (reviews) => set({ reviews }),

      userBills: [],
      setUserBills: (userBills) => set({ userBills }),

      // Alerts
      unreadAlerts: 0,
      setUnreadAlerts: (unreadAlerts) => set({ unreadAlerts }),
    }),
    {
      name: 'trust-scoring-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
