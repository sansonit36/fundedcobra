import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid reset session
    const checkSession = async () => {
      try {
        // Check for session and if it's a password recovery session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setValidSession(false);
          return;
        }

        // Check if we have a valid session or if this is a password recovery flow
        const urlParams = new URLSearchParams(window.location.search);
        const hasRecoveryParams = urlParams.has('access_token') || urlParams.has('refresh_token');
        
        if (session || hasRecoveryParams) {
          setValidSession(true);
        } else {
          setValidSession(false);
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setValidSession(false);
      }
    };
    
    checkSession();
  }, [navigate]);

  // Password strength
  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ['', '#ef4444', '#f59e0b', '#10B981'];
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];

  // Show loading while checking session
  if (validSession === null) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent border-t-[#bd4dd6] mb-4" />
          <p className="text-gray-500 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Show error if invalid session
  if (validSession === false) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <img src="/logo.png" alt="FundedCobra" className="w-16 h-16 object-contain drop-shadow-2xl" />
          </div>

          <div className="rounded-2xl p-8 lg:p-10 border border-white/[0.06] text-center" style={{ background: 'linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.98) 100%)' }}>
            <div className="mb-5 flex justify-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-500/5">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <h2 className="text-xl text-white mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>Invalid Reset Link</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center w-full px-4 py-4 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                background: 'linear-gradient(135deg, #bd4dd6, #9333ea)',
                boxShadow: '0 4px 25px rgba(189,77,214,0.3)'
              }}
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      setSuccess(true);

      // Sign out after successful password reset
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060606] flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* LEFT: Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center p-16">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 bg-[#bd4dd6] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15 bg-[#f59e0b]" />
        </div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div className="relative z-10 max-w-md">
          <img src="/logo.png" alt="FundedCobra" className="w-20 h-20 object-contain mb-10 drop-shadow-2xl" />
          <h2 className="text-4xl text-white mb-4 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
            Create your <span className="bg-gradient-to-r from-[#bd4dd6] to-[#e879f9] bg-clip-text text-transparent">new password.</span>
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-12">
            Choose a strong, unique password to keep your trading account secure.
          </p>
          
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#bd4dd6]/10">
              <Shield className="w-4 h-4 text-[#bd4dd6]" />
            </div>
            <span className="text-sm">AES-256 encrypted storage</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <img src="/logo.png" alt="FundedCobra" className="w-16 h-16 object-contain drop-shadow-2xl" />
          </div>

          <div className="rounded-2xl p-8 lg:p-10 border border-white/[0.06]" style={{ background: 'linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.98) 100%)' }}>
            <h1 className="text-3xl text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>New password</h1>
            <p className="text-gray-500 text-sm mb-8">Enter your new password below.</p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/15 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {success ? (
              <div className="text-center py-4">
                <div className="mb-5 flex justify-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))' }}>
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
                <h2 className="text-xl text-white mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>Password updated!</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Your password has been reset successfully. Redirecting to login...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-gray-600 focus:outline-none focus:border-[#bd4dd6]/40 focus:ring-1 focus:ring-[#bd4dd6]/20 transition-all text-sm"
                      placeholder="Enter new password"
                      required
                      disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 flex gap-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ backgroundColor: i <= passwordStrength ? strengthColors[passwordStrength] : 'rgba(255,255,255,0.05)' }} />
                        ))}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: strengthColors[passwordStrength] }}>{strengthLabels[passwordStrength]}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-gray-600 focus:outline-none focus:border-[#bd4dd6]/40 focus:ring-1 focus:ring-[#bd4dd6]/20 transition-all text-sm"
                      placeholder="Confirm new password"
                      required
                      disabled={loading}
                    />
                  </div>
                  {/* Match indicator */}
                  {confirmPassword.length > 0 && (
                    <p className={`mt-2 text-[10px] font-semibold uppercase tracking-wider ${password === confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                      {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 text-white font-bold text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
                  style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    background: 'linear-gradient(135deg, #bd4dd6, #9333ea)',
                    boxShadow: loading ? 'none' : '0 4px 25px rgba(189,77,214,0.3)'
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}