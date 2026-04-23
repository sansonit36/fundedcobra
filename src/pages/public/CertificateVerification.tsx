import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldX, ArrowLeft, ExternalLink, User } from 'lucide-react';
import CertificateCard from '../../components/Certificate/CertificateCard';
import { getCertificateByNumber, getPublicTraderProfile } from '../../lib/certificates';
import type { PayoutCertificate, TraderProfile } from '../../lib/certificates';

export default function CertificateVerification() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [certificate, setCertificate] = useState<PayoutCertificate | null>(null);
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
        // Load trader profile
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Certificate Not Found</h1>
          <p className="text-gray-400 mb-6">
            The certificate you're looking for doesn't exist or may have been removed.
            Please double-check the certificate ID or QR code.
          </p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header Bar */}
      <header className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src="/logo.png" alt="FundedCobra" className="h-10 object-contain" />
          </Link>
          <Link
            to="/leaderboard"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            View Leaderboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Verification Status Banner */}
        {certificate && (
          <div className={`mb-8 p-4 rounded-xl border flex items-center space-x-3 ${
            certificate.is_verified
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            {certificate.is_verified ? (
              <>
                <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-emerald-400 font-semibold">Certificate is verified by FundedCobra</p>
                  <p className="text-emerald-400/70 text-sm">
                    Check the name on your certificate to make sure it's the one you verified with QR.
                  </p>
                </div>
              </>
            ) : (
              <>
                <ShieldX className="w-6 h-6 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-semibold">This certificate could not be verified</p>
                  <p className="text-red-400/70 text-sm">
                    Please contact support if you believe this is an error.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Certificate Display */}
          <div className="lg:col-span-2">
            {certificate && <CertificateCard certificate={certificate} />}

            {/* Share Certificate */}
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ExternalLink className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-400">Share Certificate</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  // Could add a toast here
                }}
                className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10"
              >
                Copy Link
              </button>
            </div>
          </div>

          {/* Sidebar — Trader Info */}
          <div className="space-y-6">
            {/* Trader Profile Card */}
            {traderProfile && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10">
                    {traderProfile.avatar_url ? (
                      <img
                        src={traderProfile.avatar_url}
                        alt={traderProfile.display_name || ''}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">
                      {traderProfile.display_name || traderProfile.full_name || 'Trader'}
                    </h3>
                    {traderProfile.is_public && (
                      <span className="inline-flex items-center space-x-1 text-xs text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>FundedCobra Trader</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg bg-white/5 p-3 text-center border border-white/5">
                    <p className="text-lg font-bold text-white">{traderProfile.total_certificates}</p>
                    <p className="text-xs text-gray-400">Certificates</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-3 text-center border border-emerald-500/10">
                    <p className="text-lg font-bold text-emerald-400">
                      ${traderProfile.total_payouts.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">Total Rewarded</p>
                  </div>
                </div>

                {traderProfile.is_public && (
                  <Link
                    to={`/trader/${traderProfile.id}`}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-lg transition-colors border border-primary-500/20 text-sm font-medium"
                  >
                    <User className="w-4 h-4" />
                    <span>View Full Profile</span>
                  </Link>
                )}
              </div>
            )}

            {/* CTA */}
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-primary-500/5 to-emerald-500/5 p-6 text-center">
              <p className="text-sm text-gray-400 mb-1">Are you ready to become a</p>
              <p className="text-lg font-bold text-white mb-4">FundedCobra Trader?</p>
              <a
                href="https://fundedcobra.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
              >
                <span>Get Started</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-xs text-gray-600 text-center">
            All information provided on this site is intended solely for educational purposes related to trading on financial markets.
            FundedCobra provides simulated trading environments and educational tools for traders.
          </p>
          <p className="text-xs text-gray-600 text-center mt-2">
            {new Date().getFullYear()} © FundedCobra. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
