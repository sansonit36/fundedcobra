import React from 'react';
import { useAffiliateTracking } from "./hooks/useAffiliateTracking";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AdminLogin from './pages/auth/AdminLogin';
import Dashboard from './pages/Dashboard';
import TradingAccounts from './pages/TradingAccounts';
import BuyAccount from './pages/BuyAccount';
import ThankYou from './pages/ThankYou';
import Payouts from './pages/Payouts';
import KYC from './pages/KYC';
import Settings from './pages/Settings';
import Rules from './pages/Rules';
import Affiliate from './pages/Affiliate';
import AffiliateReferrals from './pages/AffiliateReferrals';
import AffiliateWithdrawal from './pages/AffiliateWithdrawal';
import Rejected from './pages/Rejected';
import SuspiciousPayment from './pages/SuspiciousPayment';
import LiveSupport from './pages/LiveSupport';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AccountRules from './pages/admin/AccountRules';
import AdminTradingAccounts from './pages/admin/TradingAccounts';
import AccountApprovals from './pages/admin/AccountApprovals';
import PayoutApprovals from './pages/admin/PayoutApprovals';
import KYCVerifications from './pages/admin/KYCVerifications';
import AdminAffiliates from './pages/admin/Affiliates';
import AdminAffiliatePayouts from './pages/admin/AffiliatePayouts';
import EmailManagement from './pages/admin/EmailManagement';
import SMTPSettings from './pages/admin/SMTPSettings';
import PaymentMethods from './pages/admin/PaymentMethods';
import PackagesAndOffers from './pages/admin/PackagesAndOffers';
import AdminCertificateManager from './pages/admin/CertificateManager';
import AdminTraderProfiles from './pages/admin/TraderProfiles';
import CertificateVerification from './pages/public/CertificateVerification';
import TraderProfile from './pages/public/TraderProfile';
import PublicLeaderboard from './pages/public/Leaderboard';
import { initFacebookPixel } from './utils/FacebookTracking';

import { useEffect, useRef } from 'react';

export default function App() {
  useAffiliateTracking();           // ✅ call directly (no { ... })
  const pixelInitialized = useRef(false);

  useEffect(() => {
    if (!pixelInitialized.current) {
      pixelInitialized.current = true;
      initFacebookPixel();
    }
  }, []);
  
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/rejected" element={<Rejected />} />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/users" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminUsers />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/trading-accounts" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminTradingAccounts />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/account-approvals" element={
              <AdminRoute>
                <AdminLayout>
                  <AccountApprovals />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/payout-approvals" element={
              <AdminRoute>
                <AdminLayout>
                  <PayoutApprovals />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/kyc-verifications" element={
              <AdminRoute>
                <AdminLayout>
                  <KYCVerifications />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/affiliates" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminAffiliates />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/affiliate-payouts" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminAffiliatePayouts />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/email-management" element={
              <AdminRoute>
                <AdminLayout>
                  <EmailManagement />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/smtp-settings" element={
              <AdminRoute>
                <AdminLayout>
                  <SMTPSettings />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/payment-methods" element={
              <AdminRoute>
                <AdminLayout>
                  <PaymentMethods />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/settings" element={
              <AdminRoute>
                <AdminLayout>
                  <Settings />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/account-rules" element={
              <AdminRoute>
                <AdminLayout>
                  <AccountRules />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/packages-offers" element={
              <AdminRoute>
                <AdminLayout>
                  <PackagesAndOffers />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/certificates" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminCertificateManager />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/trader-profiles" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminTraderProfiles />
                </AdminLayout>
              </AdminRoute>
            } />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* User Routes */}
            <Route element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/trading-accounts" element={<TradingAccounts />} />
              <Route path="/buy-account" element={<BuyAccount />} />
              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/payouts" element={<Payouts />} />
              <Route path="/kyc" element={<KYC />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/affiliate" element={<Affiliate />} />
              <Route path="/affiliate/referrals" element={<AffiliateReferrals />} />
              <Route path="/affiliate/withdrawal" element={<AffiliateWithdrawal />} />
              <Route path="/suspicious-payment" element={<SuspiciousPayment />} />
              <Route path="/live-support" element={<LiveSupport />} />
            </Route>

            {/* Public Pages (no auth required) */}
            <Route path="/verify/:certificateId" element={<CertificateVerification />} />
            <Route path="/trader/:userId" element={<TraderProfile />} />
            <Route path="/leaderboard" element={<PublicLeaderboard />} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AdminAuthProvider>
    </AuthProvider>
  );
}