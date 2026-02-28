import React from 'react';
import Overview from '../components/Dashboard/Overview';
import TradingAccountsList from '../components/Dashboard/TradingAccounts';
import Leaderboard from '../components/Dashboard/Leaderboard';
import OffersBanner from '../components/Dashboard/OffersBanner';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <OffersBanner />
      <Overview />
      <Leaderboard />
      <TradingAccountsList />
    </div>
  );
}