import React, { useState } from 'react';
import Overview from '../components/demo-dashboard/Overview';
import TradingAccountsList from '../components/demo-dashboard/TradingAccounts';
import Leaderboard from '../components/demo-dashboard/Leaderboard';
import OffersBanner from '../components/demo-dashboard/OffersBanner';
import ComplianceStatus from '../components/demo-dashboard/ComplianceStatus';
import RecentTrades from '../components/demo-dashboard/RecentTrades';

export default function Dashboard() {
  const [filterType, setFilterType] = useState<string>('all');

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-8">
      <div className="pb-6">
        <div className="flex items-center space-x-2 text-sm text-[#808080]">
          <span>Trader</span>
          <span>/</span>
          <span className="text-white font-medium">Accounts overview</span>
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