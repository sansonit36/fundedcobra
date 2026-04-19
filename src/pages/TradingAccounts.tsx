import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Copy, Eye, EyeOff, ExternalLink, Clock, CheckCircle, AlertOctagon, List, ChevronDown, ChevronUp, History, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTradingAccounts, getPendingAccounts, TradingAccount, AccountRequest } from '../lib/database';
import { supabase } from '../lib/supabase';

type TabType = 'active' | 'pending' | 'breached';

interface ExtendedAccountData {
  mt5_id: string;
  running_balance: number;
  running_equity: number;
  last_updated: string;
  daily_drawdown_limit: number;
  overall_drawdown_limit: number;
}

interface AccountsTabProps {
  accounts: TradingAccount[];
  searchQuery: string;
  type: TabType;
}

const statusStyles = {
  active: 'bg-green-500/10 text-green-400 border-green-400/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20',
  breached: 'bg-red-500/10 text-red-400 border-red-400/20',
  suspended: 'bg-orange-500/10 text-orange-400 border-orange-400/20',
  suspicious: 'bg-orange-500/10 text-orange-400 border-orange-400/20'
};

const statusIcons = {
  active: <CheckCircle className="w-5 h-5 text-green-400" />,
  pending: <Clock className="w-5 h-5 text-yellow-400" />,
  breached: <AlertOctagon className="w-5 h-5 text-red-400" />,
  suspended: <AlertOctagon className="w-5 h-5 text-orange-400" />,
  suspicious: <Clock className="w-5 h-5 text-orange-400" />
};

function AccountsTab({ accounts, searchQuery, type }: AccountsTabProps) {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showTrades, setShowTrades] = useState<Record<string, boolean>>({});
  const [extendedData, setExtendedData] = useState<Record<string, ExtendedAccountData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExtendedData();
  }, [accounts]);

  const loadExtendedData = async () => {
    try {
      // Get all MT5 IDs from accounts that match the current tab type
      const mt5Ids = accounts
        .filter(acc => acc.status === type)
        .map(acc => acc.mt5_login);

      if (mt5Ids.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch extended data including drawdown limits
      const { data, error } = await supabase
        .from('account_data_extended')
        .select('mt5_id, running_balance, running_equity, last_updated, daily_drawdown_limit, overall_drawdown_limit')
        .in('mt5_id', mt5Ids);

      if (error) throw error;

      // Convert data array into a record for easy lookup by mt5_id
      const dataMap = (data || []).reduce((acc, item) => ({
        ...acc,
        [item.mt5_id]: item
      }), {});

      setExtendedData(dataMap);
    } catch (err) {
      console.error('Error loading extended data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(account => 
    account.status === type &&
    (account.mt5_login.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.mt5_server.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const togglePasswordVisibility = (accountId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const toggleTradesVisibility = (accountId: string) => {
    setShowTrades(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-6 rounded-lg bg-white/5">
            <div className="h-6 bg-white/10 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredAccounts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No {type} accounts found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredAccounts.map((account) => {
        const extended = extendedData[account.mt5_login];
        
        return (
          <div key={account.id} className="p-6 rounded-lg bg-white/5 border border-white/10">
            <div className="flex flex-col lg:flex-row justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[account.status]}`}>
                      {statusIcons[account.status]}
                      <span className="ml-2 text-sm font-medium capitalize">{account.status}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Created: {new Date(account.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">MT5 Login</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-blue-400 font-medium">{account.mt5_login}</code>
                        <button
                          onClick={() => copyToClipboard(account.mt5_login)}
                          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400 mb-1">MT5 Password</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-blue-400 font-medium">
                          {showPasswords[account.id] ? account.mt5_password : '••••••••'}
                        </code>
                        <button
                          onClick={() => togglePasswordVisibility(account.id)}
                          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                        >
                          {showPasswords[account.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        {showPasswords[account.id] && (
                          <button
                            onClick={() => copyToClipboard(account.mt5_password)}
                            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400 mb-1">MT5 Server</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-blue-400 font-medium">{account.mt5_server}</code>
                        <button
                          onClick={() => copyToClipboard(account.mt5_server)}
                          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Balance</p>
                    <p className="text-xl font-semibold text-white">
                      ${(extended?.running_balance || 0).toLocaleString()}
                    </p>
                    {extended?.last_updated && (
                      <p className="text-xs text-gray-400">
                        Updated: {new Date(extended.last_updated).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Equity</p>
                    <p className="text-xl font-semibold text-white">
                      ${(extended?.running_equity || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Enhanced Drawdown Limits Section */}
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center">
                      <Target className="w-4 h-4 mr-2 text-blue-400" />
                      Loss Limits & Protection
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Daily Drawdown */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Daily Guard</p>
                          <p className="text-lg font-bold text-white">
                            ${(extended?.daily_drawdown_limit || 0).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">LIMIT</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Safe Zone Space</p>
                          <p className={`text-sm font-bold ${
                            ((extended?.running_equity || 0) - (extended?.daily_drawdown_limit || 0)) > 500 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            +${Math.max(0, (extended?.running_equity || 0) - (extended?.daily_drawdown_limit || 0)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Clear Visual Progress Bar */}
                      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                            ((extended?.running_equity || 0) - (extended?.daily_drawdown_limit || 0)) > 500 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-600 to-orange-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, Math.max(0, (((extended?.running_equity || 0) - (extended?.daily_drawdown_limit || 0)) / ((extended?.running_balance || 1) * 0.05)) * 100))}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Overall Drawdown */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Max Safety</p>
                          <p className="text-lg font-bold text-white">
                            ${(extended?.overall_drawdown_limit || 0).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">LIMIT</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Total Space</p>
                          <p className={`text-sm font-bold ${
                            ((extended?.running_equity || 0) - (extended?.overall_drawdown_limit || 0)) > 1000 ? 'text-blue-400' : 'text-red-400'
                          }`}>
                            +${Math.max(0, (extended?.running_equity || 0) - (extended?.overall_drawdown_limit || 0)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Interactive Progress Bar */}
                      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                            ((extended?.running_equity || 0) - (extended?.overall_drawdown_limit || 0)) > 1000 ? 'bg-gradient-to-r from-blue-600 to-indigo-500' : 'bg-gradient-to-r from-red-600 to-orange-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, Math.max(0, (((extended?.running_equity || 0) - (extended?.overall_drawdown_limit || 0)) / ((extended?.running_balance || 1) * 0.12)) * 100))}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* End Drawdown Limits Section */}
                
                {/* Breach Reason Section */}
                {account.status === 'breached' && account.breach_reason && (
                  <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center">
                      <AlertOctagon className="w-4 h-4 mr-2" />
                      Breach Reason
                    </h3>
                    <p className="text-sm text-red-300">{account.breach_reason}</p>
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <a
                        href="/rules"
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-sm font-medium"
                      >
                        Review Trading Rules
                      </a>
                      <a
                        href="/buy-account"
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors text-sm font-medium"
                      >
                        Get New Account
                      </a>
                    </div>
                  </div>
                )}
                {/* End Breach Reason Section */}
                
                {/* Trade History Toggle */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => toggleTradesVisibility(account.id)}
                    className="flex items-center text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <History className="w-4 h-4 mr-2" />
                    {showTrades[account.id] ? 'Hide Recent Trades' : 'View Recent Trades'}
                    {showTrades[account.id] ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                  </button>
                  
                  {showTrades[account.id] && (
                    <div className="mt-4">
                      <TradeHistoryTable mt5Id={account.mt5_login} breachReason={account.breach_reason} />
                    </div>
                  )}
                </div>
                {/* End Trade History Toggle */}
                
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface Trade {
  id: string;
  ticket: string;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  close_price: number;
  profit: number;
  open_time: string;
  close_time: string;
}

function TradeHistoryTable({ mt5Id, breachReason }: { mt5Id: string, breachReason?: string }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrades();
  }, [mt5Id]);

  const loadTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trade_history')
        .select('*')
        .eq('mt5_id', mt5Id)
        .order('close_time', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTrades(data || []);
    } catch (err) {
      console.error('Error loading trades:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (trades.length === 0) {
    return <p className="text-sm text-gray-500 italic py-2 text-center">No recent trades found for this account.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      {breachReason && (
        <div className="bg-red-500/10 px-4 py-3 border-b border-white/5 flex items-start space-x-2">
          <AlertOctagon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-red-400 font-bold text-sm uppercase tracking-wider">Account Rule Violations</h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {breachReason.includes('|') ? (
                breachReason.split('|').map((reason, idx) => (
                  <span key={idx} className="bg-red-500/20 text-red-300 text-xs px-2 py-1 rounded max-w-full truncate">{reason.trim()}</span>
                ))
              ) : (
                <span className="bg-red-500/20 text-red-300 text-xs px-2 py-1 rounded">{breachReason.replace('Audit: ', '')}</span>
              )}
            </div>
          </div>
        </div>
      )}
      <table className="w-full text-left border-collapse">
        <thead className="bg-white/5">
          <tr>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Symbol</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Volume</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Price</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Profit</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Open Time</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Close Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {trades.map((trade) => {
            const duration = Math.abs(new Date(trade.close_time).getTime() - new Date(trade.open_time).getTime()) / 1000;
            const isViolation = duration < 60;
            
            return (
              <tr key={trade.id} className={`hover:bg-white/5 transition-colors ${isViolation ? 'bg-red-500/5' : ''}`}>
                <td className="px-4 py-3">
                  <span className={`text-sm font-bold uppercase ${isViolation ? 'text-red-400' : 'text-white'}`}>{trade.symbol}</span>
                  <p className="text-[10px] text-gray-500">#{trade.ticket}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    trade.type.toLowerCase() === 'buy' 
                      ? 'bg-green-500/10 text-green-400' 
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {trade.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300 font-medium text-center">{trade.volume.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-gray-300 font-mono text-center">{trade.close_price.toFixed(5)}</td>
                <td className={`px-4 py-3 text-sm font-bold text-center ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className={`px-4 py-3 text-sm text-gray-300 ${isViolation ? 'text-red-400 font-bold' : ''}`}>
                  {new Date(trade.open_time).toLocaleDateString()}
                  <p className="text-xs opacity-75">{new Date(trade.open_time).toLocaleTimeString()}</p>
                </td>
                <td className={`px-4 py-3 text-sm text-gray-300 border-l border-white/5 ${isViolation ? 'text-red-400 font-bold' : ''}`}>
                  <div className="flex items-center space-x-2">
                    {isViolation && <AlertOctagon className="w-4 h-4 text-red-400" />}
                    <div>
                      {new Date(trade.close_time).toLocaleDateString()}
                      <p className="text-xs opacity-75">{new Date(trade.close_time).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  {isViolation && <p className="text-[10px] text-red-400 font-bold mt-1 uppercase">Scalping (&lt;60s)</p>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function TradingAccounts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [pendingAccounts, setPendingAccounts] = useState<AccountRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<TabType>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAccounts();
  }, [user]);

  const loadAccounts = async () => {
    try {
      const [accountsData, pendingData] = await Promise.all([
        getTradingAccounts(user!.id),
        getPendingAccounts(user!.id)
      ]);
      setAccounts(accountsData);
      setPendingAccounts(pendingData);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Failed to load trading accounts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/10 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/4"></div>
                <div className="h-4 bg-white/10 rounded w-1/3"></div>
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

  const activeAccounts = accounts.filter(acc => acc.status === 'active');
  const breachedAccounts = accounts.filter(acc => acc.status === 'breached');

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        
        <button
          onClick={() => navigate('/buy-account')}
          className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Buy Account
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex space-x-2">
        <button
          onClick={() => setSelectedTab('active')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedTab === 'active'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Active ({activeAccounts.length})
        </button>
        {pendingAccounts.length > 0 && (
          <button
            onClick={() => setSelectedTab('pending')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'pending'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Pending ({pendingAccounts.length})
          </button>
        )}
        {breachedAccounts.length > 0 && (
          <button
            onClick={() => setSelectedTab('breached')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'breached'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Breached ({breachedAccounts.length})
          </button>
        )}
      </div>

      {/* Selected Tab Content */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        {selectedTab === 'active' && (
          <AccountsTab accounts={activeAccounts} searchQuery={searchQuery} type="active" />
        )}
        {selectedTab === 'pending' && pendingAccounts.length > 0 && (
          <div className="space-y-4">
            {pendingAccounts.map((request) => (
              <div key={request.id} className="p-6 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[request.status as keyof typeof statusStyles] || statusStyles.pending}`}>
                    {statusIcons[request.status as keyof typeof statusIcons] || statusIcons.pending}
                    <span className="ml-2 text-sm font-medium capitalize">{request.status.replace('_', ' ')}</span>
                  </div>
                  {request.status === 'suspicious' && (
                    <div className="flex items-center text-orange-400 text-xs mt-1 italic">
                      <span>Under security review: {request.ai_reason || 'Manual verification required'}</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-400">
                    Created: {new Date(request.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Package</p>
                    <p className="text-white font-medium">{request.package.name}</p>
                    <p className="text-sm text-gray-400">Balance: ${request.package.balance.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Fee</p>
                    {request.amount < request.package.price ? (
                      <>
                        <p className="text-sm text-gray-400 line-through">${request.package.price.toLocaleString()}</p>
                        <p className="text-white font-medium">${request.amount.toLocaleString()}</p>
                        <p className="text-xs text-green-400 mt-1">
                          Saved ${(request.package.price - request.amount).toLocaleString()}!
                        </p>
                      </>
                    ) : (
                      <p className="text-white font-medium">${request.amount.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {selectedTab === 'breached' && breachedAccounts.length > 0 && (
          <AccountsTab accounts={breachedAccounts} searchQuery={searchQuery} type="breached" />
        )}
      </div>
    </div>
  );
}
