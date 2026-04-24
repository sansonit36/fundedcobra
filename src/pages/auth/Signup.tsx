import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Shield, Users, ArrowRight, Eye, EyeOff, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { notifyAffiliateRegistration } from '../../affiliateApi';
import { sendEmail, logEmailSent } from '../../lib/emailService';

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia",
  "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon",
  "Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia",
  "Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominican Republic","DR Congo","Ecuador","Egypt",
  "El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon",
  "Gambia","Georgia","Germany","Ghana","Greece","Guatemala","Guinea","Guyana","Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan",
  "Kenya","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova",
  "Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nepal","Netherlands",
  "New Zealand","Nicaragua","Niger","Nigeria","North Macedonia","Norway","Oman","Pakistan","Palestine","Panama",
  "Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda",
  "Saudi Arabia","Senegal","Serbia","Sierra Leone","Singapore","Slovakia","Slovenia","Somalia","South Africa",
  "South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan",
  "Tajikistan","Tanzania","Thailand","Togo","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Uganda",
  "Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam",
  "Yemen","Zambia","Zimbabwe"
];

export default function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Read ?ref once (fallback if cookie doesn't stick)
  const refParam = useRef<string | null>(null);
  useEffect(() => {
    const urlRef = new URL(window.location.href).searchParams.get('ref');
    if (urlRef) {
      refParam.current = urlRef;
      localStorage.setItem('affiliate_ref', urlRef);
    } else {
      const storedRef = localStorage.getItem('affiliate_ref');
      if (storedRef) refParam.current = storedRef;
    }
  }, []);

  // Helper: notify legacy PHP affiliate system
  const syncAffiliatePHP = async (uid: string) => {
    try {
      await notifyAffiliateRegistration({ userId: uid, name, email });
    } catch (err) {
      console.warn('Affiliate register notify failed', err);
    }
  };
  
  // Helper: send welcome email
  const sendWelcomeEmail = async (uid: string) => {
    try {
      await sendEmail({ to: email, template: 'welcome', data: { name } });
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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!country) {
      setError('Please select your country');
      setLoading(false);
      return;
    }

    const refCode = refParam.current || localStorage.getItem('affiliate_ref') || undefined;
    const { error: signErr } = await signUp(email, password, name, refCode, country);
    if (signErr) {
      setError(signErr.message);
      setLoading(false);
      return;
    }

    const { data, error: getUserErr } = await supabase.auth.getUser();
    if (getUserErr) console.warn(getUserErr);

    const immediateUserId = data?.user?.id;
    if (immediateUserId) {
      syncAffiliatePHP(immediateUserId);
      sendWelcomeEmail(immediateUserId);
    } else {
      const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.id) {
          try {
            await syncAffiliatePHP(session.user.id);
            await sendWelcomeEmail(session.user.id);
          } finally {
            sub.subscription.unsubscribe();
          }
        }
      });
    }

    setLoading(false);
    navigate('/dashboard');
  };

  // Password strength
  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ['', '#ef4444', '#f59e0b', '#10B981'];
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const inputStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: '14px', fontWeight: 500 };
  const labelStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: '0.08em' };

  return (
    <div className="min-h-screen bg-[#060606] flex">
      {/* LEFT: Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 bg-[#bd4dd6] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15 bg-[#9333ea]" />
        </div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div className="relative z-10 flex flex-col items-center text-center px-10">
          {/* Team hero image */}
          <img src="/auth-team.png" alt="FundedCobra Team" className="w-full max-w-[480px] h-auto object-contain mb-8 drop-shadow-[0_20px_60px_rgba(189,77,214,0.25)]" />
          
          <h2 className="text-[32px] text-white mb-3 leading-[1.15]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>
            Your trading journey{' '}
            <span style={{ background: 'linear-gradient(135deg, #bd4dd6, #e879f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>starts here.</span>
          </h2>
          <p className="text-[#666] text-[14px] leading-relaxed mb-8 max-w-[340px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>
            Get instant access to funded accounts up to $200K. No experience required.
          </p>
          
          {/* Big trust numbers */}
          <div className="grid grid-cols-3 gap-6 mb-6 w-full max-w-[360px]">
            <div className="text-center">
              <div className="text-[24px] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>47K+</div>
              <div className="text-[10px] text-[#555] mt-1 uppercase" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: '0.1em' }}>Traders</div>
            </div>
            <div className="text-center">
              <div className="text-[24px] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>$12M+</div>
              <div className="text-[10px] text-[#555] mt-1 uppercase" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: '0.1em' }}>Funded</div>
            </div>
            <div className="text-center">
              <div className="text-[24px] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>120+</div>
              <div className="text-[10px] text-[#555] mt-1 uppercase" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: '0.1em' }}>Countries</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <img src="/logo.png" alt="FundedCobra" className="w-16 h-16 object-contain drop-shadow-2xl" />
          </div>

          <div className="rounded-[20px] p-8 lg:p-10 border border-white/[0.06]" style={{ background: 'linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.98) 100%)' }}>
            <h1 className="text-[28px] text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>Create account</h1>
            <p className="text-[#666] text-[14px] mb-8" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Start your funded trading journey today</p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/15 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-red-400 text-[13px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              {/* Name + Country row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-[#888] mb-2.5 uppercase" style={labelStyle}>Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#444]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-[14px] rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-[#444] focus:outline-none focus:border-[#bd4dd6]/40 focus:ring-1 focus:ring-[#bd4dd6]/20 transition-all"
                      style={inputStyle}
                      placeholder="Your name"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-[#888] mb-2.5 uppercase" style={labelStyle}>Country</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#444] z-10" />
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-12 pr-8 py-[14px] rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-[#bd4dd6]/40 focus:ring-1 focus:ring-[#bd4dd6]/20 transition-all appearance-none cursor-pointer"
                      style={{ ...inputStyle, colorScheme: 'dark' }}
                      required
                      disabled={loading}
                    >
                      <option value="" className="bg-[#111] text-[#555]">Select</option>
                      {COUNTRIES.map(c => (
                        <option key={c} value={c} className="bg-[#111] text-white">{c}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-3 h-3 text-[#555]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] text-[#888] mb-2.5 uppercase" style={labelStyle}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#444]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-[14px] rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-[#444] focus:outline-none focus:border-[#bd4dd6]/40 focus:ring-1 focus:ring-[#bd4dd6]/20 transition-all"
                    style={inputStyle}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password + Confirm row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-[#888] mb-2.5 uppercase" style={labelStyle}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#444]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-11 py-[14px] rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-[#444] focus:outline-none focus:border-[#bd4dd6]/40 focus:ring-1 focus:ring-[#bd4dd6]/20 transition-all"
                      style={inputStyle}
                      placeholder="Min. 6 chars"
                      required
                      disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#888] transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-[#888] mb-2.5 uppercase" style={labelStyle}>Confirm</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#444]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-12 pr-4 py-[14px] rounded-xl bg-white/[0.03] border text-white placeholder-[#444] focus:outline-none transition-all ${
                        confirmPassword.length > 0
                          ? passwordsMatch
                            ? 'border-emerald-500/30 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
                            : 'border-red-500/30 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20'
                          : 'border-white/[0.08] focus:border-[#bd4dd6]/40 focus:ring-1 focus:ring-[#bd4dd6]/20'
                      }`}
                      style={inputStyle}
                      placeholder="Re-enter"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Password strength + match indicator */}
              {(password.length > 0 || confirmPassword.length > 0) && (
                <div className="flex items-center justify-between gap-4">
                  {password.length > 0 && (
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ backgroundColor: i <= passwordStrength ? strengthColors[passwordStrength] : 'rgba(255,255,255,0.05)' }} />
                        ))}
                      </div>
                      <span className="text-[10px] uppercase whitespace-nowrap" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '0.08em', color: strengthColors[passwordStrength] }}>{strengthLabels[passwordStrength]}</span>
                    </div>
                  )}
                  {confirmPassword.length > 0 && (
                    <span className={`text-[10px] uppercase whitespace-nowrap ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '0.08em' }}>
                      {passwordsMatch ? 'Match' : 'Mismatch'}
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-[15px] text-white rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const,
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
                    Creating account...
                  </>
                ) : (
                  <>Create Account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/[0.04] text-center">
              <p className="text-[#555] text-[14px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>
                Already have an account?{' '}
                <Link to="/login" className="text-[#bd4dd6] hover:text-[#e879f9] transition-colors" style={{ fontWeight: 600 }}>
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
