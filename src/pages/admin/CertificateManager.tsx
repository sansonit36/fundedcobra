import React, { useState, useEffect } from 'react';
import { Search, Plus, ShieldCheck, ShieldX, Eye, Award, Calendar, DollarSign, User, X } from 'lucide-react';
import { getAllCertificates, createManualCertificate, toggleCertificateVerification } from '../../lib/certificates';
import { supabase } from '../../lib/supabase';
import type { PayoutCertificate } from '../../lib/certificates';

interface UserOption {
  id: string;
  name: string;
  email: string;
}

export default function CertificateManager() {
  const [certificates, setCertificates] = useState<PayoutCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    user_id: '',
    trader_name: '',
    account_type: '',
    account_size: '',
    payout_amount: '',
    payout_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [certsData, { data: usersData }] = await Promise.all([
        getAllCertificates(),
        supabase.from('profiles').select('id, name, email').order('email')
      ]);
      setCertificates(certsData);
      setUsers((usersData || []).map(u => ({
        id: u.id,
        name: u.name || u.email,
        email: u.email
      })));
    } catch (err) {
      console.error('Error loading certificates:', err);
      setError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processing) return;

    setProcessing(true);
    setError(null);

    try {
      await createManualCertificate({
        user_id: formData.user_id,
        trader_name: formData.trader_name,
        account_type: formData.account_type,
        account_size: parseFloat(formData.account_size) || 0,
        payout_amount: parseFloat(formData.payout_amount) || 0,
        payout_date: formData.payout_date
      });

      setSuccess('Certificate created successfully!');
      setShowCreateModal(false);
      setFormData({
        user_id: '',
        trader_name: '',
        account_type: '',
        account_size: '',
        payout_amount: '',
        payout_date: new Date().toISOString().split('T')[0]
      });
      await loadData();
    } catch (err) {
      console.error('Error creating certificate:', err);
      setError('Failed to create certificate');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleVerification = async (cert: PayoutCertificate) => {
    try {
      await toggleCertificateVerification(cert.id, !cert.is_verified);
      await loadData();
    } catch (err) {
      console.error('Error toggling verification:', err);
      setError('Failed to update certificate');
    }
  };

  const handleUserSelect = (userId: string) => {
    setFormData(prev => ({ ...prev, user_id: userId }));
    const user = users.find(u => u.id === userId);
    if (user && !formData.trader_name) {
      setFormData(prev => ({ ...prev, trader_name: user.name }));
    }
  };

  const filteredCerts = certificates.filter(cert => {
    const query = searchQuery.toLowerCase();
    return (
      cert.trader_name.toLowerCase().includes(query) ||
      cert.certificate_number.toLowerCase().includes(query) ||
      cert.account_type.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card-gradient rounded-2xl p-6 border border-white/5">
              <div className="animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-white/10 mb-4" />
                <div className="h-4 bg-white/10 rounded w-24 mb-1" />
                <div className="h-6 bg-white/10 rounded w-32" />
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
        <h1 className="text-2xl font-bold text-white">Payout Certificates</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Certificate</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
            <Award className="w-6 h-6 text-primary-400" />
          </div>
          <p className="text-sm text-gray-400 mb-1">Total Certificates</p>
          <p className="text-2xl font-bold text-white">{certificates.length}</p>
        </div>
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <DollarSign className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-sm text-gray-400 mb-1">Total Payout Value</p>
          <p className="text-2xl font-bold text-white">
            ${certificates.reduce((sum, c) => sum + c.payout_amount, 0).toLocaleString()}
          </p>
        </div>
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-sm text-gray-400 mb-1">Verified</p>
          <p className="text-2xl font-bold text-white">
            {certificates.filter(c => c.is_verified).length}
          </p>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search certificates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="pb-3 text-left text-gray-400 font-medium">Certificate</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Trader</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Amount</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Account</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Date</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                <th className="pb-3 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No certificates found
                  </td>
                </tr>
              ) : (
                filteredCerts.map(cert => (
                  <tr key={cert.id} className="border-b border-gray-700/50 hover:bg-white/5">
                    <td className="py-4">
                      <div className="font-mono text-sm font-medium text-primary-400">
                        {cert.certificate_number}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-white">{cert.trader_name}</div>
                    </td>
                    <td className="py-4">
                      <div className="font-bold text-emerald-400">
                        ${cert.payout_amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-sm text-gray-300">{cert.account_type}</div>
                      <div className="text-xs text-gray-500">${cert.account_size.toLocaleString()}</div>
                    </td>
                    <td className="py-4">
                      <div className="text-sm text-white">{formatDate(cert.payout_date)}</div>
                    </td>
                    <td className="py-4">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        cert.is_verified
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {cert.is_verified ? (
                          <><ShieldCheck className="w-3 h-3 mr-1" /> Verified</>
                        ) : (
                          <><ShieldX className="w-3 h-3 mr-1" /> Unverified</>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <a
                          href={`/verify/${cert.certificate_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleToggleVerification(cert)}
                          className={`p-2 rounded-lg transition-colors ${
                            cert.is_verified
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                              : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'
                          }`}
                          title={cert.is_verified ? 'Unverify' : 'Verify'}
                        >
                          {cert.is_verified ? (
                            <ShieldX className="w-4 h-4" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Certificate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Create Certificate</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCertificate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Assign to User</label>
                <select
                  value={formData.user_id}
                  onChange={e => handleUserSelect(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50 [&>option]:bg-gray-900"
                >
                  <option className="bg-gray-900 text-white" value="">Select user...</option>
                  {users.map(u => (
                    <option className="bg-gray-900 text-white" key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Trader Name (on certificate)</label>
                <input
                  type="text"
                  value={formData.trader_name}
                  onChange={e => setFormData(prev => ({ ...prev, trader_name: e.target.value }))}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="e.g. John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Account Type</label>
                  <input
                    type="text"
                    value={formData.account_type}
                    onChange={e => setFormData(prev => ({ ...prev, account_type: e.target.value }))}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                    placeholder="e.g. $50K Challenge"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Account Size ($)</label>
                  <input
                    type="number"
                    value={formData.account_size}
                    onChange={e => setFormData(prev => ({ ...prev, account_size: e.target.value }))}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                    placeholder="50000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Payout Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.payout_amount}
                    onChange={e => setFormData(prev => ({ ...prev, payout_amount: e.target.value }))}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                    placeholder="1500.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Payout Date</label>
                  <input
                    type="date"
                    value={formData.payout_date}
                    onChange={e => setFormData(prev => ({ ...prev, payout_date: e.target.value }))}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? 'Creating...' : 'Create Certificate'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
