import { supabase } from './supabase';

// Types
export interface TradingAccount {
  id: string;
  mt5_login: string;
  mt5_password: string;
  mt5_server: string;
  balance: number;
  equity: number;
  status: 'active' | 'suspended' | 'breached';
  breach_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountPackage {
  id: string;
  name: string;
  balance: number;
  price: number;
  account_type: 'instant' | '1_step' | '2_step';
  is_active: boolean;
  trading_days: number;
  profit_target: number;
  daily_loss_limit: number;
  overall_loss_limit: number;
}

export interface AccountRuleConfig {
  id: string;
  package_id: string | null;
  account_package_name: string;
  account_type: 'instant' | '1_step' | '2_step';
  profit_target_phase1: number;
  profit_target_phase2: number | null;
  daily_drawdown_percent: number;
  overall_drawdown_percent: number;
  minimum_trading_days: number;
  news_trading_allowed: boolean;
  weekend_holding_allowed: boolean;
  payout_split_percent: number;
}

export interface AccountRequest {
  id: string;
  package: {
    name: string;
    balance: number;
    price: number;
    account_type?: 'instant' | '1_step' | '2_step';
  };
  status: 'pending_payment' | 'payment_submitted';
  amount: number;
  created_at: string;
  payment_screenshot_url?: string;
  ai_confidence?: number;
  ai_reason?: string;
  ai_red_flags?: any;
}

export interface PendingAccountRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  package_name: string;
  package_balance: number;
  package_fee: number;
  amount: number;
  status: string;
  payment_screenshot_url: string;
  rejection_reason?: string;
  ai_confidence?: number;
  ai_reason?: string;
  ai_red_flags?: any;
  referrer_name?: string;
  created_at: string;
  processed_at?: string;
}

export interface DashboardStats {
  totalBalance: number;
  monthlyChange: number;
  activeAccounts: number;
  pendingAccounts: number;
  dailyPL: number;
  dailyChangePercent: number;
  monthlyPL: number;
  monthlyChangePercent: number;
  totalProfits: number;
  totalTrades: number;
}

export interface PayoutRequest {
  id: string;
  accountId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  walletAddress: string;
}

export interface PayoutStats {
  availableForPayout: number;
  totalPaidOut: number;
  nextPayoutDate: string;
}

export interface AccountData {
  id: string;
  mt5_login: string;
  initial_equity: number;
  running_equity: number;
  available_for_payout: number;
  package_name?: string;
  created_rule_version?: string;
  has_25_percent_rule?: boolean;
}

// Profile Image Upload
export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      upsert: true
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);

  if (updateError) throw updateError;

  return publicUrl;
}

// Trading Accounts
export async function getTradingAccounts(userId: string): Promise<TradingAccount[]> {
  const { data, error } = await supabase
    .from('trading_accounts')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'breached'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getActiveAccounts(userId: string): Promise<AccountData[]> {
  const { data: accounts, error: accountsError} = await supabase
    .from('trading_accounts')
    .select('id, mt5_login, package_name, created_rule_version, has_25_percent_rule')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (accountsError) throw accountsError;

  if (!accounts || accounts.length === 0) {
    return [];
  }

  const { data: extendedData, error: extendedError } = await supabase
    .from('account_data_extended')
    .select('mt5_id, initial_equity, running_equity')
    .in('mt5_id', accounts.map(acc => acc.mt5_login));

  if (extendedError) throw extendedError;

  // Fetch pending payout requests for these accounts
  const { data: pendingPayouts, error: payoutError } = await supabase
    .from('payout_requests')
    .select('account_id, amount')
    .in('account_id', accounts.map(acc => acc.id))
    .eq('status', 'pending');

  if (payoutError) throw payoutError;

  return accounts.map(acc => {
    const extended = extendedData?.find(ed => ed.mt5_id === acc.mt5_login);
    if (!extended) return null;

    const profitTarget = extended.initial_equity * 0.10; // 10% profit target
    const currentProfit = extended.running_equity - extended.initial_equity;
    
    // Use 25% if has_25_percent_rule is true, otherwise 50%
    const payoutPercentage = acc.has_25_percent_rule ? 0.25 : 0.5;
    const available = currentProfit >= profitTarget ? currentProfit * payoutPercentage : 0;

    // Subtract pending payout amounts
    const pendingAmount = (pendingPayouts || [])
      .filter(p => p.account_id === acc.id)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const availableAfterPending = Math.max(0, available - pendingAmount);

    return {
      id: acc.id,
      mt5_login: acc.mt5_login,
      initial_equity: extended.initial_equity,
      running_equity: extended.running_equity,
      available_for_payout: availableAfterPending,
      package_name: acc.package_name,
      created_rule_version: acc.created_rule_version,
      has_25_percent_rule: acc.has_25_percent_rule
    } as AccountData;
  }).filter((acc): acc is AccountData => acc !== null);
}

// Account Packages
export async function getAccountPackages(includeInactive = false): Promise<AccountPackage[]> {
  let query = supabase
    .from('account_packages')
    .select('*')
    .order('balance', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getAccountRulesForPackages(): Promise<AccountRuleConfig[]> {
  const { data, error } = await supabase
    .from('account_rules')
    .select(`
      id,
      package_id,
      account_package_name,
      account_type,
      profit_target_phase1,
      profit_target_phase2,
      daily_drawdown_percent,
      overall_drawdown_percent,
      minimum_trading_days,
      news_trading_allowed,
      weekend_holding_allowed,
      payout_split_percent,
      rule_version
    `)
    .neq('rule_version', 'legacy')
    .order('account_package_name', { ascending: true });

  if (error) throw error;
  return (data || []) as AccountRuleConfig[];
}

// Account Requests
export async function createAccountPurchase(
  packageId: string,
  couponCode?: string
): Promise<string> {
  // First, get the package details to calculate the amount
  const { data: packageData, error: packageError } = await supabase
    .from('account_packages')
    .select('price, is_active')
    .eq('id', packageId)
    .single();
  
  if (packageError) throw packageError;
  if (!packageData) throw new Error('Package not found');
  if (packageData.is_active === false) {
    throw new Error('This account package is currently unavailable');
  }
  
  // Calculate discount if coupon provided
  let discount = 0;
  if (couponCode) {
    const { data: couponData, error: couponError } = await supabase
      .rpc('validate_coupon', { code: couponCode });
    
    if (!couponError && couponData) {
      discount = couponData;
    }
  }
  
  // Calculate final amount
  const amount = packageData.price * (1 - discount);
  
  // Create the account request directly
  const { data, error } = await supabase
    .from('account_requests')
    .insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      package_id: packageId,
      amount: amount,
      coupon_code: discount > 0 ? couponCode : null,
      status: 'pending_payment'
    })
    .select('id')
    .single();
  
  if (error) throw error;
  return data.id;
}

export async function submitPaymentProof(
  requestId: string,
  screenshot: File | string,
  aiData?: {
    confidence: number;
    reason: string;
    red_flags: any;
    isValid?: boolean;
  }
): Promise<void> {
  let publicUrl = '';

  if (screenshot instanceof File) {
    // Upload screenshot using user ID as folder name
    const filename = `${requestId}/${Date.now()}_payment.${screenshot.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(filename, screenshot);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl: url } } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(filename);
    
    publicUrl = url;
  } else {
    publicUrl = screenshot;
  }

  // Update request
  const { error: updateError } = await supabase
    .rpc('submit_payment_proof', {
      request_id: requestId,
      screenshot_url: publicUrl,
      p_ai_confidence: aiData?.confidence,
      p_ai_reason: aiData?.reason,
      p_ai_red_flags: aiData?.red_flags,
      p_is_valid: aiData?.isValid ?? true
    });

  if (updateError) throw updateError;
}

export async function getPendingAccounts(userId: string): Promise<AccountRequest[]> {
  const { data, error } = await supabase
    .from('account_requests')
    .select(`
      *,
      package:account_packages (
        name,
        balance,
        price,
        account_type
      )
    `)
    .eq('user_id', userId)
    .in('status', ['pending_payment', 'payment_submitted', 'suspicious'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Admin Functions
export async function getPendingAccountRequests(): Promise<PendingAccountRequest[]> {
  const { data, error } = await supabase
    .rpc('get_pending_account_requests');

  if (error) throw error;
  return data;
}

export async function getAllAccountRequests(status?: string): Promise<PendingAccountRequest[]> {
  const { data, error } = await supabase
    .rpc('get_all_account_requests', { p_status: status || null });

  if (error) throw error;
  return data;
}

export async function approveAccountRequest(
  requestId: string,
  mt5Login: string,
  mt5Password: string,
  mt5Server: string = 'FundedCobra-Live'
): Promise<string> {
  const { data, error } = await supabase
    .rpc('approve_account_request', {
      request_id: requestId,
      mt5_login: mt5Login,
      mt5_password: mt5Password,
      mt5_server: mt5Server
    });

  if (error) throw error;
  return data;
}

export async function rejectAccountRequest(
  requestId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .rpc('reject_account_request', {
      request_id: requestId,
      reason: reason
    });

  if (error) throw error;
}

// Dashboard Stats
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const { data: accounts, error: accountsError } = await supabase
    .from('trading_accounts')
    .select(`
      balance,
      equity,
      status,
      trading_stats (
        current_profit,
        total_trades
      )
    `)
    .eq('user_id', userId);

  if (accountsError) throw accountsError;

  const activeAccounts = accounts.filter(acc => acc.status === 'active');
  const totalBalance = activeAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalProfits = accounts.reduce((sum, acc) => 
    sum + (acc.trading_stats?.[0]?.current_profit || 0), 0);
  const totalTrades = accounts.reduce((sum, acc) => 
    sum + (acc.trading_stats?.[0]?.total_trades || 0), 0);

  const monthlyChange = totalBalance > 0 ? (totalProfits / totalBalance) * 100 : 0;
  const dailyPL = totalProfits * 0.2; // Simplified for demo
  const dailyChangePercent = totalBalance > 0 ? (dailyPL / totalBalance) * 100 : 0;

  return {
    totalBalance,
    monthlyChange,
    activeAccounts: activeAccounts.length,
    pendingAccounts: 0,
    dailyPL,
    dailyChangePercent,
    monthlyPL: totalProfits,
    monthlyChangePercent: monthlyChange,
    totalProfits,
    totalTrades
  };
}

// Payouts
export async function getPayoutStats(userId: string): Promise<PayoutStats> {
  const accounts = await getActiveAccounts(userId);
  const totalAvailable = accounts.reduce((sum, acc) => sum + acc.available_for_payout, 0);

  const { data: payoutData, error: payoutError } = await supabase
    .from('payout_requests')
    .select('amount')
    .eq('user_id', userId)
    .eq('status', 'approved');

  if (payoutError) throw payoutError;

  const totalPaidOut = (payoutData || []).reduce((sum, payout) => sum + payout.amount, 0);

  const nextPayoutDate = new Date();
  nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);

  return {
    availableForPayout: totalAvailable,
    totalPaidOut,
    nextPayoutDate: nextPayoutDate.toISOString()
  };
}

export async function getPayoutHistory(userId: string): Promise<PayoutRequest[]> {
  const { data, error } = await supabase
    .from('payout_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createPayoutRequest(
  accountId: string,
  amount: number,
  walletAddress: string
): Promise<void> {
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(walletAddress)) {
    throw new Error('Invalid USDT-TRC20 wallet address');
  }

  const { data: account, error: accountError } = await supabase
    .from('trading_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (accountError) throw accountError;
  if (!account) throw new Error('Account not found');
  if (account.status !== 'active') throw new Error('Account is not active');

  // Check if user already requested a payout today for this account
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { data: todayPayouts, error: todayPayoutsError } = await supabase
    .from('payout_requests')
    .select('id')
    .eq('account_id', accountId)
    .gte('created_at', todayISO)
    .limit(1);

  if (todayPayoutsError) throw todayPayoutsError;
  
  if (todayPayouts && todayPayouts.length > 0) {
    throw new Error('You can only request one payout per day per account. Please try again tomorrow.');
  }

  const { data: extendedData, error: extendedError } = await supabase
    .from('account_data_extended')
    .select('initial_equity, running_equity')
    .eq('mt5_id', account.mt5_login)
    .single();

  if (extendedError) throw extendedError;
  if (!extendedData) throw new Error('Account data not found');

  // Get account rules to check minimum withdrawal
  const isLegacyAccount = account.created_rule_version === 'legacy';
  const packageName = account.package_name || 'Unknown';
  
  let minWithdrawal = 20; // Default minimum
  
  if (isLegacyAccount) {
    // Get legacy rules
    const { data: legacyRules } = await supabase
      .from('account_rules')
      .select('minimum_withdrawal_amount')
      .eq('account_package_name', 'LEGACY_ALL_ACCOUNTS')
      .eq('rule_version', 'legacy')
      .single();
    
    if (legacyRules) {
      minWithdrawal = legacyRules.minimum_withdrawal_amount;
    }
  } else {
    // Get package-specific rules
    const { data: packageRules } = await supabase
      .from('account_rules')
      .select('minimum_withdrawal_amount')
      .eq('account_package_name', packageName)
      .eq('rule_version', 'v2')
      .single();
    
    if (packageRules) {
      minWithdrawal = packageRules.minimum_withdrawal_amount;
    }
  }

  // Check minimum withdrawal amount
  if (amount < minWithdrawal) {
    throw new Error(`Minimum withdrawal amount is $${minWithdrawal.toFixed(2)}`);
  }

  const profitTarget = extendedData.initial_equity * 0.10;
  const currentProfit = extendedData.running_equity - extendedData.initial_equity;
  const availableForPayout = currentProfit >= profitTarget ? currentProfit * 0.5 : 0;

  if (amount > availableForPayout) {
    throw new Error('Requested amount exceeds available payout');
  }

  // Get user info for email
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', account.user_id)
    .single();

  const { data: insertData, error: insertError } = await supabase
    .from('payout_requests')
    .insert({
      user_id: account.user_id,
      account_id: accountId,
      amount,
      wallet_address: walletAddress,
      status: 'pending'
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Send admin notification email
  try {
    const { sendEmail } = await import('./emailService');
    await sendEmail({
      to: import.meta.env.VITE_ADMIN_EMAIL,
      template: 'admin_payout_requested',
      data: {
        userName: userProfile?.full_name || 'Unknown',
        userEmail: userProfile?.email || 'N/A',
        mt5Login: account.mt5_login,
        packageName: account.package_name || 'N/A',
        amount: amount,
        walletAddress: walletAddress,
        currentProfit: currentProfit,
        initialEquity: extendedData.initial_equity,
        runningEquity: extendedData.running_equity,
        requestId: insertData?.id || 'N/A',
        requestTime: new Date().toLocaleString()
      }
    });
  } catch (emailError) {
    // Log email error but don't fail the payout request
    console.error('Failed to send admin notification email:', emailError);
  }
}

// User Profile
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, updates: any) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

// Admin User Management
export async function getUsers() {
  const { data, error } = await supabase
    .rpc('get_users');

  if (error) throw error;
  return data;
}

export async function updateUserStatus(userId: string, status: 'active' | 'suspended') {
  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', userId);

  if (error) throw error;
}