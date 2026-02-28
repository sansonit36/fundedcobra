import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, AlertTriangle, User, Copy, Eye, EyeOff, DollarSign, Target, TrendingDown, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
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
  payment_submitted: 'bg-blue-500/10 text-blue-400 border-blue-400/20'
};

const statusIcons = {
  active: <CheckCircle className="w-5 h-5 text-green-400" />,
  pending: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  breached: <XCircle className="w-5 h-5 text-red-400" />,
  rejected: <XCircle className="w-5 h-5 text-gray-400" />,
  pending_payment: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  payment_submitted: <AlertTriangle className="w-5 h-5 text-blue-400" />
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
        .in('status', ['pending_payment', 'payment_submitted'])
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
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-gradient rounded-2xl p-6 border border-white/5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        
        <div className="w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none pl-4 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 focus:outline-none focus:border-blue-500/50"
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
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
              <th className="pb-3 text-left text-gray-400 font-medium">Account</th>
              <th className="pb-3 text-left text-gray-400 font-medium">Balance</th>
              <th className="pb-3 text-left text-gray-400 font-medium">Created</th>
              <th className="pb-3 text-right text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((account) => (
              <React.Fragment key={account.id}>
                <tr className="border-b border-gray-700/50 hover:bg-white/5">
                  <td className="py-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[account.status]}`}>
                      {statusIcons[account.status]}
                      <span className="ml-2 text-sm font-medium capitalize">
                        {account.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="font-medium text-white">
                      {account.type === 'request' ? account.packageName : `#${account.id}`}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="font-medium text-white">${account.balance.toLocaleString()}</div>
                    {account.type === 'account' && account.equity && (
                      <div className="text-sm text-gray-400">
                        Equity: ${account.equity.toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="py-4">
                    <div className="text-gray-300">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    {account.type === 'account' && (
                      <button
                        onClick={() => setExpandedRow(expandedRow === account.id ? null : account.id)}
                        className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
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