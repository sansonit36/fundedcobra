import React, { useState, useEffect } from 'react';
import { History, ArrowRight } from 'lucide-react';
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
        mt5Ids = [filterType];
      }

      if (mt5Ids.length === 0) {
        setTrades([]);
        setLoading(false);
        return;
      }

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
      <div className="rounded-2xl bg-[#161B22]/80 border border-white/[0.06] p-6 h-[400px] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#8A2BE2]/20 border-t-[#8A2BE2] rounded-full animate-spin" />
      </div>
    );
  }

  if (trades.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[#161B22]/80 border border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#8A2BE2]/10 border border-[#8A2BE2]/20 flex items-center justify-center">
            <History className="w-4 h-4 text-[#8A2BE2]" />
          </div>
          <h3 className="text-sm font-semibold text-white">Recent Trades</h3>
        </div>
        <button
          onClick={() => navigate('/trading-accounts')}
          className="text-xs font-semibold text-[#8B949E] hover:text-white transition-colors flex items-center gap-1"
        >
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="py-3 px-6 text-[10px] font-semibold text-[#484f58] uppercase tracking-wider">Symbol</th>
              <th className="py-3 px-6 text-[10px] font-semibold text-[#484f58] uppercase tracking-wider">Type</th>
              <th className="py-3 px-6 text-[10px] font-semibold text-[#484f58] uppercase tracking-wider">Account</th>
              <th className="py-3 px-6 text-[10px] font-semibold text-[#484f58] uppercase tracking-wider">P/L</th>
              <th className="py-3 px-6 text-[10px] font-semibold text-[#484f58] uppercase tracking-wider text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-6">
                  <span className="text-sm font-semibold text-white">{trade.symbol}</span>
                  <div className="text-[10px] text-[#484f58] mt-0.5 font-mono">#{trade.ticket}</div>
                </td>
                <td className="py-3.5 px-6">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                    trade.type.toLowerCase() === 'buy'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                      : 'bg-red-500/10 text-red-400 border border-red-500/15'
                  }`}>
                    {trade.type}
                  </span>
                </td>
                <td className="py-3.5 px-6 text-xs text-[#8B949E] font-mono">{trade.mt5_id}</td>
                <td className={`py-3.5 px-6 text-sm font-semibold ${trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-6 text-xs text-[#484f58] text-right">
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
