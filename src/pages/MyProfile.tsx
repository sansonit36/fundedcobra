import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Eye, EyeOff, ExternalLink, ShieldCheck, Award, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getPublicTraderProfile, getCertificatesByUser,
  updateTraderProfile
} from '../lib/certificates';
import CertificateCard from '../components/Certificate/CertificateCard';
import type { PayoutCertificate, TraderProfile } from '../lib/certificates';

export default function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [certificates, setCertificates] = useState<PayoutCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // Default user info (fallback)
  const [defaultName, setDefaultName] = useState('');
  const [defaultEmail, setDefaultEmail] = useState('');

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      // Get default profile info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, name, email')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setDefaultName(profileData.full_name || profileData.name || '');
        setDefaultEmail(profileData.email || user.email || '');
      }

      // Get trader profile (if exists)
      const traderProfile = await getPublicTraderProfile(user.id);
      if (traderProfile) {
        setProfile(traderProfile);
        setHasProfile(true);
        setDisplayName(traderProfile.display_name || traderProfile.full_name || '');
        setBio(traderProfile.bio || '');
        setIsPublic(traderProfile.is_public);
      } else {
        // No profile yet — prefill with defaults
        setDisplayName(profileData?.full_name || profileData?.name || '');
        setIsPublic(false);
      }

      // Get certificates
      const certs = await getCertificatesByUser(user.id);
      setCertificates(certs);
    } catch (err) {
      console.error('Error loading profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (hasProfile) {
        // Update existing profile
        await updateTraderProfile(user.id, {
          display_name: displayName,
          bio: bio || undefined,
          is_public: isPublic
        });
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('trader_profiles')
          .insert({
            id: user.id,
            display_name: displayName,
            bio: bio || null,
            is_public: isPublic,
            is_featured: false,
            total_payouts: 0,
            total_certificates: certificates.length
          });
        if (insertError) throw insertError;
        setHasProfile(true);
      }
      setSuccess('Profile saved successfully!');
      await loadData();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card-gradient rounded-2xl p-8 border border-white/5">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-white/10 rounded w-40 animate-pulse" />
              <div className="h-4 bg-white/10 rounded w-60 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Public Profile</h1>
            <p className="text-sm text-gray-400">Customize how other traders see you</p>
          </div>
        </div>
        {isPublic && hasProfile && (
          <Link
            to={`/trader/${user?.id}`}
            target="_blank"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View public page</span>
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">{success}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-gradient rounded-2xl p-6 border border-white/5">
            <h2 className="text-lg font-bold text-white mb-4">Profile Details</h2>

            {!hasProfile && (
              <div className="mb-6 p-4 rounded-lg bg-primary-500/10 border border-primary-500/20">
                <p className="text-sm text-primary-400">
                  <strong>You haven't set up your public profile yet.</strong> Fill in the details below and save to create your profile.
                  Until then, your certificates will use your default account info.
                </p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 transition-colors"
                  placeholder="How should we display your name?"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is how your name appears on certificates and your public profile.
                  Default: <span className="text-gray-400">{defaultName || defaultEmail}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 transition-colors resize-none"
                  placeholder="Tell other traders about yourself, your trading style, experience..."
                  maxLength={500}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-500">Optional. Visible on your public profile.</p>
                  <p className="text-xs text-gray-500">{bio.length}/500</p>
                </div>
              </div>

              {/* Public Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center space-x-3">
                  {isPublic ? (
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                      <EyeOff className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">Public Profile</p>
                    <p className="text-xs text-gray-400">
                      {isPublic
                        ? 'Your profile is visible to everyone'
                        : 'Your profile is private — only you can see it'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isPublic ? 'bg-emerald-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      isPublic ? 'left-6' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving || !displayName.trim()}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{hasProfile ? 'Save Changes' : 'Create Profile'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar — Preview & Certificates */}
        <div className="space-y-6">
          {/* Profile Preview */}
          <div className="card-gradient rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Preview</h3>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10">
                <User className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="font-bold text-white">
                  {displayName || defaultName || 'Your Name'}
                </p>
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-emerald-400">FundedCobra Trader</span>
                </div>
              </div>
            </div>
            {bio && (
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">{bio}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-bold text-white">{certificates.length}</p>
                <p className="text-xs text-gray-400">Certificates</p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                <p className="text-lg font-bold text-emerald-400">
                  ${certificates.reduce((sum, c) => sum + c.payout_amount, 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">Rewarded</p>
              </div>
            </div>
            <div className={`mt-4 p-2 rounded-lg text-center text-xs font-medium ${
              isPublic
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-white/5 text-gray-500 border border-white/5'
            }`}>
              {isPublic ? '🌐 Public — Anyone can see this' : '🔒 Private — Only you can see this'}
            </div>
          </div>

          {/* My Certificates */}
          <div className="card-gradient rounded-2xl p-6 border border-white/5">
            <div className="flex items-center space-x-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                My Certificates
              </h3>
              <span className="text-xs text-gray-500">{certificates.length}</span>
            </div>

            {certificates.length === 0 ? (
              <div className="text-center py-6">
                <Award className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No certificates yet</p>
                <p className="text-xs text-gray-500 mt-1">Request a payout to earn your first certificate</p>
              </div>
            ) : (
              <div className="space-y-3">
                {certificates.slice(0, 3).map(cert => (
                  <Link key={cert.id} to={`/verify/${cert.certificate_number}`} target="_blank">
                    <CertificateCard certificate={cert} compact />
                  </Link>
                ))}
                {certificates.length > 3 && (
                  <p className="text-xs text-center text-gray-500 pt-2">
                    +{certificates.length - 3} more certificates
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
