import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart2, Mail, Lock, User, AlertCircle } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src="/favicon.png" alt="FundedCobra Logo" className="w-32 h-32 object-contain drop-shadow-2xl" />
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <h1 className="text-2xl font-bold text-white text-center mb-2">Create an account</h1>
          <p className="text-gray-400 text-center mb-6">Get started with FundedCobra</p>

          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                  placeholder="Enter your name"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                  placeholder="Choose a password"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
