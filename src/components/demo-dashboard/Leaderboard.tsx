import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Crown, ArrowUpRight, ArrowRight } from 'lucide-react';
import { getLeaderboard } from '../../lib/certificates';
import type { LeaderboardEntry } from '../../lib/certificates';

export default function Leaderboard() {
  const [traders, setTraders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard();
      setTraders(data.slice(0, 5));
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-4.5 h-4.5 text-yellow-400" />;
    if (index === 1) return <Medal className="w-4.5 h-4.5 text-gray-300" />;
    if (index === 2) return <Medal className="w-4.5 h-4.5 text-amber-600" />;
    return <span className="text-xs font-bold text-[#484f58]">{index + 1}</span>;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="rounded-2xl bg-[#161B22]/80 border border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">Leaderboard</h2>
        </div>
        <Link
          to="/leaderboard"
          className="text-xs font-semibold text-[#8B949E] hover:text-white transition-colors flex items-center gap-1"
        >
          View All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="space-y-2 p-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05]" />
                <div className="flex-1">
                  <div className="h-3.5 bg-white/[0.05] w-24 rounded mb-1.5" />
                  <div className="h-2.5 bg-white/[0.03] w-16 rounded" />
                </div>
                <div className="h-3.5 bg-white/[0.05] w-16 rounded" />
              </div>
            ))}
          </div>
        ) : traders.length === 0 ? (
          <div className="text-center py-10">
            <Trophy className="w-8 h-8 text-[#2d333b] mx-auto mb-3" />
            <p className="text-sm text-[#484f58]">No traders on the leaderboard yet</p>
            <p className="text-xs text-[#2d333b] mt-1">Top performers will appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {traders.map((trader, index) => (
              <div
                key={trader.id}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors hover:bg-white/[0.03] ${
                  index === 0 ? 'bg-yellow-500/[0.03]' : ''
                }`}
              >
                {/* Rank */}
                <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                  {getRankIcon(index)}
                </div>

                {/* Avatar */}
                <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-lg overflow-hidden ${
                  index === 0 ? 'bg-gradient-to-br from-[#8A2BE2] to-[#06b6d4] text-white' : 'bg-white/[0.06] text-[#8B949E]'
                }`}>
                  {trader.avatar_url ? (
                    <img src={trader.avatar_url} alt={trader.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold">{getInitials(trader.display_name)}</span>
                  )}
                </div>

                {/* Name + Payout */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white truncate">{trader.display_name}</p>
                    <p className="text-sm font-bold text-emerald-400 flex-shrink-0 whitespace-nowrap tabular-nums">
                      ${trader.total_payout.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    {trader.account_type ? (
                      <span className="text-[10px] font-medium text-[#484f58] bg-white/[0.04] px-1.5 py-0.5 rounded">{trader.account_type}</span>
                    ) : <span />}
                    <span className="text-[10px] text-[#2d333b]">Rewarded</span>
                  </div>
                </div>

                {/* Profile Link */}
                {trader.user_id && (
                  <Link
                    to={`/trader/${trader.user_id}`}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-[#484f58] hover:text-white flex-shrink-0"
                    title="View Profile"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}