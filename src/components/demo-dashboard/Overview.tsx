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
            <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-sm p-6">
              <div className="animate-pulse">
                <div className="w-8 h-8 rounded bg-[#30363D]/50 mb-6"></div>
                <div className="h-3 bg-[#30363D]/50 w-24 mb-3"></div>
                <div className="h-8 bg-[#30363D]/50 w-32"></div>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#161B22] border border-[#30363D] p-5 rounded-sm gap-4">
        <div>
          <h3 className="text-[#E6EDF3] text-sm font-bold uppercase tracking-widest">Dashboard Metrics</h3>
          <p className="text-[#8B949E] text-xs mt-1">Select an account context to refilter data context.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Quick Filter Tabs */}
          <div className="flex bg-[#0E1117] border border-[#30363D] p-1 rounded-sm w-full sm:w-auto">
            {(['all', 'active', 'breached'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType && setFilterType(type)}
                className={`px-4 py-1.5 ${['all', 'active', 'breached'].includes(filterType) && filterType === type ? 'bg-[#30363D] text-[#E6EDF3]' : 'text-[#8B949E] hover:text-[#E6EDF3]'} rounded-sm text-xs font-bold uppercase tracking-wider transition-colors flex-1 sm:flex-none text-center`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Specific Account Dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType && setFilterType(e.target.value)}
            className="bg-[#0E1117] border border-[#30363D] text-[#E6EDF3] text-xs font-mono uppercase rounded-sm focus:ring-[#1D9BF0] focus:border-[#1D9BF0] block w-full sm:w-64 p-2.5 outline-none transition-colors hover:border-[#8B949E]"
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
        <div className="bg-[#1e1e1e] border border-[#2A2A2A] rounded-md p-6">
          <p className="text-xs font-bold text-[#808080] uppercase mb-4">Total Balance</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-3xl font-bold text-white">${stats.totalBalance.toLocaleString()}</h3>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-[#bd4dd6]">
            <span>+{stats.monthlyChange.toFixed(1)}% Active Change</span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="bg-[#1e1e1e] border border-[#2A2A2A] rounded-md p-6">
          <p className="text-xs font-bold text-[#808080] uppercase mb-4">Active Accounts</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-3xl font-bold text-white">{stats.activeAccounts}</h3>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-[#a0a0a0]">
            <span>{stats.pendingAccounts} Pending Approval</span>
          </div>
        </div>

        {/* Total Trades */}
        <div className="bg-[#1e1e1e] border border-[#2A2A2A] rounded-md p-6">
          <p className="text-xs font-bold text-[#808080] uppercase mb-4">Total Executions</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-3xl font-bold text-white">{stats.totalTrades}</h3>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-[#bd4dd6]">
            <span className="text-white mr-1">${stats.totalProfits.toLocaleString()}</span> Realized
          </div>
        </div>

        {/* Average Trade Size */}
        <div className="bg-[#1e1e1e] border border-[#2A2A2A] rounded-md p-6">
          <p className="text-xs font-bold text-[#808080] uppercase mb-4">Avg Profit Context</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-3xl font-bold text-white">
              ${stats.totalTrades > 0 ? (stats.totalProfits / stats.totalTrades).toFixed(2) : '0.00'}
            </h3>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-[#bd4dd6]">
            <span>Per Closed Action</span>
          </div>
        </div>
      </div>
    </div>
  );
}