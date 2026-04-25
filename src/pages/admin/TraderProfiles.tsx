import React, { useState, useEffect, useRef } from 'react';
import {
  Search, User, Eye, EyeOff, Star, StarOff, Plus, X, TrendingUp,
  Trophy, Trash2, Download, Award, ShieldCheck, Edit2, Camera, Loader2
} from 'lucide-react';
import { compressImage, validateImageFile } from '../../utils/imageCompressor';
import {
  getAllTraderProfiles, updateTraderProfile, createTraderProfile,
  getHighlightedTrades, addHighlightedTrade, removeHighlightedTrade,
  pullTopTradesFromHistory,
  getAllLeaderboardEntries, createLeaderboardEntry,
  updateLeaderboardEntry, deleteLeaderboardEntry
} from '../../lib/certificates';
import { supabase } from '../../lib/supabase';
import type { TraderProfile, HighlightedTrade, LeaderboardEntry } from '../../lib/certificates';

type ActiveTab = 'profiles' | 'leaderboard';

export default function TraderProfiles() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('profiles');
  const [profiles, setProfiles] = useState<TraderProfile[]>([]);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Trade modal state
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileTrades, setProfileTrades] = useState<HighlightedTrade[]>([]);
  const [tradeForm, setTradeForm] = useState({
    symbol: '', direction: 'buy' as 'buy' | 'sell',
    profit: '', volume: '', duration: '', account_type: '', close_date: ''
  });

  // Leaderboard modal state
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboardForm, setLeaderboardForm] = useState({
    display_name: '', total_payout: '', account_type: '', user_id: ''
  });
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);

  // Create profile modal state
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    user_id: '', display_name: '', bio: '', is_public: true, is_featured: false,
    custom_joined_date: '', custom_total_payouts: '', custom_total_certificates: ''
  });

  // Edit profile modal state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TraderProfile | null>(null);
  const [editForm, setEditForm] = useState({
    display_name: '', bio: '',
    custom_joined_date: '', custom_total_payouts: '', custom_total_certificates: ''
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesData, lbData, { data: usersData }] = await Promise.all([
        getAllTraderProfiles(),
        getAllLeaderboardEntries(),
        supabase.from('profiles').select('id, name, email').order('email')
      ]);
      setProfiles(profilesData);
      setLeaderboardEntries(lbData);
      setUsers((usersData || []).map(u => ({
        id: u.id,
        name: u.name || u.email,
        email: u.email
      })));
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublic = async (profile: TraderProfile) => {
    try {
      await updateTraderProfile(profile.id, { is_public: !profile.is_public });
      setSuccess(`Profile ${!profile.is_public ? 'made public' : 'set to private'}`);
      await loadData();
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  const handleToggleFeatured = async (profile: TraderProfile) => {
    try {
      await updateTraderProfile(profile.id, { is_featured: !profile.is_featured });
      setSuccess(`Profile ${!profile.is_featured ? 'featured' : 'unfeatured'}`);
      await loadData();
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processing) return;
    setProcessing(true);
    try {
      const createData: any = {
        user_id: profileForm.user_id,
        display_name: profileForm.display_name,
        bio: profileForm.bio || undefined,
        is_public: profileForm.is_public,
        is_featured: profileForm.is_featured,
      };
      if (profileForm.custom_joined_date) createData.custom_joined_date = profileForm.custom_joined_date;
      if (profileForm.custom_total_payouts) createData.custom_total_payouts = Number(profileForm.custom_total_payouts);
      if (profileForm.custom_total_certificates) createData.custom_total_certificates = Number(profileForm.custom_total_certificates);
      await createTraderProfile(createData);
      setSuccess('Trader profile created!');
      setShowCreateProfileModal(false);
      setProfileForm({ user_id: '', display_name: '', bio: '', is_public: true, is_featured: false, custom_joined_date: '', custom_total_payouts: '', custom_total_certificates: '' });
      await loadData();
    } catch (err: any) {
      if (err?.code === '23505') {
        setError('Profile already exists for this user');
      } else {
        setError('Failed to create profile');
      }
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (profile: TraderProfile) => {
    setEditingProfile(profile);
    setEditForm({
      display_name: profile.display_name || profile.full_name || '',
      bio: profile.bio || '',
      custom_joined_date: profile.custom_joined_date ? profile.custom_joined_date.split('T')[0] : '',
      custom_total_payouts: profile.custom_total_payouts != null ? String(profile.custom_total_payouts) : '',
      custom_total_certificates: profile.custom_total_certificates != null ? String(profile.custom_total_certificates) : ''
    });
    setShowEditProfileModal(true);
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || processing) return;
    setProcessing(true);
    try {
      const updateData: any = {
        display_name: editForm.display_name,
        bio: editForm.bio || undefined,
      };
      // Handle custom fields — empty string means clear (null), value means set
      updateData.custom_joined_date = editForm.custom_joined_date || null;
      updateData.custom_total_payouts = editForm.custom_total_payouts ? Number(editForm.custom_total_payouts) : null;
      updateData.custom_total_certificates = editForm.custom_total_certificates ? Number(editForm.custom_total_certificates) : null;
      await updateTraderProfile(editingProfile.id, updateData);
      setSuccess('Profile updated successfully!');
      setShowEditProfileModal(false);
      await loadData();
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setProcessing(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProfile) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploadingAvatar(true);
    setError(null);

    try {
      const compressed = await compressImage(file);
      const filePath = `${editingProfile.id}/avatar.jpg`;

      // Ignore old file remove errors
      await supabase.storage.from('avatars').remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressed.blob, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '0'
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profiles and loadData
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', editingProfile.id);

      if (updateError) throw updateError;

      // Update trader_profiles
      await supabase
        .from('trader_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', editingProfile.id);

      // Update local state temporarily
      setEditingProfile({ ...editingProfile, avatar_url: publicUrl });
      setSuccess('Avatar updated successfully!');
      await loadData();
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setError(err?.message || 'Failed to update avatar');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openTradeModal = async (profileId: string) => {
    setSelectedProfileId(profileId);
    setShowTradeModal(true);
    try {
      const trades = await getHighlightedTrades(profileId);
      setProfileTrades(trades);
    } catch (err) {
      setProfileTrades([]);
    }
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId || processing) return;
    setProcessing(true);
    try {
      await addHighlightedTrade({
        user_id: selectedProfileId,
        symbol: tradeForm.symbol,
        direction: tradeForm.direction,
        profit: parseFloat(tradeForm.profit) || 0,
        volume: parseFloat(tradeForm.volume) || 0.01,
        duration: tradeForm.duration || undefined,
        account_type: tradeForm.account_type || undefined,
        close_date: tradeForm.close_date || undefined,
        is_manual: true
      });
      setSuccess('Trade added!');
      setTradeForm({ symbol: '', direction: 'buy', profit: '', volume: '', duration: '', account_type: '', close_date: '' });
      const trades = await getHighlightedTrades(selectedProfileId);
      setProfileTrades(trades);
    } catch (err) {
      setError('Failed to add trade');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveTrade = async (tradeId: string) => {
    if (!selectedProfileId) return;
    try {
      await removeHighlightedTrade(tradeId);
      const trades = await getHighlightedTrades(selectedProfileId);
      setProfileTrades(trades);
    } catch (err) {
      setError('Failed to remove trade');
    }
  };

  const handlePullTopTrades = async () => {
    if (!selectedProfileId || processing) return;
    setProcessing(true);
    try {
      await pullTopTradesFromHistory(selectedProfileId, 5);
      setSuccess('Top trades pulled from history!');
      const trades = await getHighlightedTrades(selectedProfileId);
      setProfileTrades(trades);
    } catch (err) {
      setError('Failed to pull trades. Trade history may be empty.');
    } finally {
      setProcessing(false);
    }
  };

  // Leaderboard handlers
  const handleCreateLeaderboardEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processing) return;
    setProcessing(true);
    try {
      await createLeaderboardEntry({
        user_id: leaderboardForm.user_id || undefined,
        display_name: leaderboardForm.display_name,
        total_payout: parseFloat(leaderboardForm.total_payout) || 0,
        account_type: leaderboardForm.account_type || undefined
      });
      setSuccess('Leaderboard entry created!');
      setShowLeaderboardModal(false);
      setLeaderboardForm({ display_name: '', total_payout: '', account_type: '', user_id: '' });
      await loadData();
    } catch (err) {
      setError('Failed to create entry');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleLeaderboardVisibility = async (entry: LeaderboardEntry) => {
    try {
      await updateLeaderboardEntry(entry.id, { is_visible: !entry.is_visible });
      await loadData();
    } catch (err) {
      setError('Failed to update entry');
    }
  };

  const handleDeleteLeaderboardEntry = async (id: string) => {
    try {
      await deleteLeaderboardEntry(id);
      await loadData();
    } catch (err) {
      setError('Failed to delete entry');
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      (p.display_name || '').toLowerCase().includes(q) ||
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }
  }, [error]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card-gradient rounded-2xl p-6 border border-white/5 animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-white/10 mb-4" />
              <div className="h-4 bg-white/10 rounded w-24 mb-1" />
              <div className="h-6 bg-white/10 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Trader Profiles & Leaderboard</h1>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">{success}</div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2">
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'profiles'
              ? 'bg-primary-500/20 text-primary-400'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          Profiles ({profiles.length})
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'leaderboard'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <Trophy className="w-4 h-4 inline mr-2" />
          Leaderboard ({leaderboardEntries.length})
        </button>
      </div>

      {activeTab === 'profiles' && (
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          {/* Search + Create */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search profiles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
              />
            </div>
            <button
              onClick={() => setShowCreateProfileModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Profile</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="pb-3 text-left text-gray-400 font-medium">Trader</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Payouts</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Certificates</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Public</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Featured</th>
                  <th className="pb-3 text-right text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No trader profiles found
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map(profile => (
                    <tr key={profile.id} className="border-b border-gray-700/50 hover:bg-white/5">
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {profile.display_name || profile.full_name || 'No Name'}
                            </div>
                            <div className="text-xs text-gray-500">{profile.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="font-bold text-emerald-400">
                          ${profile.total_payouts.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="text-white font-medium">{profile.total_certificates}</span>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => handleTogglePublic(profile)}
                          className={`p-2 rounded-lg transition-colors ${
                            profile.is_public
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-white/5 text-gray-500 hover:bg-white/10'
                          }`}
                          title={profile.is_public ? 'Make Private' : 'Make Public'}
                        >
                          {profile.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => handleToggleFeatured(profile)}
                          className={`p-2 rounded-lg transition-colors ${
                            profile.is_featured
                              ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                              : 'bg-white/5 text-gray-500 hover:bg-white/10'
                          }`}
                          title={profile.is_featured ? 'Unfeature' : 'Feature'}
                        >
                          {profile.is_featured ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(profile)}
                            className="p-2 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 transition-colors"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openTradeModal(profile.id)}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                            title="Manage Highlighted Trades"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <a
                            href={`/trader/${profile.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                            title="View Public Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Manual Leaderboard Entries</h2>
            <button
              onClick={() => setShowLeaderboardModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Entry</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="pb-3 text-left text-gray-400 font-medium">Name</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Payout</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Type</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Source</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Visible</th>
                  <th className="pb-3 text-right text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No manual leaderboard entries
                    </td>
                  </tr>
                ) : (
                  leaderboardEntries.map(entry => (
                    <tr key={entry.id} className="border-b border-gray-700/50 hover:bg-white/5">
                      <td className="py-4">
                        <span className="font-medium text-white">{entry.display_name}</span>
                      </td>
                      <td className="py-4">
                        <span className="font-bold text-emerald-400">
                          ${entry.total_payout.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-gray-400">{entry.account_type || '—'}</span>
                      </td>
                      <td className="py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          entry.is_manual
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-green-500/10 text-green-400'
                        }`}>
                          {entry.is_manual ? 'Manual' : 'Auto'}
                        </span>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => handleToggleLeaderboardVisibility(entry)}
                          className={`p-2 rounded-lg transition-colors ${
                            entry.is_visible
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-white/5 text-gray-500'
                          }`}
                        >
                          {entry.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => handleDeleteLeaderboardEntry(entry.id)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Highlighted Trades Modal */}
      {showTradeModal && selectedProfileId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Highlighted Trades</h3>
              <button
                onClick={() => { setShowTradeModal(false); setSelectedProfileId(null); }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pull from history button */}
            <button
              onClick={handlePullTopTrades}
              disabled={processing}
              className="mb-4 w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors border border-blue-500/20 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{processing ? 'Pulling...' : 'Pull Top 5 Trades from History'}</span>
            </button>

            {/* Existing trades */}
            {profileTrades.length > 0 && (
              <div className="mb-6 space-y-2">
                {profileTrades.map(trade => (
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center space-x-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        trade.direction === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {trade.direction.toUpperCase()}
                      </span>
                      <span className="text-sm text-white font-medium">{trade.symbol}</span>
                      <span className="text-sm text-emerald-400 font-bold">${trade.profit.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">{trade.is_manual ? 'Manual' : 'Auto'}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveTrade(trade.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add trade form */}
            <form onSubmit={handleAddTrade} className="space-y-3 border-t border-white/10 pt-4">
              <h4 className="text-sm font-semibold text-gray-400">Add Manual Trade</h4>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Symbol (e.g. XAUUSD)"
                  value={tradeForm.symbol}
                  onChange={e => setTradeForm(prev => ({ ...prev, symbol: e.target.value }))}
                  required
                  className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                />
                <select
                  value={tradeForm.direction}
                  onChange={e => setTradeForm(prev => ({ ...prev, direction: e.target.value as 'buy' | 'sell' }))}
                  className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Profit ($)"
                  value={tradeForm.profit}
                  onChange={e => setTradeForm(prev => ({ ...prev, profit: e.target.value }))}
                  required
                  className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Volume"
                  value={tradeForm.volume}
                  onChange={e => setTradeForm(prev => ({ ...prev, volume: e.target.value }))}
                  className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 1h 25m)"
                  value={tradeForm.duration}
                  onChange={e => setTradeForm(prev => ({ ...prev, duration: e.target.value }))}
                  className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                />
                <input
                  type="date"
                  value={tradeForm.close_date}
                  onChange={e => setTradeForm(prev => ({ ...prev, close_date: e.target.value }))}
                  className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                />
              </div>
              <button
                type="submit"
                disabled={processing}
                className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {processing ? 'Adding...' : 'Add Trade'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Leaderboard Entry Modal */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Add Leaderboard Entry</h3>
              <button
                onClick={() => setShowLeaderboardModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeaderboardEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Link to User (optional)</label>
                <select
                  value={leaderboardForm.user_id}
                  onChange={e => {
                    const uid = e.target.value;
                    setLeaderboardForm(prev => ({ ...prev, user_id: uid }));
                    if (uid) {
                      const u = users.find(u => u.id === uid);
                      if (u) setLeaderboardForm(prev => ({ ...prev, display_name: u.name }));
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                >
                  <option value="">No linked user (manual entry)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={leaderboardForm.display_name}
                  onChange={e => setLeaderboardForm(prev => ({ ...prev, display_name: e.target.value }))}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="Trader Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Total Payout ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={leaderboardForm.total_payout}
                    onChange={e => setLeaderboardForm(prev => ({ ...prev, total_payout: e.target.value }))}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Account Type</label>
                  <input
                    type="text"
                    value={leaderboardForm.account_type}
                    onChange={e => setLeaderboardForm(prev => ({ ...prev, account_type: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                    placeholder="$100K Challenge"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? 'Creating...' : 'Add to Leaderboard'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Profile Modal */}
      {showCreateProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Create Trader Profile</h3>
              <button
                onClick={() => setShowCreateProfileModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Select User</label>
                <select
                  value={profileForm.user_id}
                  onChange={e => {
                    const uid = e.target.value;
                    setProfileForm(prev => ({ ...prev, user_id: uid }));
                    if (uid) {
                      const u = users.find(u => u.id === uid);
                      if (u && !profileForm.display_name) {
                        setProfileForm(prev => ({ ...prev, display_name: u.name }));
                      }
                    }
                  }}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                >
                  <option value="">Select a user...</option>
                  {users.filter(u => !profiles.find(p => p.id === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Only users without profiles are shown</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={profileForm.display_name}
                  onChange={e => setProfileForm(prev => ({ ...prev, display_name: e.target.value }))}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="Trader's display name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Bio (optional)</label>
                <textarea
                  value={profileForm.bio}
                  onChange={e => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 resize-none"
                  placeholder="A brief description about this trader..."
                />
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.is_public}
                    onChange={e => setProfileForm(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="rounded bg-white/5 border-white/20 text-primary-500 focus:ring-primary-500/50"
                  />
                  <span className="text-sm text-gray-300">Public</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.is_featured}
                    onChange={e => setProfileForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                    className="rounded bg-white/5 border-white/20 text-yellow-500 focus:ring-yellow-500/50"
                  />
                  <span className="text-sm text-gray-300">Featured</span>
                </label>
              </div>

              {/* Social Proof Overrides */}
              <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-3">⚡ Social Proof Controls</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Custom Join Date</label>
                    <input
                      type="date"
                      value={profileForm.custom_joined_date}
                      onChange={e => setProfileForm(prev => ({ ...prev, custom_joined_date: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-yellow-500/50 text-sm"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Override "X days with FundedCobra". Leave empty = real date.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Total Payouts ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={profileForm.custom_total_payouts}
                        onChange={e => setProfileForm(prev => ({ ...prev, custom_total_payouts: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-yellow-500/50 text-sm"
                        placeholder="e.g. 25000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Certificates #</label>
                      <input
                        type="number"
                        min="0"
                        value={profileForm.custom_total_certificates}
                        onChange={e => setProfileForm(prev => ({ ...prev, custom_total_certificates: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-yellow-500/50 text-sm"
                        placeholder="e.g. 8"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? 'Creating...' : 'Create Profile'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Edit Profile</h3>
              <button
                onClick={() => { setShowEditProfileModal(false); setEditingProfile(null); }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-4 mb-4 p-4 rounded-lg bg-white/5">
              <div className="relative group flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-primary-500/50 transition-colors">
                  {editingProfile.avatar_url ? (
                    <img src={editingProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-500/20 to-emerald-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{editingProfile.full_name || editingProfile.display_name}</p>
                <p className="text-xs text-gray-500">{editingProfile.email}</p>
              </div>
            </div>

            <form onSubmit={handleEditProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={e => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 resize-none"
                  placeholder="A brief description about this trader..."
                />
              </div>

              {/* Social Proof Overrides */}
              <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-3">⚡ Social Proof Controls</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Custom Join Date</label>
                    <input
                      type="date"
                      value={editForm.custom_joined_date}
                      onChange={e => setEditForm(prev => ({ ...prev, custom_joined_date: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-yellow-500/50 text-sm"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Override "X days with FundedCobra". Clear to use real date.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Total Payouts ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.custom_total_payouts}
                        onChange={e => setEditForm(prev => ({ ...prev, custom_total_payouts: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-yellow-500/50 text-sm"
                        placeholder="e.g. 25000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Certificates #</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.custom_total_certificates}
                        onChange={e => setEditForm(prev => ({ ...prev, custom_total_certificates: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-yellow-500/50 text-sm"
                        placeholder="e.g. 8"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
