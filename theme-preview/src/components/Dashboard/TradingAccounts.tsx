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
  active: 'bg-green-500/[0.08] text-green-400 border-green-500/[0.12]',
  pending: 'bg-amber-500/[0.08] text-amber-400 border-amber-500/[0.12]',
  breached: 'bg-red-500/[0.08] text-red-400 border-red-500/[0.12]',
  rejected: 'bg-gray-500/[0.08] text-gray-400 border-gray-500/[0.12]',
  pending_payment: 'bg-amber-500/[0.08] text-amber-400 border-amber-500/[0.12]',
  payment_submitted: 'bg-primary-500/[0.08] text-primary-400 border-primary-500/[0.12]',
  suspicious: 'bg-orange-500/[0.08] text-orange-400 border-orange-500/[0.12]'
};

const statusIcons = {
  active: <CheckCircle className="w-4 h-4 text-green-400" />,
  pending: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  breached: <XCircle className="w-4 h-4 text-red-400" />,
  rejected: <XCircle className="w-4 h-4 text-gray-400" />,
  pending_payment: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  payment_submitted: <AlertTriangle className="w-4 h-4 text-primary-400" />,
  suspicious: <Clock className="w-4 h-4 text-orange-400" />
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
      <div className="bg-[#111118] rounded-2xl p-6 border border-white/[0.06]">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111118] rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b border-white/[0.04]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-600" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl bg-[#08080c] border border-white/[0.06] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary-500/40 transition-colors"
          />
        </div>
        
        <div className="w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-[#08080c] border border-white/[0.06] text-gray-300 text-sm focus:outline-none focus:border-primary-500/40 transition-colors"
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
            <tr className="border-b border-white/[0.04]">
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Account</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Balance</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Created</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((account) => (
              <React.Fragment key={account.id}>
                <tr className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-bold ${statusStyles[account.status]}`}>
                      {statusIcons[account.status]}
                      <span className="ml-1.5 capitalize">
                        {account.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-white text-sm">
                      {account.type === 'request' ? account.packageName : `#${account.id}`}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-white text-sm font-mono">${account.balance.toLocaleString()}</div>
                    {account.type === 'account' && account.equity && (
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        Equity: ${account.equity.toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-gray-400">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {account.type === 'account' && (
                      <button
                        onClick={() => setExpandedRow(expandedRow === account.id ? null : account.id)}
                        className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-primary-500/[0.08] hover:bg-primary-500/[0.12] text-primary-400 text-xs font-semibold transition-colors"
                      >
                        Details
                      </button>
                    )}
                  </td>
                </tr>

                {/* Account Details Row */}
                {account.type === 'account' && expandedRow === account.id && (
                  <tr>
                    <td colSpan={5} className="py-4 px-5 bg-[#0c0c12]">
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