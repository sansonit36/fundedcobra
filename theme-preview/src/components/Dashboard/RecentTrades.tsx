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
      <div className="bg-[#111118] rounded-2xl p-6 border border-white/[0.06] h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (trades.length === 0) {
    return null; // Don't show if no trades
  }

  return (
    <div className="bg-[#111118] rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-white/[0.04]">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-500/[0.08] border border-primary-500/[0.12] flex items-center justify-center">
            <History className="w-4 h-4 text-primary-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Recent Trading Activity</h3>
        </div>
        <button 
          onClick={() => navigate('/trading-accounts')}
          className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors flex items-center px-3 py-1.5 rounded-lg hover:bg-primary-500/[0.06]"
        >
          View All
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="px-5 py-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Symbol</th>
              <th className="px-5 py-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Type</th>
              <th className="px-5 py-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Account</th>
              <th className="px-5 py-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Profit</th>
              <th className="px-5 py-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-b-0">
                <td className="px-5 py-3.5">
                  <span className="text-sm font-bold text-white uppercase">{trade.symbol}</span>
                  <p className="text-[10px] text-gray-600 font-mono mt-0.5">#{trade.ticket}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                    trade.type.toLowerCase() === 'buy' ? 'bg-green-500/[0.08] text-green-400' : 'bg-red-500/[0.08] text-red-400'
                  }`}>
                    {trade.type}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-400 font-mono">{trade.mt5_id}</td>
                <td className={`px-5 py-3.5 text-sm font-bold font-mono ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-600">
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
