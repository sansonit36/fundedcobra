export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
}

export interface TradingAccount {
  id: string;
  userId: string;
  status: 'active' | 'pending' | 'breached' | 'rejected';
  balance: number;
  equity: number;
  startingBalance: number;
  dailyLossLimit: number;
  overallLossLimit: number;
  tradingDays: number;
  currentProfit: number;
  weeklyTarget: number;
  mt5Login?: string;
  mt5Password?: string;
  mt5Server?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountPackage {
  id: string;
  name: string;
  balance: number;
  price: number;
  account_type: 'instant' | '1_step' | '2_step';
  is_active: boolean;
  tradingDays: number;
  profitTarget: number;
  dailyLossLimit: number;
  overallLossLimit: number;
}

export interface Database {
  public: {
    Tables: {
      account_packages: {
        Row: {
          id: string;
          name: string;
          balance: number;
          price: number;
          account_type: 'instant' | '1_step' | '2_step';
          is_active: boolean;
          trading_days: number;
          profit_target: number;
          daily_loss_limit: number;
          overall_loss_limit: number;
          created_at: string;
        };
      };
    };
  };
}