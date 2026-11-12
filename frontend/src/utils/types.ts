export interface User {
  id: number;
  email: string;
  name: string;
  role: 'INVESTOR' | 'PREMIUM' | 'ADMIN';
  curvCode: string;
  totalSpent: number;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export interface Bond {
  id: number;
  userId: number;
  type: BondType;
  amount: number;
  code: string;
  qrData: string | null;
  certificateUrl: string | null;
  status: BondStatus;
  purchaseDate: string;
  redeemDate: string | null;
  createdAt: string;
}

export interface Transaction {
  id: number;
  userId: number;
  bondId: number | null;
  paymentMethod: PaymentMethod;
  paymentId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface Referral {
  id: number;
  referrerId: number;
  referredId: number;
  commissionRate: number;
  totalEarned: number;
  createdAt: string;
}

export interface ReferralStats {
  totalReferrals: number;
  totalEarned: number;
  pendingCommission: number;
  curvCode: string;
}

export interface BondCatalogItem {
  type: BondType;
  name: string;
  description: string;
  icon: string;
  price: number;
  color: string;
}

export type BondType = 'OXYGEN' | 'FAUNA' | 'CARBON24' | 'HYDROGEN';
export type BondStatus = 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
export type PaymentMethod = 'PAYPAL' | 'EPAYCO' | 'SIMULATED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
