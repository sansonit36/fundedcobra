import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, AlertTriangle, User, Eye, History, RotateCcw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sendEmail, logEmailSent } from '../../lib/emailService';

interface KYCVerification {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
  documents: {
    id: string;
    type: string;
    file_url: string;
  }[];
}

interface KYCHistory {
  id: string;
  status: string;
  reason?: string;
  created_at: string;
  changed_by: {
    name: string;
    email: string;
  };
}

interface DocumentPreviewModalProps {
  documents: {
    id: string;
    type: string;
    file_url: string;
  }[];
  onClose: () => void;
}

function DocumentPreviewModal({ documents, onClose }: DocumentPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextDocument = () => {
    setCurrentIndex((prev) => (prev + 1) % documents.length);
  };

  const previousDocument = () => {
    setCurrentIndex((prev) => (prev - 1 + documents.length) % documents.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80">
      <div className="relative w-full max-w-4xl">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="bg-white rounded-lg overflow-hidden">
          <div className="relative aspect-[4/3] bg-gray-900">
            <img
              src={documents[currentIndex].file_url}
              alt={documents[currentIndex].type}
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          
          <div className="p-4 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {documents[currentIndex].type.replace('_', ' ')}
              </h3>
              <div className="flex items-center space-x-4">
                {documents.length > 1 && (
                  <>
                    <button
                      onClick={previousDocument}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-gray-600">
                      {currentIndex + 1} / {documents.length}
                    </span>
                    <button
                      onClick={nextDocument}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Next
                    </button>
                  </>
                )}
                <a
                  href={documents[currentIndex].file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                >
                  Open Full Size
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const commonRejectionReasons = [
  'ID document unclear or unreadable',
  'ID document expired',
  'Selfie does not match ID',
  'Documents incomplete',
  'Suspected fraudulent documents'
];

export default function KYCVerifications() {
  const [verifications, setVerifications] = useState<KYCVerification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedVerification, setSelectedVerification] = useState<KYCVerification | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState<KYCHistory[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<{
    id: string;
    type: string;
    file_url: string;
  }[]>([]);

  useEffect(() => {
    loadVerifications();
  }, [statusFilter]);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('kyc_verifications')
        .select(`
          *,
          user:profiles!kyc_verifications_user_id_fkey(name, email),
          documents:kyc_documents(*)
        `)
        .eq('status', statusFilter)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setVerifications(data || []);
    } catch (err) {
      console.error('Error loading verifications:', err);
      setError('Failed to load KYC verifications');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (verificationId: string) => {
    try {
      const { data, error: historyError } = await supabase
        .from('kyc_history')
        .select(`
          *,
          changed_by:profiles!kyc_history_changed_by_fkey(name, email)
        `)
        .eq('verification_id', verificationId)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;
      setHistory(data || []);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load verification history');
    }
  };

  const handleStatusChange = async (verification: KYCVerification, newStatus: 'approved' | 'rejected') => {
    if (processing) return;
    setProcessing(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('kyc_verifications')
        .update({
          status: newStatus,
          rejection_reason: newStatus === 'rejected' ? rejectionReason === 'custom' ? customRejectionReason : rejectionReason : null
        })
        .eq('id', verification.id);

      if (updateError) throw updateError;

      // Send email notification
      try {
        const template = newStatus === 'approved' ? 'kyc_approved' : 'kyc_rejected';
        await sendEmail({
          to: verification.user.email,
          template,
          data: {
            name: verification.user.name,
            reason: newStatus === 'rejected' ? (rejectionReason === 'custom' ? customRejectionReason : rejectionReason) : undefined
          }
        });
        await logEmailSent(verification.user_id, template);
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }

      await loadVerifications();
      setShowRejectionModal(false);
      setSelectedVerification(null);
      setRejectionReason('');
      setCustomRejectionReason('');
    } catch (err) {
      console.error('Error updating verification:', err);
      setError(`Failed to ${newStatus} verification`);
    } finally {
      setProcessing(false);
    }
  };

  const handleResetDecision = async (verification: KYCVerification) => {
    if (processing) return;
    setProcessing(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('kyc_verifications')
        .update({
          status: 'pending',
          rejection_reason: null
        })
        .eq('id', verification.id);

      if (updateError) throw updateError;
      
      setStatusFilter('pending');
      await loadVerifications();
    } catch (err) {
      console.error('Error resetting verification:', err);
      setError('Failed to reset verification status');
    } finally {
      setProcessing(false);
    }
  };

  const handlePreviewDocuments = (documents: { id: string; type: string; file_url: string; }[]) => {
    setSelectedDocuments(documents);
    setShowDocumentPreview(true);
  };

  const filteredVerifications = verifications.filter(verification =>
    verification.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    verification.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">KYC Verifications</h1>
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
              placeholder="Search verifications..."
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
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <Filter className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="pb-3 text-left text-gray-400 font-medium">User</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Documents</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Submitted</th>
                <th className="pb-3 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVerifications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    No {statusFilter} verifications found
                  </td>
                </tr>
              ) : (
                filteredVerifications.map((verification) => (
                  <tr key={verification.id} className="border-b border-gray-700/50 hover:bg-white/5">
                    <td className="py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{verification.user.name || 'No Name'}</div>
                          <div className="text-sm text-gray-400">{verification.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex space-x-2">
                        {verification.documents.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => handlePreviewDocuments(verification.documents)}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{doc.type.replace('_', ' ')}</span>
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-gray-300">
                        {new Date(verification.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {statusFilter === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleStatusChange(verification, 'approved')}
                              disabled={processing}
                              className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedVerification(verification);
                                setShowRejectionModal(true);
                              }}
                              disabled={processing}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleResetDecision(verification)}
                            disabled={processing}
                            className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-colors"
                            title="Reset Decision"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedVerification(verification);
                            loadHistory(verification.id);
                            setShowHistoryModal(true);
                          }}
                          className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                          title="View History"
                        >
                          <History className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showRejectionModal && selectedVerification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
            <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-lg w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Reject KYC Verification</h3>
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setSelectedVerification(null);
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
                    onClick={() => handleStatusChange(selectedVerification, 'rejected')}
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

        {showHistoryModal && selectedVerification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
            <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-2xl w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Verification History</h3>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedVerification(null);
                    setHistory([]);
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full ${
                        entry.status === 'approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        entry.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        <span className="text-sm font-medium capitalize">{entry.status}</span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    {entry.reason && (
                      <p className="text-gray-300 mt-2">{entry.reason}</p>
                    )}
                    <div className="mt-2 text-sm text-gray-400">
                      by {entry.changed_by.name || entry.changed_by.email}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showDocumentPreview && selectedDocuments.length > 0 && (
          <DocumentPreviewModal
            documents={selectedDocuments}
            onClose={() => setShowDocumentPreview(false)}
          />
        )}
      </div>
    </div>
  );
}