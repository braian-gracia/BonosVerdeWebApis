import axios from 'axios';
import keycloak from '../auth/keycloak';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function isAuthEndpoint(url?: string) {
  return (
    url?.includes('/api/auth/login') ||
    url?.includes('/api/auth/register') ||
    url?.includes('/api/auth/refresh')
  );
}

api.interceptors.request.use(async (config) => {
  if (keycloak.authenticated) {
    try {
      await keycloak.updateToken(30);
    } catch {
      await keycloak.login();
    }

    if (keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await keycloak.updateToken(-1);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;
      return api(originalRequest);
    } catch {
      await keycloak.login();
      return Promise.reject(error);
    }
  }
);

export const authAPI = {
  register: (data: { email: string; name: string; password: string; referralCode?: string }) =>
    api.post('/api/auth/register', data),
  getProfile: () =>
    api.get('/api/auth/profile'),
  updateProfile: (data: { name?: string }) =>
    api.put('/api/auth/profile', data),
  changePassword: (data: { newPassword: string }) =>
    api.put('/api/auth/change-password', data),
};

export const bondsAPI = {
  getCatalog: (search?: string) =>
    api.get('/api/bonds/catalog', { params: search ? { search } : {} }),
  purchase: (data: { bondType: string; paymentMethod: string }) =>
    api.post('/api/bonds/purchase', data),
  getMyBonds: (status?: string) =>
    api.get('/api/bonds/my-bonds', { params: status ? { status } : {} }),
  getBondById: (id: number) =>
    api.get(`/api/bonds/${id}`),
  getBondQR: (id: number) =>
    api.get(`/api/bonds/${id}/qr`),
  redeemBond: (id: number) =>
    api.post(`/api/bonds/${id}/redeem`),
};

export const paymentsAPI = {
  simulatePayment: (data: { bondType: string; paymentMethod: string }) =>
    api.post('/api/payments/simulate', data),
  getPaymentStatus: (id: number) =>
    api.get(`/api/payments/${id}/status`),
};

export const referralsAPI = {
  getMyCode: () =>
    api.get('/api/referrals/my-code'),
  getStats: () =>
    api.get('/api/referrals/stats'),
  applyCode: (code: string) =>
    api.post('/api/referrals/apply', { code }),
  getCommissions: () =>
    api.get('/api/referrals/commissions'),
};

export const adminAPI = {
  getStats: () =>
    api.get('/api/admin/stats'),
  getUsers: (params?: { search?: string; role?: string }) =>
    api.get('/api/admin/users', { params }),
  updateUserRole: (id: number, role: string) =>
    api.put(`/api/admin/users/${id}/role`, { role }),
  deleteUser: (id: number) =>
    api.delete(`/api/admin/users/${id}`),
  getBonds: (params?: { search?: string; status?: string }) =>
    api.get('/api/admin/bonds', { params }),
  getTransactions: (params?: { search?: string; status?: string }) =>
    api.get('/api/admin/transactions', { params }),
  getReferrals: (search?: string) =>
    api.get('/api/admin/referrals', { params: search ? { search } : {} }),
};

export default api;
