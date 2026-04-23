import React, { useState } from 'react';
import Overview from '../../components/demo-dashboard/Overview';
import TradingAccountsList from '../../components/demo-dashboard/TradingAccounts';
import Leaderboard from '../../components/demo-dashboard/Leaderboard';
import OffersBanner from '../../components/demo-dashboard/OffersBanner';
import ComplianceStatus from '../../components/demo-dashboard/ComplianceStatus';
import RecentTrades from '../../components/demo-dashboard/RecentTrades';

export default function InstitutionalDashboard() {
  const [filterType, setFilterType] = useState<string>('all');

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-8">
      <div className="flex justify-between items-end pb-4 border-b border-[#30363D]">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E6EDF3] tracking-tight uppercase">Trading Desk</h1>
          <p className="text-sm font-medium tracking-widest uppercase text-[#8B949E] mt-1">Live Institutional Data Feed</p>
        </div>
      </div>
      
      <OffersBanner />
      <ComplianceStatus />
      
      {/* Metrics Row */}
      <Overview filterType={filterType} setFilterType={setFilterType} />
      
      {/* Data Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <RecentTrades filterType={filterType} />
        <Leaderboard />
      </div>
      
      <TradingAccountsList />
    </div>
  );
}