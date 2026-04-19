import React, { useState, useEffect } from 'react';
import { DollarSign, Activity, Users, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  totalBalance: number;
  monthlyChange: number;
  activeAccounts: number;
  pendingAccounts: number;
  dailyPL: number;
  dailyChangePercent: number;
  monthlyPL: number;
  monthlyChangePercent: number;
  totalProfits: number;
  totalTrades: number;
}

export default function Overview({ filterType = 'all', setFilterType }: { filterType?: string, setFilterType?: (v: string) => void }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user, filterType]);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Get active trading accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('trading_accounts')
        .select(`
          id,
          mt5_login,
          balance,
          equity,
          status,
          created_at
        `)
        .eq('user_id', user!.id);

      if (accountsError) throw accountsError;

      // Get pending account requests
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('account_requests')
        .select('id')
        .eq('user_id', user!.id)
        .in('status', ['pending_payment', 'payment_submitted']);

      if (requestsError) throw requestsError;

      setAllAccounts(accounts || []);

      // Filter accounts based on groups or specific MT5 Login
      const filteredAccounts = filterType === 'all' 
        ? (accounts || []) 
        : filterType === 'active' || filterType === 'breached'
          ? (accounts?.filter(acc => acc.status === filterType) || [])
          : (accounts?.filter(acc => acc.mt5_login === filterType) || []);

      const mt5Logins = filteredAccounts.map(acc => acc.mt5_login).filter(Boolean);

      let totalBalance = 0;
      let totalEquity = 0;
      let totalInitial = 0;
      let totalTrades = 0;
      let realizedProfit = 0;
      let dailyPL = 0;
      const today = new Date();

      if (mt5Logins.length > 0) {
        // Fetch Live Metrics
        const { data: extendedData } = await supabase
          .from('account_data_extended')
          .select('mt5_id, running_balance, running_equity, initial_equity')
          .in('mt5_id', mt5Logins);

        const extMap = new Map((extendedData || []).map(d => [d.mt5_id, d]));

        // Calculate live balances
        filteredAccounts.forEach(acc => {
           const ext = extMap.get(acc.mt5_login);
           totalBalance += ext ? ext.running_balance : acc.balance;
           totalEquity += ext ? ext.running_equity : acc.equity;
           totalInitial += ext ? ext.initial_equity : acc.balance; 
        });

        // Fetch Live Trades
        const { data: trades, error: tradesError } = await supabase
          .from('trade_history')
          .select('profit, close_time')
          .in('mt5_id', mt5Logins);

        if (!tradesError && trades) {
          totalTrades = trades.length;
          realizedProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
          const todayTrades = trades.filter(t => {
            const d = new Date(t.close_time);
            return d.toDateString() === today.toDateString();
          });
          dailyPL = todayTrades.reduce((sum, t) => sum + t.profit, 0);
        }
      } else {
        // Fallback for no active MT5 accounts
        totalBalance = filteredAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        totalEquity = filteredAccounts.reduce((sum, acc) => sum + acc.equity, 0);
        totalInitial = totalBalance;
      }

      const totalProfits = realizedProfit;

      // The calculations for daily and trade array are handled above.
      const activeAccounts = accounts?.filter(acc => acc.status === 'active') || [];
      const pendingAccounts = requestsError ? 0 : pendingRequests?.length || 0;

      // Calculate monthly change
      const monthlyChange = totalBalance > 0 ? ((totalEquity - totalBalance) / totalBalance) * 100 : 0;
      const dailyChangePercent = totalBalance > 0 ? (dailyPL / totalBalance) * 100 : 0;

      setStats({
        totalBalance,
        monthlyChange,
        activeAccounts: activeAccounts.length,
        pendingAccounts,
        dailyPL,
        dailyChangePercent,
        monthlyPL: totalProfits,
        monthlyChangePercent: monthlyChange,
        totalProfits,
        totalTrades
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-gradient rounded-2xl p-6 border border-white/5">
              <div className="animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-white/10 mb-4"></div>
                <div className="h-4 bg-white/10 rounded w-24 mb-1"></div>
                <div className="h-6 bg-white/10 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Filters Dropdown and Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/5 border border-white/10 p-4 rounded-2xl gap-4">
        <div>
          <h3 className="text-white font-medium">Dashboard Overview</h3>
          <p className="text-gray-400 text-xs mt-1">Select an account or group to filter statistics.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Quick Filter Tabs */}
          <div className="flex bg-[#0b0e14] border border-white/10 p-1 rounded-xl w-full sm:w-auto">
            {(['all', 'active', 'breached'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType && setFilterType(type)}
                className={`px-4 py-2 ${['all', 'active', 'breached'].includes(filterType) && filterType === type ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'} rounded-lg text-sm font-medium transition-colors capitalize flex-1 sm:flex-none text-center`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Specific Account Dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType && setFilterType(e.target.value)}
            className="bg-[#0b0e14] border border-white/10 text-white text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full sm:w-64 p-3 outline-none transition-colors hover:border-white/20"
          >
            <option value="all" disabled={['all', 'active', 'breached'].includes(filterType)}>-- Select Specific Account --</option>
            {allAccounts.some(a => a.status === 'active') && (
              <optgroup label="Specific Active Accounts">
                {allAccounts.filter(a => a.status === 'active').map(a => (
                  <option key={a.id} value={a.mt5_login}>Account #{a.mt5_login}</option>
                ))}
              </optgroup>
            )}
            {allAccounts.some(a => a.status === 'breached') && (
              <optgroup label="Specific Breached Accounts">
                {allAccounts.filter(a => a.status === 'breached').map(a => (
                  <option key={a.id} value={a.mt5_login}>Account #{a.mt5_login} (Breached)</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Balance */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
              {stats.monthlyChange >= 0 ? '+' : ''}{stats.monthlyChange.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Account Balance</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">${stats.totalBalance.toLocaleString()}</h3>
            <span className="text-sm text-gray-400">.00</span>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <DollarSign className="w-4 h-4 mr-1 text-green-400" />
            <span>Total Profits: ${stats.totalProfits.toLocaleString()}</span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-400" />
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400">
              Active
            </span>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Active Accounts</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">{stats.activeAccounts}</h3>
            <span className="text-sm text-gray-400">accounts</span>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <Activity className="w-4 h-4 mr-1 text-primary-400" />
            <span>{stats.pendingAccounts} pending approval</span>
          </div>
        </div>

        {/* Total Trades */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400">
              Trades
            </span>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Total Trades</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">{stats.totalTrades}</h3>
            <span className="text-sm text-gray-400">trades</span>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <Award className="w-4 h-4 mr-1 text-purple-400" />
            <span>Across all accounts</span>
          </div>
        </div>

        {/* Average Trade Size */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
              Average
            </span>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Average Profit</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">
              ${stats.totalTrades > 0 ? (stats.totalProfits / stats.totalTrades).toFixed(2) : '0.00'}
            </h3>
            <span className="text-sm text-gray-400">per trade</span>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <Activity className="w-4 h-4 mr-1 text-yellow-400" />
            <span>Based on total trades</span>
          </div>
        </div>
      </div>
    </div>
  );
}