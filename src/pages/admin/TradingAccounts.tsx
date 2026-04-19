import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, EyeOff, Copy, AlertTriangle, CheckCircle, AlertOctagon, XCircle, TrendingUp, Calendar, Wallet, History, Info, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sendEmail, logEmailSent } from '../../lib/emailService';

interface TradingAccount {
  id: string;
  user_id: string;
  mt5_login: string;
  mt5_password: string;
  mt5_server: string;
  balance: number;
  equity: number;
  status: 'active' | 'suspended' | 'breached';
  breach_reason?: string;
  created_at: string;
  updated_at: string;
  has_25_percent_rule?: boolean;
  user_name?: string;
  user_email?: string;
  package_name?: string;
}

interface ExtendedAccountData {
  mt5_id: string;
  client_name: string;
  running_balance: number;
  running_equity: number;
  initial_equity: number;
  last_updated: string;
  daily_drawdown_limit: number;
  overall_drawdown_limit: number;
  weekly_profit_target: number;
  largest_single_trade_profit_week: number;
  trades_under_60s_week: number;
}

const statusStyles = {
  active: 'bg-green-500/10 text-green-400 border-green-400/20',
  suspended: 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20',
  breached: 'bg-red-500/10 text-red-400 border-red-400/20'
};

const statusIcons = {
  active: <CheckCircle className="w-5 h-5 text-green-400" />,
  suspended: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  breached: <AlertOctagon className="w-5 h-5 text-red-400" />
};

export default function TradingAccounts() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [extendedData, setExtendedData] = useState<Record<string, ExtendedAccountData>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showBreachModal, setShowBreachModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'trades'>('overview');
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | null>(null);
  const [breachReason, setBreachReason] = useState('');
  const [customBreachReason, setCustomBreachReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      
      // First, get accounts with user profiles
      const { data, error: fetchError } = await supabase
        .from('trading_accounts')
        .select(`
          *,
          profiles!trading_accounts_user_id_fkey (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching accounts:', fetchError);
        throw fetchError;
      }
      
      // Get package names from account_classification
      const mt5Ids = (data || []).map(acc => acc.mt5_login);
      let packageMap: Record<string, string> = {};
      
      if (mt5Ids.length > 0) {
        const { data: classificationData, error: classError } = await supabase
          .from('account_classification')
          .select('mt5_login, package_name')
          .in('mt5_login', mt5Ids);
        
        console.log('Classification data:', classificationData);
        
        if (!classError && classificationData) {
          packageMap = classificationData.reduce((acc, item) => ({
            ...acc,
            [item.mt5_login]: item.package_name
          }), {});
        } else if (classError) {
          console.error('Classification error:', classError);
        }
      }
      
      // Transform data to include user details and package names
      const accountsWithUsers = (data || []).map(account => ({
        ...account,
        user_name: account.profiles?.name || 'N/A',
        user_email: account.profiles?.email || 'N/A',
        package_name: packageMap[account.mt5_login] || 'N/A'
      }));
      
      setAccounts(accountsWithUsers);
      
      // Load extended data for all accounts
      await loadExtendedData(accountsWithUsers);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Failed to load trading accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadExtendedData = async (accountsList: TradingAccount[]) => {
    try {
      const mt5Ids = accountsList.map(acc => acc.mt5_login);
      
      if (mt5Ids.length === 0) return;

      const { data, error } = await supabase
        .from('account_data_extended')
        .select('mt5_id, client_name, running_balance, running_equity, initial_equity, last_updated, daily_drawdown_limit, overall_drawdown_limit, weekly_profit_target, largest_single_trade_profit_week, trades_under_60s_week')
        .in('mt5_id', mt5Ids);

      if (error) {
        console.error('Error fetching extended data:', error);
        return;
      }

      console.log('Extended data loaded:', data);

      const dataMap = (data || []).reduce((acc, item) => ({
        ...acc,
        [item.mt5_id]: item
      }), {});

      setExtendedData(dataMap);
    } catch (err) {
      console.error('Error loading extended data:', err);
    }
  };

  const togglePasswordVisibility = (accountId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggle25PercentRule = async (accountId: string, currentValue: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('trading_accounts')
        .update({ has_25_percent_rule: !currentValue })
        .eq('id', accountId);

      if (updateError) throw updateError;
      
      // Reload accounts
      await loadAccounts();
    } catch (err) {
      console.error('Error updating 25% rule:', err);
      setError('Failed to update 25% rule');
    }
  };

  const handleBreachClick = (account: TradingAccount) => {
    setSelectedAccount(account);
    setShowBreachModal(true);
  };

  const handleViewClick = (account: TradingAccount) => {
    setSelectedAccount(account);
    setShowViewModal(true);
  };

  const handleBreach = async () => {
    if (!selectedAccount) return;
    setProcessing(true);
    setError(null);
    
    try {
      const { error: breachError } = await supabase
        .from('trading_accounts')
        .update({
          status: 'breached',
          breach_reason: breachReason === 'custom' ? customBreachReason : breachReason
        })
        .eq('id', selectedAccount.id);

      if (breachError) throw breachError;

      // Send breach notification email
      try {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', selectedAccount.user_id)
          .single();

        if (userProfile) {
          await sendEmail({
            to: userProfile.email,
            template: 'account_breached',
            data: {
              name: userProfile.name,
              breachReason: breachReason === 'custom' ? customBreachReason : breachReason,
              accountLogin: selectedAccount.mt5_login
            }
          });
          await logEmailSent(selectedAccount.user_id, 'account_breached');
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }

      await loadAccounts();
      setShowBreachModal(false);
      setSelectedAccount(null);
      setBreachReason('');
      setCustomBreachReason('');
    } catch (err) {
      console.error('Error breaching account:', err);
      setError('Failed to breach account');
    } finally {
      setProcessing(false);
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.mt5_login.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (account.user_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (account.user_email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || account.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Trading Accounts</h1>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 focus:outline-none focus:border-blue-500/50"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="breached">Rule Violations (Breached)</option>
              </select>
              <Filter className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <button
              onClick={async () => {
                if (window.confirm('Run global compliance audit on ALL accounts? This will re-scan all history.')) {
                  try {
                    setProcessing(true);
                    const { data, error } = await supabase.rpc('run_global_compliance_audit');
                    if (error) throw error;
                    alert(`Audit Complete!\nNew Breaches Found: ${data.new_breaches_found}\nTotal Accounts Audited: ${data.accounts_processed}`);
                    loadAccounts();
                  } catch (err) {
                    alert('Error running audit: ' + err.message);
                  } finally {
                    setProcessing(false);
                  }
                }
              }}
              disabled={processing}
              className="flex items-center px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium rounded-lg transition-colors border border-blue-500/20 shadow-lg shadow-blue-500/5 group"
            >
              <Shield className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              {processing ? 'Auditing...' : 'Global Audit'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                <th className="pb-3 text-left text-gray-400 font-medium">User</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Package</th>
                <th className="pb-3 text-left text-gray-400 font-medium">MT5 Login</th>
                <th className="pb-3 text-left text-gray-400 font-medium">MT5 Password</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Server</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Running Balance</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Running Equity</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Daily DD</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Overall DD</th>
                <th className="pb-3 text-left text-gray-400 font-medium">25% Rule</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Created</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Breach Reason</th>
                <th className="pb-3 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-8 text-center text-gray-400">
                    No trading accounts found
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => {
                  const extended = extendedData[account.mt5_login];
                  const currentProfit = extended ? extended.running_equity - extended.initial_equity : 0;
                  
                  // Calculate drawdown consumed/remaining
                  const initialEquity = extended?.initial_equity || 0;
                  const runningEquity = extended?.running_equity || 0;
                  
                  // Daily drawdown: 8% of initial equity (reset at 2 AM PKT)
                  // For now, we calculate based on difference from initial equity
                  const dailyLimit = initialEquity * 0.08;
                  const currentDailyDrawdown = Math.max(0, initialEquity - runningEquity);
                  const dailyConsumedPercent = dailyLimit > 0 ? (currentDailyDrawdown / dailyLimit) * 100 : 0;
                  const dailyRemaining = Math.max(0, dailyLimit - currentDailyDrawdown);
                  
                  // Overall drawdown: 12% of initial equity (never resets)
                  const overallLimit = initialEquity * 0.12;
                  const currentOverallDrawdown = Math.max(0, initialEquity - runningEquity);
                  const overallConsumedPercent = overallLimit > 0 ? (currentOverallDrawdown / overallLimit) * 100 : 0;
                  const overallRemaining = Math.max(0, overallLimit - currentOverallDrawdown);
                  
                  return (
                  <tr key={account.id} className="border-b border-gray-700/50 hover:bg-white/5">
                    <td className="py-4">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[account.status]}`}>
                        {statusIcons[account.status]}
                        <span className="ml-2 text-sm font-medium capitalize">{account.status}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div>
                        <div className="font-medium text-white">{account.user_name}</div>
                        <div className="text-sm text-gray-400">{account.user_email}</div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-white font-medium">{account.package_name}</div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center space-x-2">
                        <code className="text-blue-400 font-medium">{account.mt5_login}</code>
                        <button
                          onClick={() => copyToClipboard(account.mt5_login)}
                          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4">
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
                    </td>
                    <td className="py-4">
                      <div className="flex items-center space-x-2">
                        <code className="text-blue-400 font-medium">{account.mt5_server}</code>
                        <button
                          onClick={() => copyToClipboard(account.mt5_server)}
                          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-white">${(extended?.running_balance || 0).toLocaleString()}</div>
                      {extended?.last_updated && (
                        <div className="text-xs text-gray-400">Updated: {new Date(extended.last_updated).toLocaleTimeString()}</div>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-white">${(extended?.running_equity || 0).toLocaleString()}</div>
                      {currentProfit !== 0 && extended && (
                        <div className={`text-xs ${currentProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {currentProfit > 0 ? '+' : ''}${currentProfit.toFixed(2)} profit
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      <div>
                        <div className="text-sm font-medium text-white">${dailyRemaining.toFixed(2)}</div>
                        <div className={`text-xs ${dailyConsumedPercent > 50 ? 'text-red-400' : 'text-gray-400'}`}>
                          {dailyConsumedPercent.toFixed(1)}% used
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div>
                        <div className="text-sm font-medium text-white">${overallRemaining.toFixed(2)}</div>
                        <div className={`text-xs ${overallConsumedPercent > 50 ? 'text-red-400' : 'text-gray-400'}`}>
                          {overallConsumedPercent.toFixed(1)}% used
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => toggle25PercentRule(account.id, account.has_25_percent_rule || false)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          account.has_25_percent_rule 
                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                            : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                        }`}
                      >
                        {account.has_25_percent_rule ? '✓ Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-4">
                      <div className="text-gray-300">
                        {new Date(account.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4">
                      {account.status === 'breached' && account.breach_reason ? (
                        <div className="text-red-400">{account.breach_reason}</div>
                      ) : (
                        <div className="text-gray-400">-</div>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewClick(account)}
                          className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </button>
                        {account.status === 'active' && (
                          <button
                            onClick={() => handleBreachClick(account)}
                            className="inline-flex items-center px-3 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors text-sm font-medium"
                          >
                            <AlertOctagon className="w-4 h-4 mr-1" />
                            Breach
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breach Account Modal */}
      {showBreachModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Breach Account</h2>
              <button
                onClick={() => {
                  setShowBreachModal(false);
                  setSelectedAccount(null);
                  setBreachReason('');
                  setCustomBreachReason('');
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-start space-x-3">
                  <AlertOctagon className="w-5 h-5 text-orange-400 mt-0.5" />
                  <div>
                    <p className="text-orange-400 font-medium">Warning</p>
                    <p className="text-sm text-gray-300">
                      Breaching an account will immediately terminate all trading access and freeze the account.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-gray-400 mb-4">MT5 Account Details</p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-sm text-gray-400">Login ID</p>
                    <p className="text-white font-medium">{selectedAccount.mt5_login}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-sm text-gray-400">Balance</p>
                    <p className="text-white font-medium">${selectedAccount.balance.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Select Breach Reason
                </label>
                <select
                  value={breachReason}
                  onChange={(e) => setBreachReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/50"
                >
                  <option value="">Select a reason</option>
                  {[
                    'Excessive risk taking',
                    'Trading rules violation',
                    'Suspicious trading pattern',
                    'Multiple account violation',
                    'Manipulation attempt',
                    'Daily drawdown limit exceeded',
                    'Overall drawdown limit exceeded'
                  ].map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                  <option value="custom">Custom Reason</option>
                </select>
              </div>

              {breachReason === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Custom Reason
                  </label>
                  <textarea
                    value={customBreachReason}
                    onChange={(e) => setCustomBreachReason(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
                    placeholder="Enter custom breach reason"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowBreachModal(false);
                    setSelectedAccount(null);
                    setBreachReason('');
                    setCustomBreachReason('');
                  }}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBreach}
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!breachReason || (breachReason === 'custom' && !customBreachReason) || processing}
                >
                  {processing ? 'Processing...' : 'Confirm Breach'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Account Details Modal */}
      {showViewModal && selectedAccount && (() => {
        const extended = extendedData[selectedAccount.mt5_login];
        const currentProfit = extended ? extended.running_equity - extended.initial_equity : 0;
        const profitPercent = extended && extended.initial_equity > 0 
          ? (currentProfit / extended.initial_equity * 100) 
          : 0;
        
        // Use extended data if available
        const displayBalance = extended?.running_balance || 0;
        const displayEquity = extended?.running_equity || 0;
        const displayInitial = extended?.initial_equity || 0;
        
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-4xl w-full border border-white/10 my-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Account Details</h2>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedAccount(null);
                    setActiveModalTab('overview');
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-4 mb-6 border-b border-white/10">
                <button
                  onClick={() => setActiveModalTab('overview')}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeModalTab === 'overview' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Account Details
                  {activeModalTab === 'overview' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
                  )}
                </button>
                <button
                  onClick={() => setActiveModalTab('trades')}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeModalTab === 'trades' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Trade History
                  {activeModalTab === 'trades' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
                  )}
                </button>
              </div>

              <div className="space-y-6">
                {activeModalTab === 'overview' ? (
                  <div className="space-y-6">
                {/* User Information */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">User Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Name</p>
                      <p className="text-white font-medium">{selectedAccount.user_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Email</p>
                      <p className="text-white font-medium">{selectedAccount.user_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">User ID</p>
                      <p className="text-white font-mono text-sm">{selectedAccount.user_id}</p>
                    </div>
                  </div>
                </div>

                {/* Status and Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-sm text-gray-400 mb-2">Status</p>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[selectedAccount.status]}`}>
                      {statusIcons[selectedAccount.status]}
                      <span className="ml-2 text-sm font-medium capitalize">{selectedAccount.status}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-sm text-gray-400 mb-2">25% Rule Status</p>
                    <div className={`inline-flex items-center px-3 py-2 rounded-lg ${selectedAccount.has_25_percent_rule ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {selectedAccount.has_25_percent_rule ? '✓ Active (25% payout)' : 'Inactive (50% payout)'}
                    </div>
                  </div>
                </div>

                {/* MT5 Credentials */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">MT5 Credentials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-2">MT5 Login</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-blue-400 font-medium">{selectedAccount.mt5_login}</code>
                        <button
                          onClick={() => copyToClipboard(selectedAccount.mt5_login)}
                          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-2">MT5 Password</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-blue-400 font-medium">
                          {showPasswords[selectedAccount.id] ? selectedAccount.mt5_password : '••••••••'}
                        </code>
                        <button
                          onClick={() => togglePasswordVisibility(selectedAccount.id)}
                          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                        >
                          {showPasswords[selectedAccount.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {showPasswords[selectedAccount.id] && (
                          <button
                            onClick={() => copyToClipboard(selectedAccount.mt5_password)}
                            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-2">MT5 Server</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-blue-400 font-medium">{selectedAccount.mt5_server}</code>
                        <button
                          onClick={() => copyToClipboard(selectedAccount.mt5_server)}
                          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Account Metrics */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                  <div className="flex items-center mb-4">
                    <TrendingUp className="w-5 h-5 text-blue-400 mr-2" />
                    <h3 className="text-lg font-semibold text-white">Real-Time Metrics</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Initial Equity</p>
                      <p className="text-xl font-bold text-white">${displayInitial.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Running Balance</p>
                      <p className="text-xl font-bold text-white">${displayBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Running Equity</p>
                      <p className="text-xl font-bold text-white">${displayEquity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Current Profit</p>
                      <p className={`text-xl font-bold ${currentProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {currentProfit >= 0 ? '+' : ''}${currentProfit.toFixed(2)}
                      </p>
                      {extended && (
                        <p className={`text-xs ${profitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                  {extended?.last_updated && (
                    <p className="text-xs text-gray-400 mt-3 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      Last Updated: {new Date(extended.last_updated).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Drawdown Limits */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Drawdown Limits (Daily Resets at 2 AM PKT)</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-sm text-gray-400">Daily Drawdown (8% of initial equity)</p>
                        <div className="text-right">
                          <p className="text-sm text-yellow-400 font-medium">
                            {(() => {
                              const dailyLimit = displayInitial * 0.08;
                              const currentDD = Math.max(0, displayInitial - displayEquity);
                              const percentUsed = dailyLimit > 0 ? (currentDD / dailyLimit) * 100 : 0;
                              return `${percentUsed.toFixed(2)}% used`;
                            })()}
                          </p>
                          <p className="text-xs text-gray-400">
                            ${Math.max(0, displayInitial - displayEquity).toFixed(2)} / ${(displayInitial * 0.08).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`absolute top-0 left-0 h-full ${(() => {
                            const dailyLimit = displayInitial * 0.08;
                            const currentDD = Math.max(0, displayInitial - displayEquity);
                            const percentUsed = dailyLimit > 0 ? (currentDD / dailyLimit) * 100 : 0;
                            return percentUsed > 80 ? 'bg-red-500' : 'bg-yellow-500';
                          })()}`}
                          style={{ 
                            width: `${Math.min(100, (() => {
                              const dailyLimit = displayInitial * 0.08;
                              const currentDD = Math.max(0, displayInitial - displayEquity);
                              return dailyLimit > 0 ? (currentDD / dailyLimit) * 100 : 0;
                            })())}%` 
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-green-400 mt-1">
                        Remaining: ${Math.max(0, (displayInitial * 0.08) - (displayInitial - displayEquity)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-sm text-gray-400">Overall Drawdown (12% of initial equity)</p>
                        <div className="text-right">
                          <p className="text-sm text-red-400 font-medium">
                            {(() => {
                              const overallLimit = displayInitial * 0.12;
                              const currentDD = Math.max(0, displayInitial - displayEquity);
                              const percentUsed = overallLimit > 0 ? (currentDD / overallLimit) * 100 : 0;
                              return `${percentUsed.toFixed(2)}% used`;
                            })()}
                          </p>
                          <p className="text-xs text-gray-400">
                            ${Math.max(0, displayInitial - displayEquity).toFixed(2)} / ${(displayInitial * 0.12).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`absolute top-0 left-0 h-full ${(() => {
                            const overallLimit = displayInitial * 0.12;
                            const currentDD = Math.max(0, displayInitial - displayEquity);
                            const percentUsed = overallLimit > 0 ? (currentDD / overallLimit) * 100 : 0;
                            return percentUsed > 80 ? 'bg-red-500' : 'bg-orange-500';
                          })()}`}
                          style={{ 
                            width: `${Math.min(100, (() => {
                              const overallLimit = displayInitial * 0.12;
                              const currentDD = Math.max(0, displayInitial - displayEquity);
                              return overallLimit > 0 ? (currentDD / overallLimit) * 100 : 0;
                            })())}%` 
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-green-400 mt-1">
                        Remaining: ${Math.max(0, (displayInitial * 0.12) - (displayInitial - displayEquity)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account History */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Account History</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Created</p>
                      <p className="text-white font-medium">{new Date(selectedAccount.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                      <p className="text-white font-medium">{new Date(selectedAccount.updated_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Breach Reason if applicable */}
                {selectedAccount.status === 'breached' && selectedAccount.breach_reason && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center">
                      <AlertOctagon className="w-5 h-5 mr-2" />
                      Breach Reason
                    </h3>
                    <p className="text-red-300">{selectedAccount.breach_reason}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <History className="w-5 h-5 mr-2 text-blue-400" />
                  Trade Audit Log
                </h3>
                <div className="mt-4">
                  <TradeHistoryTable mt5Id={selectedAccount.mt5_login} />
                </div>
              </div>
            )}
          </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedAccount(null);
                  }}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function TradeHistoryTable({ mt5Id }: { mt5Id: string }) {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrades = async () => {
      try {
        const { data, error } = await supabase
          .from('trade_history')
          .select('*')
          .eq('mt5_id', mt5Id)
          .order('close_time', { ascending: false })
          .limit(50);

        if (error) throw error;
        setTrades(data || []);
      } catch (err) {
        console.error('Error loading trades:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTrades();
  }, [mt5Id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 italic">No trading history found for this account.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full text-left border-collapse">
        <thead className="bg-white/5">
          <tr>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Symbol</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Volume</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Profit</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Open Time</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Close Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {trades.map((trade) => {
            const duration = Math.abs(new Date(trade.close_time).getTime() - new Date(trade.open_time).getTime()) / 1000;
            return (
              <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm font-bold text-white uppercase">{trade.symbol}</span>
                  <p className="text-[10px] text-gray-500">#{trade.ticket}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    trade.type.toLowerCase() === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {trade.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300 font-medium">{trade.volume.toFixed(2)}</td>
                <td className={`px-4 py-3 text-sm font-bold ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className={`px-4 py-3 ${duration < 60 ? 'bg-red-500/10' : ''}`}>
                  <div className={`flex items-center space-x-2 text-sm ${duration < 60 ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                    {duration < 60 && <Shield className="w-4 h-4" />}
                    <span>{Math.floor(duration / 60)}m {Math.floor(duration % 60)}s</span>
                  </div>
                </td>
                <td className={`px-4 py-3 text-sm text-gray-300 ${duration < 60 ? 'bg-red-500/10' : ''}`}>
                  {new Date(trade.open_time).toLocaleDateString()}
                  <p className="text-xs opacity-75">{new Date(trade.open_time).toLocaleTimeString()}</p>
                </td>
                <td className={`px-4 py-3 text-sm text-gray-300 ${duration < 60 ? 'bg-red-500/10' : ''}`}>
                  {new Date(trade.close_time).toLocaleDateString()}
                  <p className="text-xs opacity-75">{new Date(trade.close_time).toLocaleTimeString()}</p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
