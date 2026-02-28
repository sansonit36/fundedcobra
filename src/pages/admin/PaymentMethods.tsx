import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PaymentMethod {
  id: string;
  name: string;
  account_name: string;
  account_number: string;
  enabled: boolean;
  created_at: string;
}

export default function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [usdToPkr, setUsdToPkr] = useState(288);
  const [formData, setFormData] = useState({
    name: '',
    account_name: '',
    account_number: ''
  });

  useEffect(() => {
    loadPaymentMethods();
    loadExchangeRate();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExchangeRate = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'usd_to_pkr_rate')
        .single();

      if (data?.value) {
        setUsdToPkr(Number(data.value));
      }
    } catch (error) {
      console.error('Error loading exchange rate:', error);
    }
  };

  const handleSaveExchangeRate = async () => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'usd_to_pkr_rate',
          value: usdToPkr.toString()
        });

      if (error) throw error;
      alert('Exchange rate updated successfully');
    } catch (error) {
      console.error('Error saving exchange rate:', error);
      alert('Failed to save exchange rate');
    }
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.account_name || !formData.account_number) {
      alert('Please fill all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_methods')
        .insert({
          name: formData.name,
          account_name: formData.account_name,
          account_number: formData.account_number,
          enabled: true
        });

      if (error) throw error;

      await loadPaymentMethods();
      setShowAddModal(false);
      setFormData({ name: '', account_name: '', account_number: '' });
    } catch (error) {
      console.error('Error adding payment method:', error);
      alert('Failed to add payment method');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<PaymentMethod>) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await loadPaymentMethods();
      setEditingId(null);
    } catch (error) {
      console.error('Error updating payment method:', error);
      alert('Failed to update payment method');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      alert('Failed to delete payment method');
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await handleUpdate(id, { enabled: !enabled });
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Payment Methods</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Method
        </button>
      </div>

      {/* Exchange Rate */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <h3 className="text-lg font-semibold text-white mb-4">USD to PKR Exchange Rate</h3>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-2">Rate</label>
            <input
              type="number"
              value={usdToPkr}
              onChange={(e) => setUsdToPkr(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <button
            onClick={handleSaveExchangeRate}
            className="mt-6 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
          >
            Save Rate
          </button>
        </div>
      </div>

      {/* Payment Methods List */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <h3 className="text-lg font-semibold text-white mb-4">Payment Methods</h3>

        {methods.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No payment methods configured
          </div>
        ) : (
          <div className="space-y-4">
            {methods.map((method) => (
              <div
                key={method.id}
                className="p-4 rounded-lg bg-white/5 border border-white/10"
              >
                {editingId === method.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      defaultValue={method.name}
                      onChange={(e) => method.name = e.target.value}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
                      placeholder="Method Name"
                    />
                    <input
                      type="text"
                      defaultValue={method.account_name}
                      onChange={(e) => method.account_name = e.target.value}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
                      placeholder="Account Name"
                    />
                    <input
                      type="text"
                      defaultValue={method.account_number}
                      onChange={(e) => method.account_number = e.target.value}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
                      placeholder="Account Number"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdate(method.id, method)}
                        className="flex items-center px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{method.name}</h4>
                        <p className="text-sm text-gray-400">{method.account_name}</p>
                        <p className="text-sm text-gray-300 font-mono">{method.account_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleEnabled(method.id, method.enabled)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          method.enabled
                            ? 'bg-green-500/10 text-green-400 border border-green-400/20'
                            : 'bg-gray-500/10 text-gray-400 border border-gray-400/20'
                        }`}
                      >
                        {method.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => setEditingId(method.id)}
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(method.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-gradient rounded-2xl p-6 border border-white/5 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Add Payment Method</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Method Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="e.g., JazzCash, Nayapay"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Account Name</label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="Account holder name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Account Number</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="Account number"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                Add Method
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ name: '', account_name: '', account_number: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
