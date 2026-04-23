import React, { useState } from 'react';
import Overview from '../components/Dashboard/Overview';
import TradingAccountsList from '../components/Dashboard/TradingAccounts';
import Leaderboard from '../components/Dashboard/Leaderboard';
import OffersBanner from '../components/Dashboard/OffersBanner';
import ComplianceStatus from '../components/Dashboard/ComplianceStatus';
import RecentTrades from '../components/Dashboard/RecentTrades';

export default function Dashboard() {
  const [filterType, setFilterType] = useState<string>('all');

  return (
    <div className="space-y-6">
      <OffersBanner />
      <ComplianceStatus />
      <Overview filterType={filterType} setFilterType={setFilterType} />
      <RecentTrades filterType={filterType} />
      <Leaderboard />
      <TradingAccountsList />
    </div>
  );
}