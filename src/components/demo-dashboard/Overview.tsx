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
            <div key={i} className="rounded-2xl border border-white/[0.06] p-6"
                 style={{ background: 'linear-gradient(135deg, #161B22 0%, #131820 100%)' }}>
              <div className="animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] mb-5"></div>
                <div className="h-3 bg-white/[0.05] w-24 mb-3 rounded"></div>
                <div className="h-8 bg-white/[0.05] w-32 rounded"></div>
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

  const cardData = [
    {
      label: 'Total Balance',
      value: `$${stats.totalBalance.toLocaleString()}`,
      sub: `+${stats.monthlyChange.toFixed(1)}% Active Change`,
      subColor: stats.monthlyChange >= 0 ? 'text-emerald-400' : 'text-red-400',
      icon: DollarSign,
      iconBg: 'from-emerald-500/20 to-emerald-500/5',
      iconColor: 'text-emerald-400',
      borderAccent: 'hover:border-emerald-500/20'
    },
    {
      label: 'Active Accounts',
      value: String(stats.activeAccounts),
      sub: `${stats.pendingAccounts} Pending Approval`,
      subColor: 'text-[#8B949E]',
      icon: Users,
      iconBg: 'from-[#8A2BE2]/20 to-[#8A2BE2]/5',
      iconColor: 'text-[#c084fc]',
      borderAccent: 'hover:border-[#8A2BE2]/20'
    },
    {
      label: 'Total Executions',
      value: String(stats.totalTrades),
      sub: <><span className="text-white mr-1">${stats.totalProfits.toLocaleString()}</span> Realized</>,
      subColor: 'text-[#c084fc]',
      icon: Activity,
      iconBg: 'from-sky-500/20 to-sky-500/5',
      iconColor: 'text-sky-400',
      borderAccent: 'hover:border-sky-500/20'
    },
    {
      label: 'Avg Profit Context',
      value: `$${stats.totalTrades > 0 ? (stats.totalProfits / stats.totalTrades).toFixed(2) : '0.00'}`,
      sub: 'Per Closed Action',
      subColor: 'text-[#c084fc]',
      icon: Award,
      iconBg: 'from-amber-500/20 to-amber-500/5',
      iconColor: 'text-amber-400',
      borderAccent: 'hover:border-amber-500/20'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Filters Dropdown and Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-2xl border border-white/[0.06] p-5 gap-4"
           style={{ background: 'linear-gradient(135deg, #161B22 0%, #131820 100%)' }}>
        <div>
          <h3 className="text-[#E6EDF3] text-sm font-bold uppercase tracking-widest">Dashboard Metrics</h3>
          <p className="text-[#484f58] text-xs mt-1">Select an account context to refilter data context.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Quick Filter Tabs */}
          <div className="flex bg-[#0D1117] border border-white/[0.06] p-1 rounded-xl w-full sm:w-auto">
            {(['all', 'active', 'breached'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType && setFilterType(type)}
                className={`px-4 py-1.5 ${['all', 'active', 'breached'].includes(filterType) && filterType === type ? 'bg-white/[0.08] text-[#E6EDF3] shadow-sm' : 'text-[#484f58] hover:text-[#8B949E]'} rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex-1 sm:flex-none text-center`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Specific Account Dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType && setFilterType(e.target.value)}
            className="bg-[#0D1117] border border-white/[0.06] text-[#E6EDF3] text-xs font-mono uppercase rounded-xl focus:ring-[#8A2BE2]/50 focus:border-[#8A2BE2]/50 block w-full sm:w-64 p-2.5 outline-none transition-colors hover:border-white/[0.12]"
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
        {cardData.map((card, i) => (
          <div key={i}
            className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] p-6 transition-all duration-300 hover:-translate-y-0.5 ${card.borderAccent}`}
            style={{ background: 'linear-gradient(135deg, #161B22 0%, #131820 100%)' }}
          >
            {/* Subtle gradient glow on hover */}
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${card.iconBg} blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none`} />
            
            <div className="relative z-10">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.iconBg} flex items-center justify-center mb-5 border border-white/[0.04]`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              
              <p className="text-xs font-bold text-[#484f58] uppercase mb-2 tracking-wider">{card.label}</p>
              <div className="flex items-baseline space-x-1">
                <h3 className="text-3xl font-bold text-white tracking-tight">{card.value}</h3>
              </div>
              <div className={`mt-3 flex items-center text-xs font-bold ${card.subColor}`}>
                <span>{card.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}