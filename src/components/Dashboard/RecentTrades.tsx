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

export default function RecentTrades() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadRecentTrades();
  }, [user]);

  const loadRecentTrades = async () => {
    try {
      // Get user's MT5 IDs first
      const { data: accounts } = await supabase
        .from('trading_accounts')
        .select('mt5_login')
        .eq('user_id', user!.id);

      if (!accounts || accounts.length === 0) {
        setLoading(false);
        return;
      }

      const mt5Ids = accounts.map(a => a.mt5_login);

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
      <div className="card-gradient rounded-2xl p-6 border border-white/5 h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (trades.length === 0) {
    return null; // Don't show if no trades
  }

  return (
    <div className="card-gradient rounded-2xl p-6 border border-white/5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Recent Trading Activity</h3>
        </div>
        <button 
          onClick={() => navigate('/trading-accounts')}
          className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center"
        >
          View All Accounts
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Symbol</th>
              <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
              <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Account</th>
              <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Profit</th>
              <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-white/5 transition-colors group">
                <td className="py-4">
                  <span className="text-sm font-bold text-white uppercase">{trade.symbol}</span>
                  <p className="text-[10px] text-gray-500">#{trade.ticket}</p>
                </td>
                <td className="py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    trade.type.toLowerCase() === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {trade.type}
                  </span>
                </td>
                <td className="py-4 text-sm text-gray-300 font-mono">{trade.mt5_id}</td>
                <td className={`py-4 text-sm font-bold ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-4 text-xs text-gray-400">
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
