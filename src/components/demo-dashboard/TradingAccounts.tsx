import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, AlertTriangle, User, Copy, Eye, EyeOff, DollarSign, Target, TrendingDown, Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TradingAccount } from '../../types';
import { supabase } from '../../lib/supabase';

interface AccountRequest {
  id: string;
  package: {
    name: string;
    balance: number;
    price: number;
  };
  status: 'pending_payment' | 'payment_submitted';
  created_at: string;
  amount: number;
}

interface CombinedAccount {
  id: string;
  type: 'account' | 'request';
  status: string;
  balance: number;
  equity?: number;
  startingBalance?: number;
  currentProfit?: number;
  mt5Login?: string;
  mt5Password?: string;
  mt5Server?: string;
  dailyLossLimit?: number;
  overallLossLimit?: number;
  tradingDays?: number;
  weeklyTarget?: number;
  createdAt: string;
  updatedAt?: string;
  packageName?: string;
  modelType?: 'instant' | '1_step' | '2_step';
  currentPhase?: number;
}

const statusStyles = {
  active: 'bg-green-500/10 text-green-400 border-green-400/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20',
  breached: 'bg-red-500/10 text-red-400 border-red-400/20',
  rejected: 'bg-gray-500/10 text-gray-400 border-gray-400/20',
  pending_payment: 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20',
  payment_submitted: 'bg-primary-500/10 text-primary-400 border-primary-400/20',
  suspicious: 'bg-orange-500/10 text-orange-400 border-orange-400/20'
};

const statusIcons = {
  active: <CheckCircle className="w-5 h-5 text-green-400" />,
  pending: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  breached: <XCircle className="w-5 h-5 text-red-400" />,
  rejected: <XCircle className="w-5 h-5 text-gray-400" />,
  pending_payment: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  payment_submitted: <AlertTriangle className="w-5 h-5 text-primary-400" />,
  suspicious: <Clock className="w-5 h-5 text-orange-400" />
};

export default function TradingAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<CombinedAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, any>>({});

  useEffect(() => {
    loadAccountsAndRequests();
  }, [user]);

  const loadAccountsAndRequests = async () => {
    try {
      // Fetch trading accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('trading_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      // Fetch pending account requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('account_requests')
        .select(`
          *,
          package:account_packages (
            name,
            balance,
            price
          )
        `)
        .in('status', ['pending_payment', 'payment_submitted', 'suspicious'])
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch existing reviews
      const { data: reviewsData } = await supabase
        .from('evaluation_reviews')
        .select('*');
      
      const reviewsMap: Record<string, any> = {};
      (reviewsData || []).forEach(r => {
        reviewsMap[r.account_id] = r;
      });
      setReviews(reviewsMap);

      // Combine accounts and requests
      const combinedAccounts: CombinedAccount[] = [
        ...(accountsData || []).map(account => ({
          ...account,
          type: 'account' as const,
          createdAt: account.created_at,
          updatedAt: account.updated_at,
          modelType: account.model_type,
          currentPhase: account.current_phase
        })),
        ...(requestsData || []).map(request => ({
          id: request.id,
          type: 'request' as const,
          status: request.status,
          balance: request.package.balance,
          createdAt: request.created_at,
          packageName: request.package.name
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setAccounts(combinedAccounts);
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
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

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || account.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const handleRequestReview = async (account: CombinedAccount) => {
    if (!user || submittingReview) return;
    
    // Simple calculation for current profit %
    const startingBalance = account.startingBalance || account.balance;
    const currentEquity = account.equity || account.balance;
    const profit = currentEquity - startingBalance;
    const profitPercent = (profit / startingBalance) * 100;

    const confirmMsg = `You are requesting a phase review for account #${account.mt5Login || account.id}.\n\n` +
      `Target: REACH PROFIT GOAL\n` +
      `Current Profit: ${profitPercent.toFixed(2)}%\n\n` +
      `Are you sure you want to submit?`;

    if (!confirm(confirmMsg)) return;

    setSubmittingReview(account.id);
    try {
      const { error } = await supabase
        .from('evaluation_reviews')
        .insert([{
          account_id: account.id,
          user_id: user.id,
          current_phase: account.currentPhase || 1,
          target_profit: 10, // Default target
          actual_profit: profitPercent,
          status: 'pending'
        }]);

      if (error) throw error;
      alert('Review request submitted successfully! An admin will review your performance shortly.');
      loadAccountsAndRequests();
    } catch (err: any) {
      alert('Failed to submit review: ' + err.message);
    } finally {
      setSubmittingReview(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#161B22] border border-[#30363D] rounded-sm p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1D9BF0]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e1e1e] border border-[#2A2A2A] rounded-md shadow-sm">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8B949E]" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-sm bg-[#0E1117] border border-[#30363D] text-[#E6EDF3] text-sm placeholder-[#8B949E] focus:outline-none focus:border-[#1D9BF0] transition-colors"
          />
        </div>
        
        <div className="w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto appearance-none pl-4 pr-8 py-2 bg-[#1A112A] text-white text-sm uppercase tracking-wider font-bold focus:outline-none transition-colors"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="payment_submitted">Payment Submitted</option>
                <option value="breached">Breached</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
      </div>

      {/* Accounts Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="py-4 px-6 text-xs font-bold text-[#808080]">Status</th>
              <th className="py-4 px-6 text-xs font-bold text-[#808080]">Account Identification</th>
              <th className="py-4 px-6 text-xs font-bold text-[#808080]">Balance</th>
              <th className="py-4 px-6 text-xs font-bold text-[#808080]">Origin Date</th>
              <th className="py-4 px-6 text-xs font-bold text-[#808080] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {filteredAccounts.map((account) => (
              <React.Fragment key={account.id}>
                <tr className="hover:bg-[#2A2A2A]/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-sm bg-[#2A2A2A] text-xs font-bold ${
                      account.status === 'active' ? 'text-green-500' : 
                      account.status === 'passed' ? 'text-[#bd4dd6]' : 
                      'text-red-500'
                    }`}>
                      <span className="ml-1 uppercase">
                        {account.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1">
                      <div className="font-mono text-[#e0e0e0] text-sm">
                        {account.type === 'request' ? account.packageName : `#${account.mt5Login || account.id}`}
                      </div>
                      {account.type === 'account' && (
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            account.modelType === '2_step' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                            account.modelType === '1_step' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {account.modelType || 'Instant'}
                          </span>
                          <span className="text-[9px] text-[#808080] font-black uppercase tracking-widest">
                            {account.modelType === 'instant' ? 'Funded' : 
                             (account.modelType === '1_step' && account.currentPhase === 2) || 
                             (account.modelType === '2_step' && account.currentPhase === 3) ? 'Funded' : 
                             `Phase ${account.currentPhase || 1}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-bold text-white">${account.balance.toLocaleString()}</div>
                    {account.type === 'account' && account.equity && (
                      <div className="text-xs text-[#a0a0a0] mt-0.5">
                        Equity: ${account.equity.toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-xs text-[#a0a0a0]">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                    {account.type === 'account' && account.modelType !== 'instant' && (
                      <button
                        onClick={() => handleRequestReview(account)}
                        disabled={submittingReview === account.id || !!reviews[account.id]}
                        className={`inline-flex items-center px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all border ${
                          !!reviews[account.id] 
                            ? 'bg-gray-500/10 text-gray-500 border-gray-500/20' 
                            : 'bg-[#bd4dd6]/10 text-[#bd4dd6] border-[#bd4dd6]/20 hover:bg-[#bd4dd6]/20'
                        }`}
                      >
                        {!!reviews[account.id] ? (
                          reviews[account.id].status === 'pending' ? 'Review Pending' : 
                          reviews[account.id].status === 'approved' ? 'Passed' : 'Request Review'
                        ) : 'Request Review'}
                      </button>
                    )}
                    {account.type === 'account' && (
                      <button
                        onClick={() => setExpandedRow(expandedRow === account.id ? null : account.id)}
                        className="inline-flex items-center px-4 py-1.5 border border-[#404040] bg-[#2A2A2A] hover:bg-[#333333] text-white text-xs font-bold rounded transition-colors"
                      >
                        Details
                      </button>
                    )}
                    </div>
                  </td>
                </tr>

                {/* Account Details Row */}
                {account.type === 'account' && expandedRow === account.id && (
                  <tr>
                    <td colSpan={5} className="py-6 px-10 bg-[#1A1A1A]">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Progress Tracker */}
                        <div className="space-y-6">
                          <h4 className="text-sm font-black text-[#bd4dd6] uppercase tracking-widest">Evaluation Progress</h4>
                          
                          <div className="relative pt-4">
                            {/* Stepper Line */}
                            <div className="absolute top-8 left-0 w-full h-[2px] bg-[#2A2A2A]"></div>
                            
                            <div className="relative flex justify-between">
                              {/* Phase 1 */}
                              <div className="flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 ${
                                  (account.currentPhase || 1) >= 1 ? 'bg-[#bd4dd6] border-[#bd4dd6] text-white' : 'bg-[#1A1A1A] border-[#2A2A2A] text-[#808080]'
                                }`}>
                                  <span className="text-xs font-bold font-mono">1</span>
                                </div>
                                <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Phase 1</span>
                              </div>

                              {/* Phase 2 (for 1_step it's funding, for 2_step it's evaluation) */}
                              <div className="flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 ${
                                  (account.currentPhase || 1) >= 2 ? 'bg-[#bd4dd6] border-[#bd4dd6] text-white' : 'bg-[#1A1A1A] border-[#2A2A2A] text-[#808080]'
                                }`}>
                                  <span className="text-xs font-bold font-mono">2</span>
                                </div>
                                <span className="text-[10px] font-bold text-[#808080] uppercase tracking-tighter">
                                  {account.modelType === '1_step' ? 'Funded' : 'Phase 2'}
                                </span>
                              </div>

                              {/* Phase 3 (only for 2_step) */}
                              {account.modelType === '2_step' && (
                                <div className="flex flex-col items-center gap-2">
                                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 ${
                                    (account.currentPhase || 1) >= 3 ? 'bg-[#bd4dd6] border-[#bd4dd6] text-white' : 'bg-[#1A1A1A] border-[#2A2A2A] text-[#808080]'
                                  }`}>
                                    <span className="text-xs font-bold font-mono">3</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-[#808080] uppercase tracking-tighter">Funded</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Profit Bar */}
                          <div className="bg-[#0E0E0E] p-4 rounded border border-[#2A2A2A] mt-8">
                             <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Profit Target Progress</span>
                                <span className="text-[10px] text-white font-mono font-bold">
                                  {Math.max(0, (((account.equity || account.balance) - (account.startingBalance || account.balance)) / (account.startingBalance || account.balance)) * 100).toFixed(2)}% / 10%
                                </span>
                             </div>
                             <div className="w-full h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                                  style={{ width: `${Math.min(100, Math.max(0, (((account.equity || account.balance) - (account.startingBalance || account.balance)) / (account.startingBalance || account.balance)) * 1000))}%` }}
                                ></div>
                             </div>
                          </div>
                        </div>

                        {/* Account Info */}
                        <div className="bg-[#0E0E0E] p-6 rounded border border-[#2A2A2A] space-y-4">
                          <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-[#2A2A2A] pb-2">Credentials</h4>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                               <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">MT5 Login</div>
                               <div className="text-sm font-mono text-[#E0E0E0]">{account.mt5Login}</div>
                             </div>
                             <div>
                               <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Server</div>
                               <div className="text-sm font-mono text-[#E0E0E0]">{account.mt5Server}</div>
                             </div>
                             <div>
                               <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Daily Cap</div>
                               <div className="text-sm font-mono text-red-400">-${(account.balance * 0.05).toLocaleString()}</div>
                             </div>
                             <div>
                               <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Overall Cap</div>
                               <div className="text-sm font-mono text-red-400">-${(account.balance * 0.10).toLocaleString()}</div>
                             </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}