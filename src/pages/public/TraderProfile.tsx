import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Award, TrendingUp, ArrowUpRight, ArrowDownRight, ExternalLink, ChevronLeft, ShieldCheck, Calendar } from 'lucide-react';
import CertificateCard from '../../components/Certificate/CertificateCard';
import {
  getPublicTraderProfile,
  getCertificatesByUser,
  getHighlightedTrades
} from '../../lib/certificates';
import type { PayoutCertificate, TraderProfile as TraderProfileType, HighlightedTrade } from '../../lib/certificates';

export default function TraderProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<TraderProfileType | null>(null);
  const [certificates, setCertificates] = useState<PayoutCertificate[]>([]);
  const [highlightedTrades, setHighlightedTrades] = useState<HighlightedTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'certificates'>('home');
  const [showAllCerts, setShowAllCerts] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const [profileData, certsData, tradesData] = await Promise.all([
        getPublicTraderProfile(userId),
        getCertificatesByUser(userId),
        getHighlightedTrades(userId)
      ]);

      if (!profileData || !profileData.is_public) {
        setNotFound(true);
      } else {
        setProfile(profileData);
        setCertificates(certsData);
        setHighlightedTrades(tradesData);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading trader profile...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Profile Not Available</h1>
          <p className="text-gray-400 mb-6">
            This trader's profile is either private or doesn't exist.
          </p>
          <Link
            to="/leaderboard"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
          >
            <span>View Leaderboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const displayedCerts = showAllCerts ? certificates : certificates.slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src="/logo.png" alt="FundedCobra" className="h-10 object-contain" />
          </Link>
          <Link
            to="/leaderboard"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Leaderboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column — Profile Card */}
          <div className="lg:col-span-4 space-y-6">
            {/* Profile Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500/20 to-emerald-500/20 flex items-center justify-center border-2 border-white/10 flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || ''}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-white truncate">
                    {profile?.display_name || profile?.full_name || 'Trader'}
                  </h1>
                  <div className="flex items-center space-x-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-sm text-emerald-400 font-medium">FundedCobra Trader</span>
                  </div>
                </div>
              </div>

              {profile?.bio && (
                <p className="text-sm text-gray-400 mt-4 leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {/* Share Profile */}
              <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors border border-white/10 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Share profile</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 text-center">
                <p className="text-2xl font-bold text-white">{profile?.total_certificates || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Rewards</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/10 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  ${(profile?.total_payouts || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">Rewarded</p>
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-primary-500/5 to-emerald-500/5 p-5">
              <p className="text-xs text-gray-400 flex items-center space-x-1 mb-2">
                <Award className="w-3.5 h-3.5" />
                <span>WANT TO SEE HOW FAR YOU CAN GO?</span>
              </p>
              <h3 className="text-lg font-bold text-white mb-1">Start your trading journey</h3>
              <p className="text-sm text-gray-400 mb-4">Join FundedCobra and get funded today</p>
              <div className="flex space-x-2">
                <a
                  href="https://fundedcobra.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors text-center"
                >
                  Get Funded
                </a>
              </div>
            </div>
          </div>

          {/* Right Column — Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tabs */}
            <div className="flex space-x-1 border-b border-white/10 pb-0">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                  activeTab === 'home'
                    ? 'text-white border-primary-500'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab('certificates')}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                  activeTab === 'certificates'
                    ? 'text-white border-primary-500'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                My Certificates
                <span className="ml-2 text-xs text-gray-500">{certificates.length}</span>
              </button>
            </div>

            {activeTab === 'home' && (
              <>
                {/* Certificates Preview */}
                {certificates.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <span>My certificates</span>
                        <span className="text-sm text-gray-500 font-normal">{certificates.length}</span>
                      </h2>
                      {certificates.length > 2 && (
                        <button
                          onClick={() => setActiveTab('certificates')}
                          className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                        >
                          Show all
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {certificates.slice(0, 2).map(cert => (
                        <Link key={cert.id} to={`/verify/${cert.certificate_number}`}>
                          <CertificateCard certificate={cert} compact />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Highlighted Trades */}
                {highlightedTrades.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-primary-400" />
                        <span>Highlighted trades</span>
                        <span className="text-sm text-gray-500 font-normal">{highlightedTrades.length}</span>
                      </h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      These trades were chosen by the trader for display purposes and do not necessarily reflect their overall results, strategy, or consistency.
                    </p>
                    <div className="space-y-3">
                      {highlightedTrades.map(trade => (
                        <div
                          key={trade.id}
                          className="rounded-xl bg-white/[0.03] border border-white/5 p-4 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-lg font-bold text-emerald-400">
                                ${trade.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-gray-500">Profit</p>
                              {trade.account_type && (
                                <p className="text-xs text-gray-500 mt-1">
                                  <Award className="w-3 h-3 inline mr-1" />
                                  {trade.account_type}
                                </p>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-right">
                              {trade.duration && (
                                <div>
                                  <p className="text-sm font-medium text-white">{trade.duration}</p>
                                  <p className="text-xs text-gray-500">Duration</p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-white flex items-center justify-end space-x-1">
                                  <span>{trade.symbol}</span>
                                  <span className="text-xs text-gray-400">|</span>
                                  <span className={trade.direction === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
                                    {trade.direction}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500">Symbol</p>
                              </div>
                              {trade.close_date && (
                                <div>
                                  <p className="text-sm font-medium text-white">{formatDate(trade.close_date)}</p>
                                  <p className="text-xs text-gray-500">Closed</p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-white">{trade.volume}</p>
                                <p className="text-xs text-gray-500">Volume</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'certificates' && (
              <div className="space-y-6">
                {/* Back to Home */}
                <button
                  onClick={() => setActiveTab('home')}
                  className="flex items-center space-x-1 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Home</span>
                </button>

                <h2 className="text-xl font-bold text-white">
                  My Certificates <span className="text-gray-500 text-base font-normal">{certificates.length}</span>
                </h2>

                {/* Certificate Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayedCerts.map(cert => (
                    <Link key={cert.id} to={`/verify/${cert.certificate_number}`}>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:border-primary-500/30 transition-all duration-200 group">
                        <div className="flex items-center space-x-2 mb-3">
                          <Award className="w-4 h-4 text-primary-400" />
                          <span className="text-sm font-semibold text-white">
                            Payout Certificate
                          </span>
                        </div>
                        <p className="text-xl font-bold text-emerald-400 mb-1">
                          ${cert.payout_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-400">
                          {formatDate(cert.payout_date)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {cert.account_type}
                        </p>
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                          <ExternalLink className="w-4 h-4 text-gray-600" />
                          <span className="text-xs text-primary-400 font-medium group-hover:text-primary-300 transition-colors">
                            Show certificate
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {certificates.length > 4 && !showAllCerts && (
                  <button
                    onClick={() => setShowAllCerts(true)}
                    className="w-full py-3 text-sm text-primary-400 hover:text-primary-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Show all {certificates.length} certificates
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
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
