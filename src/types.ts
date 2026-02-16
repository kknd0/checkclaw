export interface Account {
  id: string;
  name: string;
  type: string;
  subtype: string;
  balance: {
    available: number;
    current: number;
    currency: string;
  };
}

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string[];
  account_id: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  has_more: boolean;
}

export interface BillingPlan {
  plan: string;
  price: number;
  currency: string;
  billing_cycle: string;
  current_period_end: string;
  limits: {
    bank_connections: number;
    monthly_queries: number;
  };
  usage: {
    bank_connections: number;
    monthly_queries: number;
  };
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: string;
  description: string;
}

export interface LinkItem {
  id: string;
  institution: string;
  accounts: number;
  status: string;
  created_at: string;
}

export interface AuthResponse {
  api_key: string;
  user: {
    id: string;
    email: string;
  };
}

export interface UserInfo {
  id: string;
  email: string;
  plan: string;
}
