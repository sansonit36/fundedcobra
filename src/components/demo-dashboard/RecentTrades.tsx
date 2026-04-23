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
      <div className="bg-[#161B22] border border-[#30363D] rounded-sm p-6 h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1D9BF0]/20 border-t-[#1D9BF0] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (trades.length === 0) {
    return null; // Don't show if no trades
  }

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-sm">
      <div className="flex items-center justify-between p-5 border-b border-[#30363D]">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-[#8B949E]" />
          <h3 className="text-sm font-bold text-[#E6EDF3] uppercase tracking-widest">Recent Activity Ledger</h3>
        </div>
        <button 
          onClick={() => navigate('/trading-accounts')}
          className="text-[11px] font-bold text-[#8B949E] uppercase tracking-widest hover:text-[#E6EDF3] transition-colors flex items-center"
        >
          View All Context
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0E1117] border-b border-[#30363D]">
              <th className="py-2.5 px-4 text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Symbol</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Type</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">MT5 Account</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">P/L</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Execution Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363D]">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-[#30363D]/20 transition-colors">
                <td className="py-3 px-4">
                  <span className="text-[12px] font-bold text-[#E6EDF3] uppercase tracking-wide">{trade.symbol}</span>
                  <p className="text-[10px] text-[#8B949E] font-mono">#{trade.ticket}</p>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                    trade.type.toLowerCase() === 'buy' ? 'bg-[#3FB950]/10 text-[#3FB950]' : 'bg-[#F85149]/10 text-[#F85149]'
                  }`}>
                    {trade.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-[12px] text-[#8B949E] font-mono">{trade.mt5_id}</td>
                <td className={`py-3 px-4 text-[13px] font-mono font-bold ${trade.profit >= 0 ? 'text-[#3FB950]' : 'text-[#F85149]'}`}>
                  {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 text-[11px] text-[#8B949E] uppercase tracking-wider">
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
