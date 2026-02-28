import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface WithdrawalRequest {
  id: string;
  amount: number;
  wallet_address: string;
  status: string;
  created_at: string;
  processed_at?: string;
  rejection_reason?: string;
}

export default function AffiliateWithdrawal() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Get available balance
      const { data: earningsData } = await supabase.rpc('get_affiliate_earnings', {
        p_user_id: user?.id
      });

      const balance = earningsData?.[0]?.available_for_withdrawal || 0;
      setAvailableBalance(Number(balance));

      // Get withdrawal history
      const { data: withdrawalData } = await supabase
        .from('affiliate_withdrawals')
        .select('*')
        .eq('affiliate_id', user?.id)
        .order('created_at', { ascending: false });

      setWithdrawals(withdrawalData || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (withdrawAmount > availableBalance) {
      setError(`Insufficient balance. Available: $${availableBalance.toFixed(2)}`);
      return;
    }

    if (!walletAddress.trim()) {
      setError('Please enter your wallet address');
      return;
    }

    setSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('affiliate_withdrawals')
        .insert({
          affiliate_id: user?.id,
          amount: withdrawAmount,
          wallet_address: walletAddress,
          status: 'pending'
        });

      if (insertError) throw insertError;

      setSuccess(`Withdrawal request for $${withdrawAmount.toFixed(2)} submitted successfully!`);
      setAmount('');
      setWalletAddress('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20',
      approved: 'bg-green-500/10 text-green-400 border-green-400/20',
      rejected: 'bg-red-500/10 text-red-400 border-red-400/20'
    };

    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: AlertCircle
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
      <span className={`px-3 py-1 rounded-full text-sm border ${styles[status as keyof typeof styles] || styles.pending} flex items-center w-fit`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Affiliate Withdrawals</h1>

      {/* Available Balance */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-2">Available Balance</p>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-4xl font-bold text-white">${availableBalance.toFixed(2)}</h2>
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <h3 className="text-lg font-semibold text-white mb-4">Request Withdrawal</h3>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 flex items-start">
            <CheckCircle className="w-5 h-5 mr-2 mt-0.5" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Withdrawal Amount (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={availableBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
              placeholder="0.00"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum: ${availableBalance.toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Wallet Address / Payment Details
            </label>
            <textarea
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
              placeholder="Enter your crypto wallet address or payment details"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting || availableBalance <= 0}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Withdrawal Request'}
          </button>
        </form>
      </div>

      {/* Withdrawal History */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <h3 className="text-lg font-semibold text-white mb-4">Withdrawal History</h3>

        {withdrawals.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No withdrawal requests yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="pb-3 text-left text-gray-400 font-medium">Date</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Amount</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Processed</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="border-b border-gray-700/50">
                    <td className="py-4 text-gray-300">
                      {new Date(withdrawal.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-white font-semibold">
                      ${withdrawal.amount.toFixed(2)}
                    </td>
                    <td className="py-4">
                      {getStatusBadge(withdrawal.status)}
                    </td>
                    <td className="py-4 text-gray-400 text-sm">
                      {withdrawal.processed_at
                        ? new Date(withdrawal.processed_at).toLocaleDateString()
                        : '-'}
                      {withdrawal.rejection_reason && (
                        <p className="text-red-400 text-xs mt-1">
                          {withdrawal.rejection_reason}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
