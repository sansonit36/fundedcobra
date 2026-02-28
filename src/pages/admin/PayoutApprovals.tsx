import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, AlertTriangle, User, DollarSign, Wallet, AlertOctagon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PayoutRequest {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  wallet_address: string;
  rejection_reason?: string;
  created_at: string;
  processed_at?: string;
  user: {
    name: string | null;
    email: string;
  };
  trading_account: {
    mt5_login: string;
    balance: number;
    equity: number;
  };
}

type TabType = 'pending' | 'approved' | 'rejected';

const statusStyles = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20',
  approved: 'bg-green-500/10 text-green-400 border-green-400/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-400/20'
};

const statusIcons = {
  pending: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  approved: <CheckCircle className="w-5 h-5 text-green-400" />,
  rejected: <XCircle className="w-5 h-5 text-red-400" />
};

const commonRejectionReasons = [
  'Insufficient balance',
  'Invalid wallet address',
  'Suspicious activity',
  'Trading rules violation',
  'Profit target not met'
];

export default function PayoutApprovals() {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>('pending');

  useEffect(() => {
    loadPayoutRequests();
  }, []);

  const loadPayoutRequests = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('payout_requests')
        .select(`
          *,
          user:profiles!payout_requests_user_id_fkey(name, email),
          trading_account:trading_accounts!payout_requests_account_id_fkey(mt5_login, balance, equity)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRequests(data || []);
    } catch (err) {
      console.error('Error loading payout requests:', err);
      setError('Failed to load payout requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: PayoutRequest) => {
    if (processing) return;
    setProcessing(true);
    setError(null);

    try {
      const { error: approveError } = await supabase
        .from('payout_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (approveError) throw approveError;

      await loadPayoutRequests();
      setSelectedRequest(null);
    } catch (err) {
      console.error('Error approving payout:', err);
      setError('Failed to approve payout request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || processing) return;
    const reason = rejectionReason === 'custom' ? customRejectionReason : rejectionReason;
    if (!reason) return;

    setProcessing(true);
    setError(null);

    try {
      const { error: rejectError } = await supabase
        .from('payout_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          processed_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (rejectError) throw rejectError;

      await loadPayoutRequests();
      setShowRejectionModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setCustomRejectionReason('');
    } catch (err) {
      console.error('Error rejecting payout:', err);
      setError('Failed to reject payout request');
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const searchString = searchQuery.toLowerCase();
    const matchesSearch = (
      request.user.name?.toLowerCase().includes(searchString) ||
      request.user.email.toLowerCase().includes(searchString) ||
      request.trading_account.mt5_login.toLowerCase().includes(searchString)
    );
    const matchesStatus = request.status === selectedTab;
    return matchesSearch && matchesStatus;
  });

  const getTabStats = (status: TabType) => {
    const statusRequests = requests.filter(r => r.status === status);
    return {
      count: statusRequests.length,
      total: statusRequests.reduce((sum, r) => sum + r.amount, 0)
    };
  };

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Payout Approval Requests</h1>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Pending Payouts</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">
              ${getTabStats('pending').total.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Total Paid Out</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">
              ${getTabStats('approved').total.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">This Month</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">
              ${requests.filter(r => {
                const requestDate = new Date(r.created_at);
                const now = new Date();
                return requestDate.getMonth() === now.getMonth() && 
                       requestDate.getFullYear() === now.getFullYear() &&
                       r.status === 'approved';
              }).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        {/* Status Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setSelectedTab('pending')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'pending'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Pending ({getTabStats('pending').count})
          </button>
          <button
            onClick={() => setSelectedTab('approved')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'approved'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Approved ({getTabStats('approved').count})
          </button>
          <button
            onClick={() => setSelectedTab('rejected')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'rejected'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Rejected ({getTabStats('rejected').count})
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="pb-3 text-left text-gray-400 font-medium">Request ID</th>
                <th className="pb-3 text-left text-gray-400 font-medium">User</th>
                <th className="pb-3 text-left text-gray-400 font-medium">MT5 Account</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Amount</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Wallet</th>
                <th className="pb-3 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No {selectedTab} payout requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-700/50 hover:bg-white/5">
                    <td className="py-4">
                      <div className="font-medium text-white">{request.id}</div>
                      <div className="text-sm text-gray-400">
                        {new Date(request.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{request.user.name || 'No Name'}</div>
                          <div className="text-sm text-gray-400">{request.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-white">{request.trading_account.mt5_login}</div>
                      <div className="text-sm text-gray-400">
                        Balance: ${request.trading_account.balance.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-green-400">
                        ${request.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[request.status]}`}>
                        {statusIcons[request.status]}
                        <span className="ml-2 text-sm font-medium capitalize">{request.status}</span>
                      </div>
                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="mt-1 text-sm text-red-400">
                          {request.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-white break-all">
                        {request.wallet_address}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      {request.status === 'pending' && (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleApprove(request)}
                            disabled={processing}
                            className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectionModal(true);
                            }}
                            disabled={processing}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Reject Payout Request</h3>
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedRequest(null);
                  setRejectionReason('');
                  setCustomRejectionReason('');
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Select Rejection Reason
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-red-500/50"
                >
                  <option value="">Select a reason</option>
                  {commonRejectionReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                  <option value="custom">Custom Reason</option>
                </select>
              </div>

              {rejectionReason === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Custom Reason
                  </label>
                  <textarea
                    value={customRejectionReason}
                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
                    placeholder="Enter custom rejection reason"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={handleReject}
                  disabled={processing || !rejectionReason || (rejectionReason === 'custom' && !customRejectionReason)}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {processing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}