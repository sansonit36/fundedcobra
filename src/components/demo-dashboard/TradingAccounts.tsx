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

      // Combine accounts and requests
      const combinedAccounts: CombinedAccount[] = [
        ...(accountsData || []).map(account => ({
          ...account,
          type: 'account' as const,
          createdAt: account.created_at,
          updatedAt: account.updated_at
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
                    <div className="font-mono text-[#e0e0e0] text-sm">
                      {account.type === 'request' ? account.packageName : `#${account.id}`}
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
                    {account.type === 'account' && (
                      <button
                        onClick={() => setExpandedRow(expandedRow === account.id ? null : account.id)}
                        className="inline-flex items-center px-4 py-1.5 border border-[#404040] bg-[#2A2A2A] hover:bg-[#333333] text-white text-xs font-bold rounded transition-colors"
                      >
                        Details
                      </button>
                    )}
                  </td>
                </tr>

                {/* Account Details Row */}
                {account.type === 'account' && expandedRow === account.id && (
                  <tr>
                    <td colSpan={5} className="py-4 px-4 bg-white/5">
                      {/* Keep your existing account details section */}
                      {/* ... */}
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