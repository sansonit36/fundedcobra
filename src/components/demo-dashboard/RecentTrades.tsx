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
    <div className="bg-[#1e1e1e] border border-[#2A2A2A] rounded-md shadow-sm mt-6">
      <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
        <div className="flex items-center space-x-3">
          <History className="w-5 h-5 text-[#bd4dd6]" />
          <h3 className="text-lg font-bold text-white">History</h3>
        </div>
        <button 
          onClick={() => navigate('/trading-accounts')}
          className="text-xs font-bold text-[#bd4dd6] hover:text-[#a63aba] transition-colors"
        >
          View All Context
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="py-4 px-6 text-xs font-bold text-[#808080]">Symbol</th>
              <th className="py-4 px-6 text-xs font-bold text-[#808080]">Type</th>
              <th className="py-4 px-6 text-xs font-bold text-[#808080]">MT5 Account</th>
              <th className="py-4 px-6 text-xs font-bold text-[#808080]">P/L</th>
              <th className="py-4 px-6 text-xs font-bold text-[#808080] text-right">Execution Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-[#2A2A2A]/30 transition-colors">
                <td className="py-4 px-6">
                  <span className="text-sm font-bold text-white">{trade.symbol}</span>
                  <div className="text-[10px] text-[#808080] mt-0.5">#{trade.ticket}</div>
                </td>
                <td className="py-4 px-6">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-sm ${
                    trade.type.toLowerCase() === 'buy' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {trade.type.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 px-6 text-sm text-[#a0a0a0] font-mono">{trade.mt5_id}</td>
                <td className={`py-4 px-6 text-sm font-bold ${trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-6 text-xs text-[#a0a0a0] text-right">
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
