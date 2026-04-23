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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#111118] rounded-2xl p-6 border border-white/[0.06]">
              <div className="animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] mb-4"></div>
                <div className="h-3 bg-white/[0.04] rounded w-24 mb-2"></div>
                <div className="h-6 bg-white/[0.04] rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#111118] rounded-2xl p-6 border border-red-500/10">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      icon: DollarSign,
      iconBg: 'bg-green-500/[0.08]',
      iconBorder: 'border-green-500/[0.12]',
      iconColor: 'text-green-400',
      badgeBg: 'bg-green-500/[0.08]',
      badgeColor: 'text-green-400',
      badgeText: `${stats.monthlyChange >= 0 ? '+' : ''}${stats.monthlyChange.toFixed(1)}%`,
      label: 'Account Balance',
      value: `$${stats.totalBalance.toLocaleString()}`,
      valueSuffix: '.00',
      footerIcon: DollarSign,
      footerIconColor: 'text-green-400',
      footerText: `Total Profits: $${stats.totalProfits.toLocaleString()}`,
    },
    {
      icon: Users,
      iconBg: 'bg-primary-500/[0.08]',
      iconBorder: 'border-primary-500/[0.12]',
      iconColor: 'text-primary-400',
      badgeBg: 'bg-primary-500/[0.08]',
      badgeColor: 'text-primary-400',
      badgeText: 'Active',
      label: 'Active Accounts',
      value: `${stats.activeAccounts}`,
      valueSuffix: ' accounts',
      footerIcon: Activity,
      footerIconColor: 'text-primary-400',
      footerText: `${stats.pendingAccounts} pending approval`,
    },
    {
      icon: Activity,
      iconBg: 'bg-blue-500/[0.08]',
      iconBorder: 'border-blue-500/[0.12]',
      iconColor: 'text-blue-400',
      badgeBg: 'bg-blue-500/[0.08]',
      badgeColor: 'text-blue-400',
      badgeText: 'Trades',
      label: 'Total Trades',
      value: `${stats.totalTrades}`,
      valueSuffix: ' trades',
      footerIcon: Award,
      footerIconColor: 'text-blue-400',
      footerText: 'Across all accounts',
    },
    {
      icon: DollarSign,
      iconBg: 'bg-amber-500/[0.08]',
      iconBorder: 'border-amber-500/[0.12]',
      iconColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/[0.08]',
      badgeColor: 'text-amber-400',
      badgeText: 'Average',
      label: 'Average Profit',
      value: `$${stats.totalTrades > 0 ? (stats.totalProfits / stats.totalTrades).toFixed(2) : '0.00'}`,
      valueSuffix: ' per trade',
      footerIcon: Activity,
      footerIconColor: 'text-amber-400',
      footerText: 'Based on total trades',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#111118] border border-white/[0.06] p-4 rounded-2xl gap-4">
        <div>
          <h3 className="text-white font-semibold">Dashboard Overview</h3>
          <p className="text-gray-500 text-xs mt-1">Select an account or group to filter statistics.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Quick Filter Tabs */}
          <div className="flex bg-[#08080c] border border-white/[0.06] p-1 rounded-xl w-full sm:w-auto">
            {(['all', 'active', 'breached'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType && setFilterType(type)}
                className={`px-4 py-2 ${['all', 'active', 'breached'].includes(filterType) && filterType === type ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'} rounded-lg text-sm font-semibold transition-all capitalize flex-1 sm:flex-none text-center`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Account Dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType && setFilterType(e.target.value)}
            className="bg-[#08080c] border border-white/[0.06] text-white text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500/40 block w-full sm:w-64 p-3 outline-none transition-colors hover:border-white/[0.12]"
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-[#111118] rounded-2xl p-5 border border-white/[0.06] hover:border-white/[0.10] transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} border ${card.iconBorder} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${card.badgeBg} ${card.badgeColor}`}>
                {card.badgeText}
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1">{card.label}</p>
            <div className="flex items-baseline space-x-1">
              <h3 className="text-2xl font-bold text-white tracking-tight">{card.value}</h3>
              <span className="text-xs text-gray-600">{card.valueSuffix}</span>
            </div>
            <div className="mt-3 flex items-center text-xs text-gray-500">
              <card.footerIcon className={`w-3.5 h-3.5 mr-1.5 ${card.footerIconColor}`} />
              <span>{card.footerText}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}