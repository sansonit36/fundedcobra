import React, { useState, useEffect } from 'react';
import { DollarSign, Activity, Wallet, BarChart3, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
      const { data: accounts, error: accountsError } = await supabase
        .from('trading_accounts')
        .select('id, mt5_login, balance, equity, status, created_at')
        .eq('user_id', user!.id);

      if (accountsError) throw accountsError;

      const { data: pendingRequests, error: requestsError } = await supabase
        .from('account_requests')
        .select('id')
        .eq('user_id', user!.id)
        .in('status', ['pending_payment', 'payment_submitted']);

      if (requestsError) throw requestsError;
      setAllAccounts(accounts || []);

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
        const { data: extendedData } = await supabase
          .from('account_data_extended')
          .select('mt5_id, running_balance, running_equity, initial_equity')
          .in('mt5_id', mt5Logins);

        const extMap = new Map((extendedData || []).map(d => [d.mt5_id, d]));

        filteredAccounts.forEach(acc => {
          const ext = extMap.get(acc.mt5_login);
          totalBalance += ext ? ext.running_balance : acc.balance;
          totalEquity += ext ? ext.running_equity : acc.equity;
          totalInitial += ext ? ext.initial_equity : acc.balance;
        });

        const { data: trades, error: tradesError } = await supabase
          .from('trade_history')
          .select('profit, close_time')
          .in('mt5_id', mt5Logins);

        if (!tradesError && trades) {
          totalTrades = trades.length;
          realizedProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
          const todayTrades = trades.filter(t => new Date(t.close_time).toDateString() === today.toDateString());
          dailyPL = todayTrades.reduce((sum, t) => sum + t.profit, 0);
        }
      } else {
        totalBalance = filteredAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        totalEquity = filteredAccounts.reduce((sum, acc) => sum + acc.equity, 0);
        totalInitial = totalBalance;
      }

      const totalProfits = realizedProfit;
      const activeAccounts = accounts?.filter(acc => acc.status === 'active') || [];
      const pendingAccounts = requestsError ? 0 : pendingRequests?.length || 0;
      const monthlyChange = totalBalance > 0 ? ((totalEquity - totalBalance) / totalBalance) * 100 : 0;
      const dailyChangePercent = totalBalance > 0 ? (dailyPL / totalBalance) * 100 : 0;

      setStats({
        totalBalance, monthlyChange,
        activeAccounts: activeAccounts.length, pendingAccounts,
        dailyPL, dailyChangePercent,
        monthlyPL: totalProfits, monthlyChangePercent: monthlyChange,
        totalProfits, totalTrades
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
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[140px] bg-[#161B22]/80 rounded-2xl border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-500/[0.06] border border-red-500/15 p-6">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const avgProfit = stats.totalTrades > 0 ? stats.totalProfits / stats.totalTrades : 0;

  const cards = [
    {
      label: 'Total Balance',
      value: `$${stats.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 0 })}`,
      sub: `${stats.monthlyChange >= 0 ? '+' : ''}${stats.monthlyChange.toFixed(1)}% equity change`,
      subColor: stats.monthlyChange >= 0 ? 'text-emerald-400' : 'text-red-400',
      icon: DollarSign,
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      iconColor: 'text-emerald-400',
      glowColor: 'emerald'
    },
    {
      label: 'Active Accounts',
      value: String(stats.activeAccounts),
      sub: stats.pendingAccounts > 0 ? `${stats.pendingAccounts} pending approval` : 'All accounts healthy',
      subColor: stats.pendingAccounts > 0 ? 'text-yellow-400' : 'text-[#484f58]',
      icon: Wallet,
      iconBg: 'bg-[#8A2BE2]/10 border-[#8A2BE2]/20',
      iconColor: 'text-[#8A2BE2]',
      glowColor: 'purple'
    },
    {
      label: 'Total Executions',
      value: stats.totalTrades.toLocaleString(),
      sub: `$${stats.totalProfits.toLocaleString(undefined, { minimumFractionDigits: 2 })} realized`,
      subColor: stats.totalProfits >= 0 ? 'text-emerald-400' : 'text-red-400',
      icon: Activity,
      iconBg: 'bg-sky-500/10 border-sky-500/20',
      iconColor: 'text-sky-400',
      glowColor: 'sky'
    },
    {
      label: 'Avg Profit/Trade',
      value: `$${avgProfit.toFixed(2)}`,
      sub: 'Per closed position',
      subColor: 'text-[#484f58]',
      icon: BarChart3,
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      iconColor: 'text-amber-400',
      glowColor: 'amber'
    }
  ];

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-2xl bg-[#161B22]/80 border border-white/[0.06] p-4">
        <div className="flex items-center gap-3">
          <div className="flex bg-[#0D1117] rounded-xl border border-white/[0.06] p-1">
            {(['all', 'active', 'breached'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType && setFilterType(type)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                  ['all', 'active', 'breached'].includes(filterType) && filterType === type
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-[#484f58] hover:text-[#8B949E]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType && setFilterType(e.target.value)}
          className="bg-[#0D1117] border border-white/[0.06] text-[#E6EDF3] text-xs font-mono rounded-xl focus:ring-[#8A2BE2]/50 focus:border-[#8A2BE2]/50 w-full sm:w-60 px-4 py-2.5 outline-none transition-colors hover:border-white/[0.12] appearance-none"
        >
          <option value="all" disabled={['all', 'active', 'breached'].includes(filterType)}>-- Select Account --</option>
          {allAccounts.some(a => a.status === 'active') && (
            <optgroup label="Active Accounts">
              {allAccounts.filter(a => a.status === 'active').map(a => (
                <option key={a.id} value={a.mt5_login}>Account #{a.mt5_login}</option>
              ))}
            </optgroup>
          )}
          {allAccounts.some(a => a.status === 'breached') && (
            <optgroup label="Breached Accounts">
              {allAccounts.filter(a => a.status === 'breached').map(a => (
                <option key={a.id} value={a.mt5_login}>Account #{a.mt5_login} (Breached)</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-2xl bg-[#161B22]/80 border border-white/[0.06] p-6 hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5"
          >
            {/* Subtle top glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 bg-${card.glowColor}-500/[0.06] rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-[#484f58] uppercase tracking-wider">{card.label}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${card.iconBg}`}>
                  <card.icon className={`w-4.5 h-4.5 ${card.iconColor}`} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-2">{card.value}</h3>
              <p className={`text-xs font-medium ${card.subColor}`}>{card.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}