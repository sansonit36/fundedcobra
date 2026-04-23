import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldX, ArrowLeft, ExternalLink, User, Link2, Copy } from 'lucide-react';
import CertificateCard from '../../components/Certificate/CertificateCard';
import { getCertificateByNumber, getPublicTraderProfile } from '../../lib/certificates';
import type { PayoutCertificate, TraderProfile } from '../../lib/certificates';

export default function CertificateVerification() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [certificate, setCertificate] = useState<PayoutCertificate | null>(null);
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadCertificate();
  }, [certificateId]);

  const loadCertificate = async () => {
    if (!certificateId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const cert = await getCertificateByNumber(certificateId);
      if (!cert) {
        setNotFound(true);
      } else {
        setCertificate(cert);
        const profile = await getPublicTraderProfile(cert.user_id);
        setTraderProfile(profile);
      }
    } catch (err) {
      console.error('Error loading certificate:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1D9BF0]/30 border-t-[#1D9BF0] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8B949E] text-sm uppercase tracking-widest font-semibold">Verifying Document</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded border border-red-500/20 bg-red-500/5 flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#E6EDF3] mb-3">Document Not Found</h1>
          <p className="text-[#8B949E] mb-8 leading-relaxed">
            The verification ID provided does not match any official certificates in our database.
          </p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-[#21262D] hover:bg-[#30363D] text-[#E6EDF3] text-sm font-bold uppercase tracking-widest rounded transition-colors border border-[#30363D]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1117]">
      {/* Structural Header */}
      <header className="border-b border-[#30363D] bg-[#0E1117]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 opacity-90 transition-opacity hover:opacity-100">
            <img src="/logo.png" alt="FundedCobra" className="h-8 object-contain" />
          </Link>
          <div className="flex items-center space-x-6">
            <Link to="/leaderboard" className="text-xs font-semibold uppercase tracking-widest text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
              Public Ledger
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        
        {/* Top Verification Banner */}
        {certificate && (
          <div className="mb-8">
            <div className={`p-4 sm:p-6 rounded-sm border flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 ${
              certificate.is_verified
                ? 'bg-[#3FB950]/5 border-[#3FB950]/20'
                : 'bg-red-500/5 border-red-500/20'
            }`}>
              {certificate.is_verified ? (
                <>
                  <div className="p-3 bg-[#3FB950]/10 rounded-full flex-shrink-0 self-start sm:self-auto">
                    <ShieldCheck className="w-6 h-6 text-[#3FB950]" />
                  </div>
                  <div>
                    <p className="text-[#3FB950] font-bold tracking-wide uppercase text-sm">Official Document Verified</p>
                    <p className="text-[#8B949E] text-sm mt-1 leading-relaxed max-w-3xl">
                      This certificate is authentic and matches the official FundedCobra ledger. The payout amount, account specifications, and dates are confirmed directly against internal trading history.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-red-500/10 rounded-full flex-shrink-0 self-start sm:self-auto">
                    <ShieldX className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-red-500 font-bold tracking-wide uppercase text-sm">Unverified Document</p>
                    <p className="text-[#8B949E] text-sm mt-1 leading-relaxed">
                      This certificate could not be cryptographically matched against our ledger. Please verify the ID or contact support.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Core Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Certificate Display */}
          <div className="lg:col-span-8 flex flex-col space-y-6">
            {certificate && <CertificateCard certificate={certificate} />}
          </div>

          {/* Verification Sidebar Context */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            
            {/* Share Verification Status */}
            <div className="p-5 border border-[#30363D] bg-[#0E1117] rounded-sm">
              <h3 className="text-[11px] font-bold text-[#8B949E] uppercase tracking-widest mb-4">
                Share Verification Link
              </h3>
              <div className="flex bg-[#161B22] border border-[#30363D] rounded-sm overflow-hidden">
                <input 
                  type="text"
                  readOnly
                  value={window.location.href}
                  className="w-full bg-transparent px-3 py-2 text-[12px] text-[#E6EDF3] focus:outline-none font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-[#21262D] hover:bg-[#30363D] border-l border-[#30363D] text-[#E6EDF3] transition-colors flex items-center justify-center flex-shrink-0"
                  title="Copy link"
                >
                  {copied ? <ShieldCheck className="w-4 h-4 text-[#3FB950]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Profile Context */}
            {traderProfile && traderProfile.is_public && (
              <div className="p-6 border border-[#30363D] bg-[#0E1117] rounded-sm">
                <h3 className="text-[11px] font-bold text-[#8B949E] uppercase tracking-widest mb-6">
                  Trader Public Ledger
                </h3>
                
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 rounded bg-[#21262D] border border-[#30363D] flex flex-shrink-0 items-center justify-center overflow-hidden">
                    {traderProfile.avatar_url ? (
                      <img
                        src={traderProfile.avatar_url}
                        alt="Trader"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-[#8B949E]" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[#E6EDF3] font-bold truncate">
                      {traderProfile.display_name || traderProfile.full_name || 'Verified Trader'}
                    </p>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#1D9BF0]" />
                      <span className="text-[11px] text-[#1D9BF0] uppercase tracking-widest font-semibold">Active Member</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center border-b border-[#30363D] pb-3">
                    <span className="text-[#8B949E] text-[13px]">Total Rewarded</span>
                    <span className="text-[#3FB950] font-bold font-mono">
                      ${traderProfile.total_payouts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#30363D] pb-3">
                    <span className="text-[#8B949E] text-[13px]">Payout Count</span>
                    <span className="text-[#E6EDF3] font-bold font-mono">{traderProfile.total_certificates}</span>
                  </div>
                </div>

                <Link
                  to={`/trader/${traderProfile.id}`}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#E6EDF3] text-[11px] font-bold tracking-widest uppercase rounded-sm transition-colors"
                >
                  <span>View Public Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
