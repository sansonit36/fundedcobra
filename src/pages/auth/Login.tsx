import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Shield, Users, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const F = {
  head: "'Outfit', sans-serif",
  body: "'Plus Jakarta Sans', sans-serif",
};

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await signIn(email, password);
      if (error) { setError(error.message); return; }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060606', display: 'flex' }}>
      {/* LEFT: Brand Panel — desktop only */}
      <div style={{
        width: '45%', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} className="hidden lg:flex">
        {/* Gradient orbs */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', top: '20%', left: '20%', width: 500, height: 500, borderRadius: '50%', filter: 'blur(150px)', opacity: 0.2, background: '#bd4dd6' }} />
          <div style={{ position: 'absolute', bottom: '20%', right: '25%', width: 400, height: 400, borderRadius: '50%', filter: 'blur(120px)', opacity: 0.12, background: '#9333ea' }} />
        </div>
        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 48px' }}>
          <img src="/auth-trader.png" alt="FundedCobra Trader" style={{ width: 380, height: 'auto', objectFit: 'contain', marginBottom: 32, filter: 'drop-shadow(0 20px 60px rgba(189,77,214,0.3))' }} />

          <h2 style={{ fontFamily: F.head, fontSize: 34, fontWeight: 700, color: '#fff', marginBottom: 12, lineHeight: 1.15, letterSpacing: '-0.03em' }}>
            Trade with{' '}
            <span style={{ background: 'linear-gradient(135deg, #bd4dd6, #e879f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>our capital.</span>
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 15, fontWeight: 500, color: '#666', lineHeight: 1.6, maxWidth: 340, marginBottom: 32 }}>
            Join thousands of funded traders worldwide. Instant access to capital up to $200K.
          </p>

          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield style={{ width: 16, height: 16, color: 'rgba(189,77,214,0.5)' }} />
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: '#555' }}>256-bit Encrypted</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users style={{ width: 16, height: 16, color: 'rgba(189,77,214,0.5)' }} />
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: '#555' }}>47,000+ Traders</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <img src="/logo.png" alt="FundedCobra" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          </div>

          <div style={{
            borderRadius: 20, padding: '40px', border: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.98) 100%)',
          }}>
            <h1 style={{ fontFamily: F.head, fontSize: 30, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: '-0.03em' }}>Welcome back</h1>
            <p style={{ fontFamily: F.body, fontSize: 15, fontWeight: 500, color: '#666', marginBottom: 32 }}>Sign in to your trading dashboard</p>

            {error && (
              <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AlertCircle style={{ width: 20, height: 20, color: '#f87171', marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: '#f87171' }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontFamily: F.body, fontSize: 11, fontWeight: 700, color: '#777', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#444' }} />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading}
                    placeholder="you@example.com"
                    style={{ width: '100%', paddingLeft: 48, paddingRight: 16, paddingTop: 15, paddingBottom: 15, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontFamily: F.body, fontSize: 15, fontWeight: 500, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Password</label>
                  <Link to="/forgot-password" style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: 'rgba(189,77,214,0.7)', textDecoration: 'none' }}>Forgot password?</Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#444' }} />
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}
                    placeholder="Enter your password"
                    style={{ width: '100%', paddingLeft: 48, paddingRight: 48, paddingTop: 15, paddingBottom: 15, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontFamily: F.body, fontSize: 15, fontWeight: 500, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {showPassword ? <EyeOff style={{ width: 18, height: 18, color: '#555' }} /> : <Eye style={{ width: 18, height: 18, color: '#555' }} />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '16px 0', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #bd4dd6, #9333ea)',
                  boxShadow: loading ? 'none' : '0 4px 25px rgba(189,77,214,0.3)',
                  color: '#fff', fontFamily: F.head, fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  opacity: loading ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                {loading ? (
                  <>
                    <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>Sign In <ArrowRight style={{ width: 16, height: 16 }} /></>
                )}
              </button>
            </form>

            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
              <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: '#555' }}>
                Don't have an account?{' '}
                <Link to="/signup" style={{ color: '#bd4dd6', fontWeight: 700, textDecoration: 'none' }}>Create one</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: #444 !important; }
        input:focus { border-color: rgba(189,77,214,0.4) !important; box-shadow: 0 0 0 3px rgba(189,77,214,0.1) !important; }
      `}</style>
    </div>
  );
}