import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, User, ArrowUpRight, Crown } from 'lucide-react';
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
      setTraders(data.slice(0, 5)); // Show top 5 on dashboard
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-gray-500">{index + 1}</span>;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="card-gradient rounded-2xl border border-white/5">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Top Traders</h2>
          </div>
          <Link
            to="/leaderboard"
            className="flex items-center space-x-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            <span>View All</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/10" />
                <div className="flex-1">
                  <div className="h-4 bg-white/10 rounded w-24 mb-1" />
                  <div className="h-3 bg-white/10 rounded w-16" />
                </div>
                <div className="h-4 bg-white/10 rounded w-16" />
              </div>
            ))}
          </div>
        ) : traders.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No traders on the leaderboard yet</p>
            <p className="text-gray-500 text-xs mt-1">Top performers will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {traders.map((trader, index) => (
              <div
                key={trader.id}
                className={`flex items-center space-x-3 p-3 rounded-xl transition-colors ${
                  index === 0
                    ? 'bg-yellow-500/5 border border-yellow-500/10'
                    : 'bg-white/[0.02] border border-white/5 hover:border-white/10'
                }`}
              >
                {/* Rank */}
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                  {getRankIcon(index)}
                </div>

                {/* Avatar + Name */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${
                    index === 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-white/5 border-white/10'
                  }`}>
                    <span className="text-xs font-bold text-gray-300">
                      {getInitials(trader.display_name)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{trader.display_name}</p>
                    {trader.account_type && (
                      <p className="text-xs text-gray-500 truncate">{trader.account_type}</p>
                    )}
                  </div>
                </div>

                {/* Payout Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-400">
                    ${trader.total_payout.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500">Rewarded</p>
                </div>

                {/* Profile Link */}
                {trader.user_id && (
                  <Link
                    to={`/trader/${trader.user_id}`}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white flex-shrink-0"
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