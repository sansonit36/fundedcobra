import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User, Share2, ShieldCheck, Award, MapPin, Calendar, ExternalLink,
  TrendingUp, ArrowUpRight, ChevronRight, Clock, BarChart3, Trophy
} from 'lucide-react';
import {
  getPublicTraderProfile, getCertificatesByUser,
  getHighlightedTrades, getLeaderboard
} from '../../lib/certificates';
import type { TraderProfile as TraderProfileType, PayoutCertificate, HighlightedTrade, LeaderboardEntry } from '../../lib/certificates';
import CertificateCard from '../../components/Certificate/CertificateCard';

export default function TraderProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<TraderProfileType | null>(null);
  const [certificates, setCertificates] = useState<PayoutCertificate[]>([]);
  const [trades, setTrades] = useState<HighlightedTrade[]>([]);
  const [community, setCommunity] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [showAllCerts, setShowAllCerts] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBioFull, setShowBioFull] = useState(false);
  const certsScrollRef = useRef<HTMLDivElement>(null);
  const communityScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const [profileData, certsData, tradesData, leaderboardData] = await Promise.all([
        getPublicTraderProfile(userId),
        getCertificatesByUser(userId),
        getHighlightedTrades(userId),
        getLeaderboard()
      ]);

      if (!profileData || !profileData.is_public) {
        setNotFound(true);
        return;
      }

      setProfile(profileData);
      setCertificates(certsData);
      setTrades(tradesData);
      // Community: other traders excluding current
      setCommunity(leaderboardData.filter(e => e.user_id !== userId).slice(0, 10));
    } catch (err) {
      console.error('Error loading profile:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDaysSinceJoined = (dateStr: string) => {
    const joined = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl bg-[#12121f] border border-white/5 p-6 animate-pulse">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-white/10" />
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-white/10 rounded w-32" />
                    <div className="h-3 bg-white/10 rounded w-24" />
                  </div>
                </div>
                <div className="h-16 bg-white/10 rounded" />
              </div>
            </div>
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-2xl bg-[#12121f] border border-white/5 p-6 animate-pulse">
                <div className="h-5 bg-white/10 rounded w-40 mb-4" />
                <div className="flex space-x-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-28 h-32 rounded-xl bg-white/10 flex-shrink-0" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-600" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Profile Not Available</h1>
          <p className="text-sm text-gray-400 mb-6">This trader's profile is either private or doesn't exist.</p>
          <Link
            to="/leaderboard"
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            <span>View Leaderboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.full_name || 'Trader';
  const daysSinceJoined = getDaysSinceJoined(profile.created_at);
  const visibleTrades = showAllTrades ? trades : trades.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a12]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <img src="/logo.png" alt="FundedCobra" className="h-8 object-contain" />
          </Link>
          <div className="flex items-center space-x-3">
            <Link
              to="/leaderboard"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ==================== LEFT SIDEBAR ==================== */}
          <div className="lg:col-span-4 space-y-4">

            {/* Profile Card */}
            <div className="rounded-2xl bg-[#12121f] border border-white/5 overflow-hidden">
              {/* Banner */}
              <div className="h-20 bg-gradient-to-r from-primary-600/30 via-primary-500/20 to-emerald-500/10 relative">
                <div className="absolute -bottom-8 left-5">
                  <div className="w-16 h-16 rounded-full bg-[#12121f] border-4 border-[#12121f] flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-500/30 to-emerald-500/20 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary-300">
                        {getInitials(displayName)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Badge */}
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-primary-500/20 border border-primary-500/30 text-[10px] font-semibold text-primary-300">
                    <ShieldCheck className="w-3 h-3" />
                    <span>FundedCobra Trader</span>
                  </span>
                </div>
              </div>

              <div className="pt-10 px-5 pb-5">
                {/* Name & Info */}
                <h1 className="text-lg font-bold text-white">{displayName}</h1>
                <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>with FundedCobra: {daysSinceJoined} days</span>
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 mt-4">
                  <button
                    onClick={handleShare}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Share profile'}</span>
                  </button>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <div className="mt-4">
                    <p className={`text-sm text-gray-400 leading-relaxed ${!showBioFull ? 'line-clamp-3' : ''}`}>
                      {profile.bio}
                    </p>
                    {profile.bio.length > 150 && (
                      <button
                        onClick={() => setShowBioFull(!showBioFull)}
                        className="text-xs text-primary-400 hover:text-primary-300 mt-1"
                      >
                        {showBioFull ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Total Rewarded Card */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-[#12121f] border border-emerald-500/20 p-5 text-center">
              <p className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                ${profile.total_payouts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-sm text-emerald-400/60 mt-1">Rewarded</p>
            </div>

            {/* CTA Card */}
            <div className="rounded-2xl bg-[#12121f] border border-white/5 p-5">
              <h3 className="text-sm font-bold text-white mb-1">Start your trading journey</h3>
              <p className="text-xs text-gray-500 mb-3">Get funded and trade with FundedCobra capital.</p>
              <div className="flex items-center space-x-2">
                <a
                  href="https://fundedcobra.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
                >
                  Get Funded
                </a>
                <Link
                  to="/leaderboard"
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 transition-colors"
                >
                  Leaderboard
                </Link>
              </div>
            </div>
          </div>

          {/* ==================== RIGHT MAIN CONTENT ==================== */}
          <div className="lg:col-span-8 space-y-6">

            {/* My Certificates */}
            <div className="rounded-2xl bg-[#12121f] border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-white">My certificates</h2>
                  <span className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                    {certificates.length}
                  </span>
                </div>
                {certificates.length > 4 && (
                  <button
                    onClick={() => setShowAllCerts(!showAllCerts)}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    {showAllCerts ? 'Show less' : 'Show all'}
                  </button>
                )}
              </div>

              {certificates.length === 0 ? (
                <div className="px-5 pb-5 text-center py-8">
                  <Award className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No certificates earned yet</p>
                </div>
              ) : (
                <div className="px-5 pb-5">
                  <div
                    ref={certsScrollRef}
                    className={showAllCerts
                      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
                      : 'flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10'
                    }
                  >
                    {(showAllCerts ? certificates : certificates.slice(0, 6)).map(cert => (
                      <Link
                        key={cert.id}
                        to={`/verify/${cert.certificate_number}`}
                        className={`flex-shrink-0 ${showAllCerts ? '' : 'w-28'}`}
                      >
                        <div className="group rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 hover:border-primary-500/30 p-3 transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/5">
                          {/* Mini certificate visual */}
                          <div className="w-full aspect-[3/4] rounded-lg bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] mb-2 flex flex-col items-center justify-center border border-white/10 overflow-hidden relative">
                            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-primary-500 to-cyan-500 absolute top-0" />
                            <img src="/logo.png" alt="" className="h-4 object-contain mb-1 opacity-50" />
                            <p className="text-[9px] text-emerald-400 font-bold">
                              {formatAmount(cert.payout_amount)}
                            </p>
                            <ShieldCheck className="w-3 h-3 text-emerald-400/50 mt-1" />
                          </div>
                          <p className="text-[10px] text-gray-400 text-center truncate">
                            {cert.account_type || 'Payout'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Highlighted Trades */}
            <div className="rounded-2xl bg-[#12121f] border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-primary-400" />
                  <h2 className="text-base font-bold text-white">Highlighted trades</h2>
                </div>
                {trades.length > 4 && (
                  <button
                    onClick={() => setShowAllTrades(!showAllTrades)}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    {showAllTrades ? 'Show less' : 'Show all'}
                  </button>
                )}
              </div>
              <p className="px-5 text-[11px] text-gray-600 mb-4">
                These trades were chosen by the trader for display purposes and do not necessarily reflect their overall results, strategy, or consistency.
              </p>

              {trades.length === 0 ? (
                <div className="px-5 pb-5 text-center py-6">
                  <BarChart3 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No highlighted trades yet</p>
                </div>
              ) : (
                <div className="px-5 pb-5 space-y-3">
                  {visibleTrades.map((trade, index) => (
                    <div
                      key={trade.id}
                      className="relative rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-colors"
                    >
                      {/* Green gradient accent on left */}
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-400 to-emerald-600" />
                      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-emerald-500/5 to-transparent" />

                      <div className="relative flex items-center p-4 pl-5">
                        {/* Left: Profit & Account */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-xl font-extrabold text-emerald-400 tracking-tight">
                            {formatAmount(trade.profit)}
                          </p>
                          <p className="text-[11px] text-gray-500">Profit</p>
                          {trade.account_type && (
                            <p className="text-[11px] text-gray-500 flex items-center space-x-1">
                              <span className="text-primary-400">⇡</span>
                              <span>{trade.account_type}</span>
                            </p>
                          )}
                        </div>

                        {/* Middle: Stats */}
                        <div className="hidden sm:flex items-center space-x-4 mr-6">
                          {trade.duration && (
                            <div className="text-center">
                              <p className="text-xs font-medium text-white">{trade.duration}</p>
                              <p className="text-[10px] text-gray-500">Duration</p>
                            </div>
                          )}
                          {trade.close_date && (
                            <div className="text-center">
                              <p className="text-xs font-medium text-white">{formatDate(trade.close_date)}</p>
                              <p className="text-[10px] text-gray-500">Closed</p>
                            </div>
                          )}
                        </div>

                        {/* Right: Symbol & Direction */}
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="flex items-center space-x-1.5 justify-end">
                              <span className="text-sm font-bold text-white">{trade.symbol}</span>
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                trade.direction === 'buy'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-red-500/10 text-red-400'
                              }`}>
                                {trade.direction === 'buy' ? 'Buy' : 'Sell'}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">Symbol</p>
                          </div>
                          {trade.volume > 0 && (
                            <div className="text-center border-l border-white/5 pl-3">
                              <p className="text-xs font-medium text-white">{trade.volume}</p>
                              <p className="text-[10px] text-gray-500">Volume</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {trades.length > 4 && !showAllTrades && (
                    <button
                      onClick={() => setShowAllTrades(true)}
                      className="w-full py-2.5 text-sm text-gray-400 hover:text-white border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      Show more
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Community Section */}
            {community.length > 0 && (
              <div className="rounded-2xl bg-[#12121f] border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h2 className="text-base font-bold text-white">FundedCobra Community</h2>
                  <Link
                    to="/public/leaderboard"
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Show all
                  </Link>
                </div>

                <div className="px-5 pb-5">
                  <div
                    ref={communityScrollRef}
                    className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
                  >
                    {community.map(trader => (
                      <Link
                        key={trader.id}
                        to={trader.user_id ? `/trader/${trader.user_id}` : '#'}
                        className="flex-shrink-0 w-32"
                      >
                        <div className="rounded-xl bg-white/[0.03] border border-white/5 hover:border-primary-500/30 p-4 text-center transition-all duration-200 group">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-2 border border-white/10 group-hover:border-primary-500/40 transition-colors">
                            <span className="text-sm font-bold text-primary-300">
                              {getInitials(trader.display_name)}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white truncate">{trader.display_name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            Rewarded: <span className="text-emerald-400">${trader.total_payout.toLocaleString()}</span>
                          </p>
                          <button className="mt-2 w-full px-3 py-1 rounded-md bg-primary-500/20 hover:bg-primary-500/30 text-xs font-medium text-primary-400 transition-colors">
                            View
                          </button>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-[10px] text-gray-600 leading-relaxed">
            All trades are simulated and provided for informational and educational purposes only. They do not constitute financial, investment, legal, or tax advice.
            Past performance is not indicative of future results. FundedCobra provides services of simulated trading and educational tools for traders.
          </p>
          <p className="text-[10px] text-gray-600 mt-3">
            {new Date().getFullYear()} © Copyright · FundedCobra. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
