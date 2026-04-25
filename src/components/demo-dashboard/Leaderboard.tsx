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
    return <span className="text-sm font-bold text-[#484f58]">{index + 1}</span>;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] shadow-lg shadow-black/10 overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #161B22 0%, #131820 100%)' }}>
      <div className="flex items-center justify-between p-6 border-b border-white/[0.04]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center border border-white/[0.04]">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-widest">Global Arena</h2>
        </div>
        <Link
          to="/leaderboard"
          className="text-[10px] font-black text-[#c084fc] hover:text-[#8A2BE2] uppercase tracking-widest border border-[#8A2BE2]/20 px-3 py-1.5 rounded-xl bg-[#8A2BE2]/10 transition-colors hover:bg-[#8A2BE2]/15"
        >
          <span>View Ledger</span>
        </Link>
      </div>
      
      <div className="p-5">

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse">
                <div className="w-8 h-8 bg-white/[0.05] rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-white/[0.05] w-24 mb-1 rounded" />
                  <div className="h-3 bg-white/[0.03] w-16 rounded" />
                </div>
                <div className="h-4 bg-white/[0.05] w-16 rounded" />
              </div>
            ))}
          </div>
        ) : traders.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-10 h-10 text-[#2d333b] mx-auto mb-3" />
            <p className="text-[#8B949E] text-sm">No traders on the leaderboard yet</p>
            <p className="text-[#484f58] text-xs mt-1">Top performers will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {traders.map((trader, index) => (
              <div
                key={trader.id}
                className={`flex items-center gap-3 p-4 rounded-xl last:border-0 hover:bg-white/[0.03] transition-colors cursor-pointer ${
                  index === 0 ? 'bg-yellow-500/[0.03] border border-yellow-500/[0.06]' : 'border border-transparent'
                }`}
              >
                {/* Rank */}
                <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                  {getRankIcon(index)}
                </div>

                {/* Avatar */}
                <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-lg overflow-hidden ${
                  index === 0 ? 'bg-gradient-to-br from-[#8A2BE2] to-[#c084fc] text-white' : 'bg-white/[0.06] text-[#8B949E]'
                }`}>
                  {trader.avatar_url ? (
                    <img src={trader.avatar_url} alt={trader.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold">
                      {getInitials(trader.display_name)}
                    </span>
                  )}
                </div>

                {/* Name + Payout — stacked on mobile */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white truncate">{trader.display_name}</p>
                    <p className="text-sm font-bold text-emerald-400 flex-shrink-0 whitespace-nowrap">
                      ${trader.total_payout.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    {trader.account_type ? (
                      <span className="bg-white/[0.05] text-[#8B949E] text-[10px] px-2 py-0.5 rounded-md">{trader.account_type}</span>
                    ) : <span />}
                    <span className="text-[10px] text-[#484f58]">Rewarded</span>
                  </div>
                </div>

                {/* Profile Link */}
                {trader.user_id && (
                  <Link
                    to={`/trader/${trader.user_id}`}
                    className="p-1 flex items-center justify-center transition-colors text-[#484f58] hover:text-[#E6EDF3] flex-shrink-0"
                    title="View Public Profile"
                  >
                    <ArrowUpRight className="w-4 h-4" />
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