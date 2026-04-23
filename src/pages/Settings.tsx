import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Globe, AlertCircle, Check, Upload, Trash2, Shield, Bell, Smartphone, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, uploadProfileImage, getUserProfile } from '../lib/database';
import { COUNTRIES } from '../utils/countries';

export default function Settings() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || '');
  const [country, setCountry] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile(user!.id);
      setName(profile.name || '');
      setCountry(profile.country || '');
      setAvatarUrl(profile.avatar_url || '');
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setError(null);
    setSuccess(null);
    setUpdating(true);
    setUploadProgress(0);

    try {
      const url = await uploadProfileImage(user.id, file);
      setAvatarUrl(url);
      setSuccess('Profile image updated successfully');
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setUpdating(false);
      setUploadProgress(0);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      await updateUserProfile(user.id, {
        name,
        country
      });
      setSuccess('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const removeProfileImage = async () => {
    if (!user) return;

    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      await updateUserProfile(user.id, {});
      setAvatarUrl('');
      setSuccess('Profile image removed successfully');
    } catch (err) {
      console.error('Error removing profile image:', err);
      setError('Failed to remove profile image');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Profile Settings</h1>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start space-x-3">
          <Check className="w-5 h-5 text-green-400 mt-0.5" />
          <span className="text-green-400">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-[#bd4dd6]" />
            Profile Information
          </h2>
          
          {/* Profile Image */}
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                
                {/* Upload Progress Overlay */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">{uploadProgress}%</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={updating}
                    className="px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 font-medium rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Image</span>
                  </button>
                  
                  {avatarUrl && (
                    <button
                      onClick={removeProfileImage}
                      disabled={updating}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Supported formats: JPG, PNG. Max size: 5MB
                </p>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <form onSubmit={updateProfile} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#161616] border border-[#2A2A2A] text-white placeholder-gray-500 focus:outline-none focus:border-[#bd4dd6]"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#161616] border border-[#2A2A2A] text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Country Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Country
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 z-10" />
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#161616] border border-[#2A2A2A] text-white focus:outline-none focus:border-[#bd4dd6] appearance-none"
                >
                  <option value="" disabled>Select your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {/* Custom dropdown caret */}
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={updating}
              className="w-full py-3 px-4 bg-[#bd4dd6] hover:bg-[#aa44c0] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-[#bd4dd6]/20"
            >
              {updating ? 'Updating Profile...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Right Column: Preferences and Security */}
        <div className="space-y-6">
          {/* Notification Preferences */}
          <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-[#2A2A2A]">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#bd4dd6]" />
              Notification Preferences
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#161616] border border-[#2A2A2A]">
                 <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="text-white font-semibold text-sm">Email Alerts</h4>
                      <p className="text-xs text-gray-500">Receive payouts and milestone notifications via email.</p>
                    </div>
                 </div>
                 {/* Mock Toggle */}
                 <div className="w-11 h-6 rounded-full bg-[#bd4dd6] relative flex items-center cursor-pointer">
                    <div className="w-4 h-4 rounded-full bg-white absolute right-1 shadow-sm"></div>
                 </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#161616] border border-[#2A2A2A]">
                 <div className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="text-white font-semibold text-sm">SMS Authentication</h4>
                      <p className="text-xs text-gray-500">Enable text codes for withdrawal verification.</p>
                    </div>
                 </div>
                 {/* Mock Toggle */}
                 <div className="w-11 h-6 rounded-full bg-[#2A2A2A] relative flex items-center cursor-pointer">
                    <div className="w-4 h-4 rounded-full bg-gray-400 absolute left-1 shadow-sm"></div>
                 </div>
              </div>
            </div>
          </div>

           {/* Security Hub */}
           <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-[#2A2A2A]">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Security Hub
            </h2>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A]">
                 <div className="flex items-start gap-3 mb-4">
                    <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div>
                      <h4 className="text-white font-semibold text-sm">Two-Factor Authentication (2FA)</h4>
                      <p className="text-xs text-gray-500">Add an extra layer of security to your account.</p>
                    </div>
                 </div>
                 <button className="w-full py-2 bg-[#2A2A2A] hover:bg-[#404040] text-emerald-400 text-sm font-bold rounded-lg transition-colors border border-[#404040]">
                   Enable 2FA via Authenticator
                 </button>
              </div>

              <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A]">
                 <div className="flex items-start gap-3 mb-4">
                    <Key className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="text-white font-semibold text-sm">Password Management</h4>
                      <p className="text-xs text-gray-500">Update your login credentials securely.</p>
                    </div>
                 </div>
                 <button className="w-full py-2 bg-[#2A2A2A] hover:bg-[#404040] text-gray-300 text-sm font-bold rounded-lg transition-colors border border-[#404040]">
                   Change Password
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}