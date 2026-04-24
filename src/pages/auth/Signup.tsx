import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, ArrowRight, Eye, EyeOff, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { notifyAffiliateRegistration } from '../../affiliateApi';
import { sendEmail, logEmailSent } from '../../lib/emailService';

const F = {
  head: "'Outfit', sans-serif",
  body: "'Plus Jakarta Sans', sans-serif",
};

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

const inputBase: React.CSSProperties = {
  width: '100%', paddingTop: 14, paddingBottom: 14, borderRadius: 12,
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff', fontFamily: F.body, fontSize: 14, fontWeight: 500, outline: 'none', boxSizing: 'border-box',
};

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

  const refParam = useRef<string | null>(null);
  useEffect(() => {
    const urlRef = new URL(window.location.href).searchParams.get('ref');
    if (urlRef) { refParam.current = urlRef; localStorage.setItem('affiliate_ref', urlRef); }
    else { const s = localStorage.getItem('affiliate_ref'); if (s) refParam.current = s; }
  }, []);

  const syncAffiliatePHP = async (uid: string) => {
    try { await notifyAffiliateRegistration({ userId: uid, name, email }); } catch (err) { console.warn('Affiliate register notify failed', err); }
  };
  const sendWelcomeEmail = async (uid: string) => {
    try { await sendEmail({ to: email, template: 'welcome', data: { name } }); await logEmailSent(uid, 'welcome'); } catch (err) { console.warn('Welcome email failed', err); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }
    if (!country) { setError('Please select your country'); setLoading(false); return; }

    const refCode = refParam.current || localStorage.getItem('affiliate_ref') || undefined;
    const { error: signErr } = await signUp(email, password, name, refCode, country);
    if (signErr) { setError(signErr.message); setLoading(false); return; }

    const { data, error: getUserErr } = await supabase.auth.getUser();
    if (getUserErr) console.warn(getUserErr);
    const uid = data?.user?.id;
    if (uid) { syncAffiliatePHP(uid); sendWelcomeEmail(uid); }
    else {
      const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.id) {
          try { await syncAffiliatePHP(session.user.id); await sendWelcomeEmail(session.user.id); } finally { sub.subscription.unsubscribe(); }
        }
      });
    }
    setLoading(false);
    navigate('/dashboard');
  };

  const pStr = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const sColors = ['', '#ef4444', '#f59e0b', '#10B981'];
  const sLabels = ['', 'Weak', 'Good', 'Strong'];
  const match = confirmPassword.length > 0 && password === confirmPassword;

  const labelStyle: React.CSSProperties = { display: 'block', fontFamily: F.body, fontSize: 11, fontWeight: 700, color: '#777', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' };

  return (
    <div style={{ minHeight: '100vh', background: '#060606', display: 'flex' }}>
      {/* LEFT: Brand Panel */}
      <div className="auth-brand-panel" style={{ width: '45%', position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', top: '25%', left: '20%', width: 500, height: 500, borderRadius: '50%', filter: 'blur(150px)', opacity: 0.2, background: '#bd4dd6' }} />
          <div style={{ position: 'absolute', bottom: '20%', right: '25%', width: 400, height: 400, borderRadius: '50%', filter: 'blur(120px)', opacity: 0.12, background: '#9333ea' }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 40px' }}>
          <h2 style={{ fontFamily: F.head, fontSize: 34, fontWeight: 700, color: '#fff', marginBottom: 12, lineHeight: 1.15, letterSpacing: '-0.03em' }}>
            Your trading journey{' '}
            <span style={{ background: 'linear-gradient(135deg, #bd4dd6, #e879f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>starts here.</span>
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 15, fontWeight: 500, color: '#666', lineHeight: 1.6, maxWidth: 340, marginBottom: 28 }}>
            Get instant access to funded accounts up to $200K. No experience required.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, width: '100%', maxWidth: 360, marginBottom: 32 }}>
            {[{ n: '47K+', l: 'Traders' }, { n: '$12M+', l: 'Funded' }, { n: '120+', l: 'Countries' }].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: F.head, fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em' }}>{s.n}</div>
                <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: '#555', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{s.l}</div>
              </div>
            ))}
          </div>

          <img src="/auth-team.png" alt="FundedCobra Team" style={{ width: '100%', maxWidth: 480, height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 20px 60px rgba(189,77,214,0.25))' }} />
        </div>
      </div>

      {/* RIGHT: Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div className="auth-mobile-logo" style={{ justifyContent: 'center', marginBottom: 32 }}>
            <img src="/logo.png" alt="FundedCobra" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          </div>

          <div style={{
            borderRadius: 20, padding: 40, border: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.98) 100%)',
          }}>
            <h1 style={{ fontFamily: F.head, fontSize: 30, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: '-0.03em' }}>Create account</h1>
            <p style={{ fontFamily: F.body, fontSize: 15, fontWeight: 500, color: '#666', marginBottom: 32 }}>Start your funded trading journey today</p>

            {error && (
              <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AlertCircle style={{ width: 20, height: 20, color: '#f87171', marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: '#f87171' }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignup}>
              {/* Name + Country */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#444' }} />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading}
                      placeholder="Your name" style={{ ...inputBase, paddingLeft: 48, paddingRight: 16 }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Country</label>
                  <div style={{ position: 'relative' }}>
                    <Globe style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#444', zIndex: 1 }} />
                    <select value={country} onChange={(e) => setCountry(e.target.value)} required disabled={loading}
                      style={{ ...inputBase, paddingLeft: 48, paddingRight: 32, appearance: 'none', cursor: 'pointer', colorScheme: 'dark' } as React.CSSProperties}>
                      <option value="" style={{ background: '#111', color: '#555' }}>Select</option>
                      {COUNTRIES.map(c => <option key={c} value={c} style={{ background: '#111', color: '#fff' }}>{c}</option>)}
                    </select>
                    <svg style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, pointerEvents: 'none' }} fill="none" stroke="#555" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#444' }} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading}
                    placeholder="you@example.com" style={{ ...inputBase, paddingLeft: 48, paddingRight: 16 }} />
                </div>
              </div>

              {/* Password + Confirm */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#444' }} />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}
                      placeholder="Min. 6 chars" style={{ ...inputBase, paddingLeft: 48, paddingRight: 40 }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {showPassword ? <EyeOff style={{ width: 16, height: 16, color: '#555' }} /> : <Eye style={{ width: 16, height: 16, color: '#555' }} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Confirm</label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#444' }} />
                    <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading}
                      placeholder="Re-enter"
                      style={{
                        ...inputBase, paddingLeft: 48, paddingRight: 16,
                        borderColor: confirmPassword.length > 0 ? (match ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)') : 'rgba(255,255,255,0.08)',
                      }} />
                  </div>
                </div>
              </div>

              {/* Strength + match */}
              {(password.length > 0 || confirmPassword.length > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
                  {password.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                        {[1, 2, 3].map(i => (
                          <div key={i} style={{ height: 3, flex: 1, borderRadius: 4, transition: 'all 0.3s', background: i <= pStr ? sColors[pStr] : 'rgba(255,255,255,0.05)' }} />
                        ))}
                      </div>
                      <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: sColors[pStr], whiteSpace: 'nowrap' }}>{sLabels[pStr]}</span>
                    </div>
                  )}
                  {confirmPassword.length > 0 && (
                    <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: match ? '#10B981' : '#ef4444', whiteSpace: 'nowrap' }}>
                      {match ? 'Match' : 'Mismatch'}
                    </span>
                  )}
                </div>
              )}

              {!(password.length > 0 || confirmPassword.length > 0) && <div style={{ marginBottom: 20 }} />}

              <button type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '16px 0', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #bd4dd6, #9333ea)',
                  boxShadow: loading ? 'none' : '0 4px 25px rgba(189,77,214,0.3)',
                  color: '#fff', fontFamily: F.head, fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  opacity: loading ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
                }}
              >
                {loading ? (
                  <>
                    <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>Create Account <ArrowRight style={{ width: 16, height: 16 }} /></>
                )}
              </button>
            </form>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
              <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: '#555' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#bd4dd6', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder, select { color: #444 !important; }
        input:focus, select:focus { border-color: rgba(189,77,214,0.4) !important; box-shadow: 0 0 0 3px rgba(189,77,214,0.1) !important; }
        .auth-brand-panel { display: none; }
        .auth-mobile-logo { display: flex; }
        @media (min-width: 1024px) {
          .auth-brand-panel { display: flex; }
          .auth-mobile-logo { display: none; }
        }
      `}</style>
    </div>
  );
}
