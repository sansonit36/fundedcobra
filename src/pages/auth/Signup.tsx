import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Shield, Users, ArrowRight, Eye, EyeOff, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { notifyAffiliateRegistration } from '../../affiliateApi';
import { sendEmail, logEmailSent } from '../../lib/emailService';

export default function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Read ?ref once (fallback if cookie doesn't stick)
  const refParam = useRef<string | null>(null);
  useEffect(() => {
    const urlRef = new URL(window.location.href).searchParams.get('ref');
    if (urlRef) {
      refParam.current = urlRef;
      // Store in localStorage as backup
      localStorage.setItem('affiliate_ref', urlRef);
      console.log('📎 Referral code detected:', urlRef);
    } else {
      // Try to get from localStorage if URL doesn't have it
      const storedRef = localStorage.getItem('affiliate_ref');
      if (storedRef) {
        refParam.current = storedRef;
        console.log('📎 Referral code from storage:', storedRef);
      } else {
        console.log('ℹ️ No referral code found');
      }
    }
  }, []);

  // Helper: notify legacy PHP affiliate system
  const syncAffiliatePHP = async (uid: string) => {
    try {
      // Also call external PHP API for compatibility
      await notifyAffiliateRegistration({
        userId: uid,
        name,
        email
      });
    } catch (err) {
      // Don't block signup UX if affiliate notify fails
      console.warn('Affiliate register notify failed', err);
    }
  };
  
  // Helper: send welcome email
  const sendWelcomeEmail = async (uid: string) => {
    try {
      await sendEmail({
        to: email,
        template: 'welcome',
        data: { name }
      });
      await logEmailSent(uid, 'welcome');
    } catch (err) {
      console.warn('Welcome email failed', err);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    // 1) Create the auth user with the referral code embedded in metadata
    const refCode = refParam.current || localStorage.getItem('affiliate_ref') || undefined;
    const { error: signErr } = await signUp(email, password, name, refCode);
    if (signErr) {
      setError(signErr.message);
      setLoading(false);
      return;
    }

    // 2) Try to get the user immediately (works when auto sign-in is enabled)
    const { data, error: getUserErr } = await supabase.auth.getUser();
    if (getUserErr) console.warn(getUserErr);

    const immediateUserId = data?.user?.id;
    if (immediateUserId) {
      // 3) Notify affiliate system now
      syncAffiliatePHP(immediateUserId);
      // 4) Send welcome email
      sendWelcomeEmail(immediateUserId);
    } else {
      // 4) Handle projects that require email confirmation → wait for SIGNED_IN
      const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.id) {
          try {
            await syncAffiliatePHP(session.user.id);
            await sendWelcomeEmail(session.user.id);
          } finally {
            sub.subscription.unsubscribe(); // cleanup listener
          }
        }
      });
      // Note: we still navigate; affiliate notify will run when SIGNED_IN fires
    }

    setLoading(false);
    navigate('/dashboard');
  };

  // Password strength
  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ['', '#ef4444', '#f59e0b', '#10B981'];
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];

  return (
    <div className="min-h-screen bg-[#060606] flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* LEFT: Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center p-16">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 bg-[#10B981] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15 bg-[#bd4dd6]" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 bg-[#3B82F6]" />
        </div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div className="relative z-10 max-w-md">
          <img src="/logo.png" alt="FundedCobra" className="w-20 h-20 object-contain mb-10 drop-shadow-2xl" />
          <h2 className="text-4xl text-white mb-4 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
            Your trading journey <span className="bg-gradient-to-r from-[#10B981] to-[#34d399] bg-clip-text text-transparent">starts here.</span>
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-12">
            Create your free account in 30 seconds and get instant access to funding up to $200K. No experience required.
          </p>
          
          <div className="space-y-4">
            {[
              { icon: Zap, text: 'Instant account setup', color: '#bd4dd6' },
              { icon: Shield, text: 'Your data is encrypted and secure', color: '#10B981' },
              { icon: Users, text: 'Join 2,500+ active traders', color: '#3B82F6' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-gray-500">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}10` }}>
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
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
            <h1 className="text-3xl text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>Create account</h1>
            <p className="text-gray-500 text-sm mb-8">Start your funded trading journey today</p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/15 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-gray-600 focus:outline-none focus:border-[#10B981]/40 focus:ring-1 focus:ring-[#10B981]/20 transition-all text-sm"
                    placeholder="Your full name"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-gray-600 focus:outline-none focus:border-[#10B981]/40 focus:ring-1 focus:ring-[#10B981]/20 transition-all text-sm"
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-gray-600 focus:outline-none focus:border-[#10B981]/40 focus:ring-1 focus:ring-[#10B981]/20 transition-all text-sm"
                    placeholder="Min. 6 characters"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 text-white font-bold text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  boxShadow: loading ? 'none' : '0 4px 25px rgba(16,185,129,0.3)'
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>Create Account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/[0.04] text-center">
              <p className="text-gray-500 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-[#10B981] hover:text-[#34d399] font-semibold transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
