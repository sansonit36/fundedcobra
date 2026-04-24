import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  DollarSign,
  ArrowRight,
  AlertTriangle,
  Copy,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  PayoutRequest,
  PayoutStats,
  getPayoutStats,
  getPayoutHistory,
  createPayoutRequest,
  getActiveAccounts
} from '../lib/database';
import { supabase } from '../lib/supabase';

interface ActiveAccount {
  id: string;
  mt5_login: string;
  initial_equity: number;
  running_equity: number;
  available_for_payout: number;
  package_name?: string;
  created_rule_version?: string;
  has_25_percent_rule?: boolean;
  model_type?: string;
  current_phase?: number;
  payout_split_percent?: number;
  withdrawal_target_percent?: number;
  minimum_withdrawal_amount?: number;
  daily_payout_enabled?: boolean;
  weekly_payout_enabled?: boolean;
}

const statusStyles = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20',
  approved: 'bg-green-500/10 text-green-400 border-green-400/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-400/20'
};

const statusIcons = {
  pending: <Clock className="w-5 h-5 text-yellow-400" />,
  approved: <CheckCircle className="w-5 h-5 text-green-400" />,
  rejected: <XCircle className="w-5 h-5 text-red-400" />
};

/**
 * Computes the next upcoming Saturday.
 * If today is Saturday, returns next Saturday (7 days later).
 */
function getNextSaturday(): Date {
  const date = new Date();
  const day = date.getDay(); // 0=Sunday, 6=Saturday
  // If today is Saturday, offset 7; otherwise, calculate how many days until Saturday
  const offset = day === 6 ? 7 : (6 - day + 7) % 7;
  date.setDate(date.getDate() + offset);
  return date;
}

export default function Payouts() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([]);
  const [activeAccounts, setActiveAccounts] = useState<ActiveAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, historyData, accountsData] = await Promise.all([
        getPayoutStats(user!.id),
        getPayoutHistory(user!.id),
        getActiveAccounts(user!.id)
      ]);

      // Calculate total pending and approved payouts
      const pendingPayouts = historyData
        .filter(payout => payout.status === 'pending')
        .reduce((sum, payout) => sum + payout.amount, 0);
      const approvedPayouts = historyData
        .filter(payout => payout.status === 'approved')
        .reduce((sum, payout) => sum + payout.amount, 0);

      // Adjust available amount
      const adjustedStats = {
        ...statsData,
        availableForPayout: Math.max(
          0,
          statsData.availableForPayout - pendingPayouts
        )
      };

      setStats(adjustedStats);
      setPayoutHistory(historyData);
      setActiveAccounts(accountsData);
    } catch (err) {
      console.error('Error loading payout data:', err);
      setError('Failed to load payout information');
    } finally {
      setLoading(false);
    }
  };

  const validateTRC20Address = (address: string) => {
    // Basic USDT-TRC20 address validation
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
  };

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !walletAddress) return;

    if (!validateTRC20Address(walletAddress)) {
      setError('Please enter a valid USDT-TRC20 wallet address');
      return;
    }

    const account = activeAccounts.find(acc => acc.id === selectedAccount);
    if (!account) return;

    // Legacy accounts are determined ONLY by created_rule_version field
    const isLegacyAccount = account.created_rule_version === 'legacy';

    // BLOCK EVALUATION ACCOUNTS FROM WITHDRAWING
    const modelType = account.model_type || 'instant';
    const currentPhase = account.current_phase || 1;
    
    let isFunded = false;
    if (modelType === 'instant') isFunded = true;
    else if (modelType === '1_step' && currentPhase >= 2) isFunded = true;
    else if (modelType === '2_step' && currentPhase >= 3) isFunded = true;

    if (!isFunded) {
      setError(`Evaluation accounts are not eligible for payouts. You must reach the 'Funded' phase first.`);
      return;
    }

    // FIRST: Check Saturday requirement for legacy accounts (before any other validation)
    if (isLegacyAccount) {
      const dayOfWeek = new Date().getDay(); // 0=Sunday, 6=Saturday
      if (dayOfWeek !== 6) {
        const nextSat = getNextSaturday();
        setError(`Legacy accounts can only request payouts on Saturdays. Next payout date: ${nextSat.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`);
        return;
      }
    }

    // Also check for weekly-only accounts
    if (!isLegacyAccount && account.weekly_payout_enabled && !account.daily_payout_enabled) {
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek !== 6) {
        const nextSat = getNextSaturday();
        setError(`Weekly payout accounts can only request payouts on Saturdays. Next payout date: ${nextSat.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`);
        return;
      }
    }

    // Use rules from the account (already computed from master template)
    const withdrawalTargetPercent = account.withdrawal_target_percent || 5;
    if (isLegacyAccount) {
      // Legacy override
    } else if (modelType !== 'instant') {
      // For funded step accounts, use a lower buffer
    }

    const profitTarget = account.initial_equity * (withdrawalTargetPercent / 100);
    const currentProfit = account.running_equity - account.initial_equity;

    // Check if profit target is met
    if (currentProfit < profitTarget) {
      setError(`You must achieve at least ${withdrawalTargetPercent}% profit ($${profitTarget.toFixed(2)}) before requesting payout.`);
      return;
    }

    // Calculate payout amount based on dynamic profit split from master template
    const payoutPercent = account.payout_split_percent || 80;
    let requestAmount = currentProfit * (payoutPercent / 100);

    // Enforce maximum daily payout cap: 20% of initial equity
    const maxDailyCap = account.initial_equity * 0.20;
    
    // Check for today's payouts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayPayouts = payoutHistory.filter(p => {
      const payoutDate = new Date(p.createdAt);
      payoutDate.setHours(0, 0, 0, 0);
      return p.accountId === account.id && 
             (p.status === 'pending' || p.status === 'approved') &&
             payoutDate.getTime() === today.getTime();
    });

    // Check 1 payout per day rule
    if (todayPayouts.length > 0) {
      setError('You can only request one payout per day. Please try again tomorrow.');
      return;
    }

    const todayTotal = todayPayouts.reduce((sum, p) => sum + p.amount, 0);
    if (todayTotal + requestAmount > maxDailyCap) {
      requestAmount = Math.max(0, maxDailyCap - todayTotal);
      if (requestAmount === 0) {
        setError(`Daily payout cap reached. Maximum $${maxDailyCap.toFixed(2)} (20% of initial equity) per day.`);
        return;
      }
    }

    // Subtract pending payouts from available
    const pendingForAccount = payoutHistory
      .filter(p => p.accountId === account.id && p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const actualAvailable = requestAmount - pendingForAccount;
    if (actualAvailable <= 0) {
      setError('No funds available after pending payouts.');
      return;
    }

    // Use the actual available amount
    requestAmount = Math.min(requestAmount, actualAvailable);

    setSubmitting(true);
    setError(null);

    try {
      await createPayoutRequest(selectedAccount, requestAmount, walletAddress);
      await loadData(); // Refresh data after submission
      setSuccess(`Payout request of $${requestAmount.toFixed(2)} submitted successfully!`);
      setShowRequestForm(false);
      setSelectedAccount('');
      setAmount('');
      setWalletAddress('');
    } catch (err) {
      console.error('Error creating payout request:', err);
      setError(err instanceof Error ? err.message : 'Failed to create payout request');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Compute next upcoming Saturday
  const nextSaturday = getNextSaturday();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card-gradient rounded-2xl p-6 border border-white/5">
              <div className="animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-white/10 mb-4"></div>
                <div className="h-4 bg-white/10 rounded w-24 mb-1"></div>
                <div className="h-6 bg-white/10 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
          <span className="text-green-400">{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Available for Payout */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-400" />
            </div>
            <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400">
              Dynamic Profit Split
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Total Available for Payout</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">
              ${(stats?.availableForPayout || 0).toLocaleString()}
            </h3>
            <span className="text-sm text-gray-400">.00</span>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <Calculator className="w-4 h-4 mr-1 text-primary-400" />
            <span>Across all active accounts</span>
          </div>
        </div>

        {/* Total Paid Out */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
              Total
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Total Paid Out</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">
              ${(stats?.totalPaidOut || 0).toLocaleString()}
            </h3>
            <span className="text-sm text-gray-400">.00</span>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <TrendingUp className="w-4 h-4 mr-1 text-green-400" />
            <span>Lifetime payouts</span>
          </div>
        </div>
      </div>

      {/* Active Accounts with Payout Schedules */}
      {activeAccounts.length > 0 && (
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <h2 className="text-xl font-bold text-white mb-4">Your Accounts & Payout Schedules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAccounts.map((account) => {
              // Legacy accounts are determined ONLY by created_rule_version field
              // After Nov 18, 2025: created_rule_version = 'v2' (5% target)
              // Before Nov 18, 2025: created_rule_version = 'legacy' (10% target)
              const isLegacyAccount = account.created_rule_version === 'legacy';
              const currentProfit = account.running_equity - account.initial_equity;
              const modelType = account.model_type || 'instant';
              const modelColor = modelType === 'instant' ? '#bd4dd6' : modelType === '1_step' ? '#3B82F6' : '#10B981';
              const modelLabel = modelType === 'instant' ? 'Instant' : modelType === '1_step' ? '1-Step' : '2-Step';
              const splitPercent = account.payout_split_percent || 80;
              const withdrawalTarget = account.withdrawal_target_percent || 5;
              
              // Calculate next payout date based on rules
              const getNextPayoutInfo = () => {
                if (isLegacyAccount) {
                  const nextSat = getNextSaturday();
                  return { 
                    text: `Legacy: ${nextSat.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`, 
                    color: 'text-gray-400',
                    detail: `${withdrawalTarget}% target, Weekly Saturday payouts`
                  };
                }
                
                const daily = account.daily_payout_enabled;
                const weekly = account.weekly_payout_enabled;
                
                if (daily && weekly) {
                  return { text: 'Daily + Weekly', color: 'text-green-400', detail: 'Request daily, processed weekly' };
                } else if (daily) {
                  return { text: 'Daily Requests Available', color: 'text-green-400', detail: 'Processed every day' };
                } else if (weekly) {
                  const nextSat = getNextSaturday();
                  return { text: `Weekly: ${nextSat.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`, color: 'text-purple-400', detail: 'Next Saturday' };
                }
                return { text: 'Not Configured', color: 'text-gray-400' };
              };
              
              const payoutInfo = getNextPayoutInfo();
              
              return (
                <div key={account.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary-500/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">MT5 #{account.mt5_login}</h3>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest" style={{ backgroundColor: `${modelColor}20`, color: modelColor }}>
                      {modelLabel}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Available:</span>
                      <span className="text-green-400 font-bold">${account.available_for_payout.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-400">Profit:</span>
                      <span className={currentProfit >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>${currentProfit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Profit Split:</span>
                      <span className="text-white font-bold">{splitPercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Withdrawal Target:</span>
                      <span className="text-white">{withdrawalTarget}%</span>
                    </div>
                    
                    <div className="pt-2 mt-2 border-t border-white/10">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 text-primary-400" />
                        <span className={`text-xs font-medium ${payoutInfo.color}`}>{payoutInfo.text}</span>
                      </div>
                      {payoutInfo.detail && (
                        <p className="text-xs text-gray-500 mt-1 ml-5">{payoutInfo.detail}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payout History */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Payout History</h2>
          <button
            onClick={() => setShowRequestForm(true)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
          >
            Request Payout
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                <th className="pb-3 text-left text-gray-400 font-medium">ID</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Amount</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Date</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Wallet</th>
              </tr>
            </thead>
            <tbody>
              {payoutHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No payout history found
                  </td>
                </tr>
              ) : (
                payoutHistory.map((request: any) => {
                  // Handle both snake_case (from DB) and camelCase (from interface)
                  const createdDate = new Date(request.created_at || request.createdAt);
                  const processedDate = request.processed_at || request.processedAt 
                    ? new Date(request.processed_at || request.processedAt) 
                    : null;
                  const status = request.status as 'pending' | 'approved' | 'rejected';

                  return (
                    <tr key={request.id} className="border-b border-gray-700/50 hover:bg-white/5">
                      <td className="py-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[status]}`}>
                          {statusIcons[status]}
                          <span className="ml-2 text-sm font-medium capitalize">
                            {status}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-medium text-white">{request.id}</div>
                        <div className="text-sm text-gray-400">Account #{request.account_id || request.accountId}</div>
                      </td>
                      <td className="py-4">
                        <div className="font-medium text-white">
                          ${request.amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-medium text-white">
                          {isNaN(createdDate.getTime())
                            ? 'Invalid Date'
                            : createdDate.toLocaleDateString()}
                        </div>
                        {processedDate && (
                          <div className="text-sm text-gray-400">
                            Processed:{' '}
                            {isNaN(processedDate.getTime())
                              ? 'Invalid Date'
                              : processedDate.toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        {(request.wallet_address || request.walletAddress) && (
                          <div className="flex items-center space-x-2">
                            <code className="font-medium text-primary-400">
                              {formatWalletAddress(request.wallet_address || request.walletAddress)}
                            </code>
                            <button
                              onClick={() => copyToClipboard(request.wallet_address || request.walletAddress)}
                              className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                            >
                              {showCopied ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Request Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Request Payout</h3>
              <button
                onClick={() => setShowRequestForm(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            {/* Error message in modal */}
            {error && (
              <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}
            
            <form onSubmit={handlePayoutRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Trading Account
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                >
                  <option value="">Select Account</option>
                  {activeAccounts.map((account) => {
                    const currentProfit = account.running_equity - account.initial_equity;
                    // Use the available_for_payout that already has pending deducted
                    const availableAmount = account.available_for_payout;
                    
                    return (
                      <option
                        key={account.id}
                        value={account.id}
                        disabled={availableAmount <= 0}
                      >
                        MT5 #{account.mt5_login} - $
                        {availableAmount.toFixed(2)} available
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedAccount && (() => {
                const account = activeAccounts.find(acc => acc.id === selectedAccount);
                if (!account) return null;
                
                // Legacy accounts are determined ONLY by created_rule_version field
                const isLegacyAccount = account.created_rule_version === 'legacy';
                const currentProfit = account.running_equity - account.initial_equity;
                
                // Use dynamic rules from account
                const withdrawalTargetPercent = account.withdrawal_target_percent || 5;
                const profitTarget = account.initial_equity * (withdrawalTargetPercent / 100);
                
                // Calculate payout percentage from master template
                const payoutPercentage = account.payout_split_percent || 80;
                
                // Use the available_for_payout from account (already has pending deducted)
                const finalAvailable = account.available_for_payout;
                
                // Calculate pending for display purposes
                const pendingForAccount = payoutHistory
                  .filter(p => p.accountId === account.id && p.status === 'pending')
                  .reduce((sum, p) => sum + p.amount, 0);
                
                // Apply 20% daily cap
                const maxDailyCap = account.initial_equity * 0.20;
                const cappedAvailable = Math.min(finalAvailable, maxDailyCap);
                
                // Auto-set the amount to cappedAvailable
                if (amount !== cappedAvailable.toFixed(2)) {
                  setAmount(cappedAvailable.toFixed(2));
                }
                
                return (
                  <div className="p-4 rounded-lg bg-primary-500/10 border border-primary-500/20">
                    <div className="flex items-start space-x-3">
                      <Calculator className="w-5 h-5 text-primary-400 mt-0.5" />
                      <div className="w-full">
                        <p className="text-primary-400 font-medium">Account Details</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-gray-300">
                            Account Package: <span className="text-white font-medium">{packageName}</span>
                          </p>
                          <p className="text-gray-300">
                            Initial Equity: <span className="text-white font-medium">${account.initial_equity.toLocaleString()}</span>
                          </p>
                          <p className="text-gray-300">
                            Current Equity: <span className="text-white font-medium">${account.running_equity.toLocaleString()}</span>
                          </p>
                          <p className="text-gray-300">
                            Current Profit: <span className="text-white font-medium">${currentProfit.toFixed(2)}</span>
                          </p>
                          <p className="text-gray-400 text-xs mt-2 pt-2 border-t border-white/10">
                            Profit Target: {withdrawalTargetPercent}% (${profitTarget.toFixed(2)}) | 
                            {currentProfit >= profitTarget ? 
                              <span className="text-green-400"> ✓ Target Met</span> : 
                              <span className="text-yellow-400"> ${(profitTarget - currentProfit).toFixed(2)} to go</span>
                            }
                          </p>
                          {account.has_25_percent_rule && (
                            <p className="text-yellow-400 text-xs font-semibold">
                              ⚠️ 25% Rule Active - You receive 25% of profits
                            </p>
                          )}
                          {pendingForAccount > 0 && (
                            <p className="text-yellow-400 text-xs">
                              Pending Payout: -${pendingForAccount.toFixed(2)}
                            </p>
                          )}
                          <p className="text-green-400 font-semibold mt-2">
                            Available for Withdrawal ({payoutPercentage}% of profit): <span className="text-white text-lg">${cappedAvailable.toFixed(2)}</span>
                          </p>
                          <p className="text-gray-400 text-xs">
                            Max Daily Cap: ${maxDailyCap.toFixed(2)} (20% of initial equity)
                          </p>
                          {/* Show payout schedule based on account type */}
                          {isLegacyAccount ? (
                            <p className="text-gray-400 text-xs">
                              Payout Schedule: <span className="text-purple-400 font-medium">Weekly (Saturdays only)</span>
                            </p>
                          ) : (
                            <p className="text-gray-400 text-xs">
                              Payout Schedule: {account.daily_payout_enabled && account.weekly_payout_enabled ? 'Daily + Weekly' : 
                                               account.daily_payout_enabled ? 'Daily' : 
                                               account.weekly_payout_enabled ? 'Weekly (Saturdays)' : 'Not Configured'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Amount (Auto-Calculated)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-gray-400">$</span>
                  <input
                    type="text"
                    value={amount}
                    readOnly
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none cursor-not-allowed opacity-80"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Amount is automatically calculated based on your profit and account rules
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  USDT-TRC20 Wallet Address
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter your USDT-TRC20 wallet address"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Must be a valid USDT-TRC20 wallet address starting with 'T'
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedAccount || !amount || !walletAddress}
                className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
