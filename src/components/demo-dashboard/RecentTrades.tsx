import React, { useState, useEffect } from 'react';
import { History, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Trade {
  id: string;
  ticket: string;
  symbol: string;
  type: string;
  volume: number;
  profit: number;
  close_time: string;
  mt5_id: string;
}

export default function RecentTrades({ filterType = 'all' }: { filterType?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadRecentTrades();
  }, [user, filterType]);

  const loadRecentTrades = async () => {
    try {
      // Get user's MT5 IDs first
      const { data: accounts } = await supabase
        .from('trading_accounts')
        .select('mt5_login, status')
        .eq('user_id', user!.id);

      if (!accounts || accounts.length === 0) {
        setLoading(false);
        setTrades([]);
        return;
      }

      let mt5Ids: string[] = [];
      if (filterType === 'all') {
        mt5Ids = accounts.map(a => a.mt5_login).filter(Boolean);
      } else if (filterType === 'active' || filterType === 'breached') {
        mt5Ids = accounts.filter(a => a.status === filterType).map(a => a.mt5_login).filter(Boolean);
      } else {
        mt5Ids = [filterType]; // specific mt5_login
      }

      if (mt5Ids.length === 0) {
        setTrades([]);
        setLoading(false);
        return;
      }

      // Fetch trades for those IDs
      const { data, error } = await supabase
        .from('trade_history')
        .select('*')
        .in('mt5_id', mt5Ids)
        .order('close_time', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTrades(data || []);
    } catch (err) {
      console.error('Error loading recent trades:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.06] p-6 h-[400px] flex items-center justify-center"
           style={{ background: 'linear-gradient(135deg, #161B22 0%, #131820 100%)' }}>
        <div className="w-8 h-8 border-2 border-[#8A2BE2]/20 border-t-[#8A2BE2] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (trades.length === 0) {
    return null; // Don't show if no trades
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] shadow-lg shadow-black/10 mt-6 overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #161B22 0%, #131820 100%)' }}>
      <div className="flex items-center justify-between p-6 border-b border-white/[0.04]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8A2BE2]/20 to-[#8A2BE2]/5 flex items-center justify-center border border-white/[0.04]">
            <History className="w-4.5 h-4.5 text-[#c084fc]" />
          </div>
          <h3 className="text-lg font-bold text-white">History</h3>
        </div>
        <button 
          onClick={() => navigate('/trading-accounts')}
          className="text-xs font-bold text-[#c084fc] hover:text-[#8A2BE2] transition-colors"
        >
          View All Context
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="py-4 px-6 text-xs font-bold text-[#484f58] uppercase tracking-wider">Symbol</th>
              <th className="py-4 px-6 text-xs font-bold text-[#484f58] uppercase tracking-wider">Type</th>
              <th className="py-4 px-6 text-xs font-bold text-[#484f58] uppercase tracking-wider">MT5 Account</th>
              <th className="py-4 px-6 text-xs font-bold text-[#484f58] uppercase tracking-wider">P/L</th>
              <th className="py-4 px-6 text-xs font-bold text-[#484f58] uppercase tracking-wider text-right">Execution Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-4 px-6">
                  <span className="text-sm font-bold text-white">{trade.symbol}</span>
                  <div className="text-[10px] text-[#484f58] mt-0.5">#{trade.ticket}</div>
                </td>
                <td className="py-4 px-6">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    trade.type.toLowerCase() === 'buy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-red-500/10 text-red-400 border border-red-500/15'
                  }`}>
                    {trade.type.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 px-6 text-sm text-[#8B949E] font-mono">{trade.mt5_id}</td>
                <td className={`py-4 px-6 text-sm font-bold ${trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-6 text-xs text-[#8B949E] text-right">
                  {new Date(trade.close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
