import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Tag, DollarSign, Calendar, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AccountPackage {
  id: string;
  name: string;
  balance: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

interface PromotionalOffer {
  id: string;
  title: string;
  description: string;
  discount_code: string;
  discount_percent: number;
  account_types: string[];
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export default function PackagesAndOffers() {
  const [packages, setPackages] = useState<AccountPackage[]>([]);
  const [offers, setOffers] = useState<PromotionalOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<AccountPackage | null>(null);
  const [editingOffer, setEditingOffer] = useState<PromotionalOffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Package form state
  const [packageForm, setPackageForm] = useState({
    name: '',
    balance: '',
    price: '',
    is_active: true
  });

  // Offer form state
  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    discount_code: '',
    discount_percent: '',
    account_types: [] as string[],
    expires_at: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [packagesRes, offersRes] = await Promise.all([
        supabase.from('account_packages').select('*').order('balance', { ascending: true }),
        supabase.from('promotional_offers').select('*').order('created_at', { ascending: false })
      ]);

      if (packagesRes.error) throw packagesRes.error;
      if (offersRes.error) throw offersRes.error;

      setPackages(packagesRes.data || []);
      setOffers(offersRes.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Package CRUD operations
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const packageData = {
        name: packageForm.name,
        balance: parseFloat(packageForm.balance),
        price: parseFloat(packageForm.price),
        is_active: packageForm.is_active
      };

      if (editingPackage) {
        const { error } = await supabase
          .from('account_packages')
          .update(packageData)
          .eq('id', editingPackage.id);
        if (error) throw error;
        setSuccess('Package updated successfully');
      } else {
        const { error } = await supabase
          .from('account_packages')
          .insert([packageData]);
        if (error) throw error;
        setSuccess('Package created successfully');
      }

      setShowPackageModal(false);
      setEditingPackage(null);
      resetPackageForm();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save package');
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
      const { error } = await supabase
        .from('account_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('Package deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete package');
    }
  };

  const openEditPackage = (pkg: AccountPackage) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      balance: pkg.balance.toString(),
      price: pkg.price.toString(),
      is_active: pkg.is_active
    });
    setShowPackageModal(true);
  };

  const resetPackageForm = () => {
    setPackageForm({
      name: '',
      balance: '',
      price: '',
      is_active: true
    });
  };

  // Offer CRUD operations
  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const offerData = {
        title: offerForm.title,
        description: offerForm.description,
        discount_code: offerForm.discount_code.toUpperCase(),
        discount_percent: parseFloat(offerForm.discount_percent),
        account_types: offerForm.account_types,
        expires_at: offerForm.expires_at,
        is_active: offerForm.is_active
      };

      if (editingOffer) {
        const { error } = await supabase
          .from('promotional_offers')
          .update(offerData)
          .eq('id', editingOffer.id);
        if (error) throw error;
        setSuccess('Offer updated successfully');
      } else {
        const { error } = await supabase
          .from('promotional_offers')
          .insert([offerData]);
        if (error) throw error;
        setSuccess('Offer created successfully');
      }

      setShowOfferModal(false);
      setEditingOffer(null);
      resetOfferForm();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save offer');
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;

    try {
      const { error } = await supabase
        .from('promotional_offers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('Offer deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete offer');
    }
  };

  const openEditOffer = (offer: PromotionalOffer) => {
    setEditingOffer(offer);
    setOfferForm({
      title: offer.title,
      description: offer.description,
      discount_code: offer.discount_code,
      discount_percent: offer.discount_percent.toString(),
      account_types: offer.account_types,
      expires_at: offer.expires_at.split('T')[0],
      is_active: offer.is_active
    });
    setShowOfferModal(true);
  };

  const resetOfferForm = () => {
    setOfferForm({
      title: '',
      description: '',
      discount_code: '',
      discount_percent: '',
      account_types: [],
      expires_at: '',
      is_active: true
    });
  };

  const toggleAccountType = (type: string) => {
    setOfferForm(prev => ({
      ...prev,
      account_types: prev.account_types.includes(type)
        ? prev.account_types.filter(t => t !== type)
        : [...prev.account_types, type]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Packages & Offers Management</h1>
        <p className="text-gray-400 mt-1">Manage account packages, prices, and promotional offers</p>
      </div>

      {/* Messages */}
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

      {/* Account Packages Section */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Package className="w-5 h-5 mr-2 text-primary-400" />
            Account Packages
          </h2>
          <button
            onClick={() => {
              setEditingPackage(null);
              resetPackageForm();
              setShowPackageModal(true);
            }}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Package</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="pb-3 text-left text-gray-400 font-medium">Package Name</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Balance</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Price</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id} className="border-b border-gray-700/50 hover:bg-white/5">
                  <td className="py-4 text-white font-medium">{pkg.name}</td>
                  <td className="py-4 text-white">${pkg.balance.toLocaleString()}</td>
                  <td className="py-4 text-green-400 font-semibold">${pkg.price}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${pkg.is_active
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                      }`}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditPackage(pkg)}
                        className="p-2 rounded-lg hover:bg-primary-500/10 text-primary-400 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promotional Offers Section */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Tag className="w-5 h-5 mr-2 text-purple-400" />
            Promotional Offers
          </h2>
          <button
            onClick={() => {
              setEditingOffer(null);
              resetOfferForm();
              setShowOfferModal(true);
            }}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Offer</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {offers.map((offer) => (
            <div key={offer.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{offer.title}</h3>
                    <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-primary-500/20 to-purple-500/20 border border-primary-400/30 text-white font-bold">
                      {offer.discount_percent}% OFF
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${offer.is_active
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                      }`}>
                      {offer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{offer.description}</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4 text-primary-400" />
                      <code className="text-primary-400 font-mono font-bold">{offer.discount_code}</code>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-400">
                        Expires: {new Date(offer.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {offer.account_types.map(type => (
                      <span key={type} className="px-2 py-1 rounded bg-slate-700 text-xs text-gray-300">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => openEditOffer(offer)}
                    className="p-2 rounded-lg hover:bg-primary-500/10 text-primary-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteOffer(offer.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Package Modal */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingPackage ? 'Edit Package' : 'Add New Package'}
            </h3>
            <form onSubmit={handleSavePackage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Package Name
                </label>
                <input
                  type="text"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="e.g., $10,000 Account"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Balance ($)
                </label>
                <input
                  type="number"
                  value={packageForm.balance}
                  onChange={(e) => setPackageForm({ ...packageForm, balance: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="10000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={packageForm.price}
                  onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="299"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="packageActive"
                  checked={packageForm.is_active}
                  onChange={(e) => setPackageForm({ ...packageForm, is_active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="packageActive" className="text-sm text-gray-400">
                  Active
                </label>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPackageModal(false);
                    setEditingPackage(null);
                    resetPackageForm();
                  }}
                  className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
                >
                  {editingPackage ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 overflow-y-auto">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-2xl w-full my-8">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingOffer ? 'Edit Offer' : 'Create New Offer'}
            </h3>
            <form onSubmit={handleSaveOffer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Offer Title
                </label>
                <input
                  type="text"
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="We’re Growing Sale"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  value={offerForm.description}
                  onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="Massive discount on all standard accounts!"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Discount Code
                  </label>
                  <input
                    type="text"
                    value={offerForm.discount_code}
                    onChange={(e) => setOfferForm({ ...offerForm, discount_code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50 font-mono"
                    placeholder="GROWING50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Discount %
                  </label>
                  <input
                    type="number"
                    value={offerForm.discount_percent}
                    onChange={(e) => setOfferForm({ ...offerForm, discount_percent: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                    placeholder="50"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Expires At
                </label>
                <input
                  type="date"
                  value={offerForm.expires_at}
                  onChange={(e) => setOfferForm({ ...offerForm, expires_at: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Applicable Account Types
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {packages.map(pkg => (
                    <label
                      key={pkg.id}
                      className="flex items-center space-x-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={offerForm.account_types.includes(pkg.name)}
                        onChange={() => toggleAccountType(pkg.name)}
                        className="rounded"
                      />
                      <span className="text-sm text-white">{pkg.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="offerActive"
                  checked={offerForm.is_active}
                  onChange={(e) => setOfferForm({ ...offerForm, is_active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="offerActive" className="text-sm text-gray-400">
                  Active
                </label>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowOfferModal(false);
                    setEditingOffer(null);
                    resetOfferForm();
                  }}
                  className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
                >
                  {editingOffer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
