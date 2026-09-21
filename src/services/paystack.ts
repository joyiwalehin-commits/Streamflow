import { 
  CoinPackage, 
  PaystackTransaction, 
  PaystackConfigResponse, 
  PaystackVerifyResponse 
} from '../types';

export async function fetchPaystackConfig(): Promise<PaystackConfigResponse> {
  const res = await fetch('/api/paystack/config');
  if (!res.ok) {
    throw new Error('Failed to load Paystack configuration');
  }
  return res.json();
}

export async function initializePaystackPayment(params: {
  packageId: string;
  email: string;
  userId: string;
  callbackUrl?: string;
}): Promise<{
  status: boolean;
  data: {
    reference: string;
    authorization_url?: string | null;
    access_code?: string;
  };
  package: CoinPackage;
  isTestMode: boolean;
  sandboxSimulated?: boolean;
}> {
  const res = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to initialize Paystack payment');
  }
  return data;
}

export async function verifyPaystackPayment(params: {
  reference: string;
  userId?: string;
}): Promise<PaystackVerifyResponse> {
  const res = await fetch('/api/paystack/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok && !data.alreadyCredited) {
    throw new Error(data.error || 'Payment verification failed');
  }
  return data;
}

export async function simulateTestPayment(params: {
  reference: string;
  channel?: string;
  outcome: 'success' | 'decline' | 'cancel';
}): Promise<{
  success: boolean;
  credited: boolean;
  coinsAdded?: number;
  cancelled?: boolean;
  message?: string;
  transaction?: PaystackTransaction;
}> {
  const res = await fetch('/api/paystack/simulate-test-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Simulation failed');
  }
  return data;
}

export async function fetchUserTransactions(userId: string = 'user_me'): Promise<PaystackTransaction[]> {
  const res = await fetch(`/api/paystack/transactions?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch transaction history');
  }
  const data = await res.json();
  return data.transactions || [];
}
