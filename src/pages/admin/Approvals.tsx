import React, { useState } from 'react';
import { Search, Filter, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ApprovalRequest {
  id: string;
  userId: string;
  userName: string;
  type: 'account' | 'payout' | 'withdrawal';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  details: string;
}

const mockRequests: ApprovalRequest[] = [
  {
    id: 'REQ-001',
    userId: '1',
    userName: 'John Doe',
    type: 'payout',
    amount: 2500,
    status: 'pending',
    submittedAt: '2024-03-19T10:30:00',
    details: 'Weekly profit payout request'
  },
  {
    id: 'REQ-002',
    userId: '2',
    userName: 'Sarah Chen',
    type: 'account',
    amount: 25000,
    status: 'pending',
    submittedAt: '2024-03-19T09:15:00',
    details: 'New trading account application'
  },
  {
    id: 'REQ-003',
    userId: '3',
    userName: 'Mike Johnson',
    type: 'withdrawal',
    amount: 5000,
    status: 'pending',
    submittedAt: '2024-03-19T08:45:00',
    details: 'Account balance withdrawal'
  }
];

const statusStyles = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20',
  approved: 'bg-green-500/10 text-green-400 border-green-400/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-400/20'
};

export default function Approvals() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  const filteredRequests = mockRequests.filter(request => {
    const matchesSearch = 
      request.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || request.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleApprove = (request: ApprovalRequest) => {
    console.log('Approving request:', request);
    setSelectedRequest(null);
  };

  const handleReject = (request: ApprovalRequest) => {
    console.log('Rejecting request:', request);
    setSelectedRequest(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Approval Requests</h1>
      </div>

      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        {/* Filters */}
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
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="appearance-none pl-4 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 focus:outline-none focus:border-blue-500/50"
              >
                <option value="all">All Types</option>
                <option value="account">Account</option>
                <option value="payout">Payout</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
              <Filter className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="pb-3 text-left text-gray-400 font-medium">Request ID</th>
                <th className="pb-3 text-left text-gray-400 font-medium">User</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Type</th>
                <th className="pb-3 text-right text-gray-400 font-medium">Amount</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Submitted</th>
                <th className="pb-3 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id} className="border-b border-gray-700/50 hover:bg-white/5">
                  <td className="py-4">
                    <div className="font-medium text-white">{request.id}</div>
                  </td>
                  <td className="py-4">
                    <div>
                      <div className="font-medium text-white">{request.userName}</div>
                      <div className="text-sm text-gray-400">ID: {request.userId}</div>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full border ${
                      request.type === 'account' ? 'bg-blue-500/10 text-blue-400 border-blue-400/20' :
                      request.type === 'payout' ? 'bg-green-500/10 text-green-400 border-green-400/20' :
                      'bg-purple-500/10 text-purple-400 border-purple-400/20'
                    }`}>
                      <span className="text-sm font-medium capitalize">{request.type}</span>
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <div className="font-medium text-white">${request.amount.toLocaleString()}</div>
                  </td>
                  <td className="py-4">
                    <div className="text-gray-300">
                      {new Date(request.submittedAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleApprove(request)}
                        className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleReject(request)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setSelectedRequest(selectedRequest?.id === request.id ? null : request)}
                        className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                      >
                        <AlertTriangle className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Request Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
            <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-lg w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Request Details</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 mb-1">Request ID</p>
                  <p className="text-white font-medium">{selectedRequest.id}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">User</p>
                  <p className="text-white font-medium">{selectedRequest.userName}</p>
                  <p className="text-sm text-gray-400">ID: {selectedRequest.userId}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Type</p>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full border ${
                    selectedRequest.type === 'account' ? 'bg-blue-500/10 text-blue-400 border-blue-400/20' :
                    selectedRequest.type === 'payout' ? 'bg-green-500/10 text-green-400 border-green-400/20' :
                    'bg-purple-500/10 text-purple-400 border-purple-400/20'
                  }`}>
                    <span className="text-sm font-medium capitalize">{selectedRequest.type}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Amount</p>
                  <p className="text-white font-medium">${selectedRequest.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Submitted At</p>
                  <p className="text-white font-medium">
                    {new Date(selectedRequest.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Details</p>
                  <p className="text-white">{selectedRequest.details}</p>
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <button
                    onClick={() => handleApprove(selectedRequest)}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest)}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}