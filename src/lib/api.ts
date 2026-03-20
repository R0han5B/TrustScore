/**
 * API Helper Functions
 */

import { useStore } from './store';

const API_BASE = '/api';

class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchAPI(
  endpoint: string,
  options: RequestInit = {},
  token?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new APIError(data.error || 'Request failed', response.status);
  }

  return data;
}

// Auth API
export const authAPI = {
  sendOTP: (email: string, phone?: string, name?: string) =>
    fetchAPI('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, phone, name }),
    }),

  verifyOTP: (email: string, otp: string) =>
    fetchAPI('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  register: (data: {
    email: string;
    password: string;
    name: string;
    role: string;
    phone?: string;
    shopDetails?: Record<string, unknown>;
  }) =>
    fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: (token: string) => fetchAPI('/auth/me', {}, token),
};

// Shops API
export const shopsAPI = {
  getAll: (params?: { search?: string; category?: string; city?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.city) query.set('city', params.city);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    return fetchAPI(`/shops?${query.toString()}`);
  },

  getById: (id: string) => fetchAPI(`/shops/${id}`),

  getMy: (token: string) => fetchAPI('/shops/my', {}, token),

  create: (data: Record<string, unknown>, token: string) =>
    fetchAPI('/shops', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  update: (id: string, data: Record<string, unknown>, token: string) =>
    fetchAPI(`/shops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),
};

// Bills API
export const billsAPI = {
  upload: async (image: File, shopId: string | null, token: string) => {
    const formData = new FormData();
    formData.append('image', image);
    if (shopId) formData.append('shopId', shopId);

    const response = await fetch(`${API_BASE}/bills/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new APIError(data.error || 'Upload failed', response.status);
    }
    return data;
  },

  verify: (billId: string, shopId: string, token: string) =>
    fetchAPI('/bills/verify', {
      method: 'POST',
      body: JSON.stringify({ billId, shopId }),
    }, token),

  getMy: (token: string) => fetchAPI('/bills/my', {}, token),

  getById: (id: string, token: string) => fetchAPI(`/bills/${id}`, {}, token),
};

// Reviews API
export const reviewsAPI = {
  submit: (billId: string, reviewText: string, token: string) =>
    fetchAPI('/reviews', {
      method: 'POST',
      body: JSON.stringify({ billId, reviewText }),
    }, token),

  getShopReviews: (shopId: string, params?: { sentiment?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.sentiment) query.set('sentiment', params.sentiment);
    if (params?.limit) query.set('limit', params.limit.toString());
    return fetchAPI(`/reviews/shop/${shopId}?${query.toString()}`);
  },

  getMy: (token: string) => fetchAPI('/reviews/my', {}, token),

  respond: (reviewId: string, response: string, token: string) =>
    fetchAPI(`/reviews/${reviewId}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ response }),
    }, token),
};

// Trust Score API
export const trustScoreAPI = {
  get: (shopId: string) => fetchAPI(`/trust-score/${shopId}`),

  calculate: (shopId: string, token: string) =>
    fetchAPI(`/trust-score/${shopId}`, {
      method: 'POST',
    }, token),
};

// Alerts API
export const alertsAPI = {
  getAll: (token: string, status?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchAPI(`/alerts${query}`, {}, token);
  },

  markRead: (id: string, token: string) =>
    fetchAPI(`/alerts/${id}/read`, {
      method: 'PUT',
    }, token),
};

// Admin API
export const adminAPI = {
  getStats: (token: string) => fetchAPI('/admin/stats', {}, token),
};

// Hook for authenticated API calls
export function useAPI() {
  const token = useStore((state) => state.token);
  return { token };
}
