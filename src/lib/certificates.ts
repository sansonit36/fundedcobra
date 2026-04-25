import { supabase } from './supabase';

// ============================================================
// Types
// ============================================================

export interface PayoutCertificate {
  id: string;
  certificate_number: string;
  user_id: string;
  payout_request_id: string | null;
  account_id: string | null;
  trader_name: string;
  account_type: string;
  account_size: number;
  payout_amount: number;
  payout_date: string;
  verification_url: string;
  is_verified: boolean;
  created_at: string;
}

export interface TraderProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  is_public: boolean;
  is_featured: boolean;
  total_payouts: number;
  total_certificates: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface HighlightedTrade {
  id: string;
  user_id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  profit: number;
  volume: number;
  duration: string | null;
  account_type: string | null;
  close_date: string | null;
  is_manual: boolean;
  added_by_admin: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string | null;
  display_name: string;
  total_payout: number;
  account_type: string | null;
  is_manual: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  avatar_url?: string;
  certificate_count?: number;
}

// ============================================================
// Public Certificate Functions
// ============================================================

export async function getCertificateByNumber(certNumber: string): Promise<PayoutCertificate | null> {
  const { data, error } = await supabase
    .from('payout_certificates')
    .select('*')
    .eq('certificate_number', certNumber)
    .single();

  if (error) {
    console.error('Error fetching certificate:', error);
    return null;
  }
  return data;
}

export async function getCertificateById(certId: string): Promise<PayoutCertificate | null> {
  const { data, error } = await supabase
    .from('payout_certificates')
    .select('*')
    .eq('id', certId)
    .single();

  if (error) {
    console.error('Error fetching certificate:', error);
    return null;
  }
  return data;
}

export async function getCertificatesByUser(userId: string): Promise<PayoutCertificate[]> {
  const { data, error } = await supabase
    .from('payout_certificates')
    .select('*')
    .eq('user_id', userId)
    .order('payout_date', { ascending: false });

  if (error) {
    console.error('Error fetching certificates:', error);
    return [];
  }
  return data || [];
}

// ============================================================
// Public Trader Profile Functions
// ============================================================

export async function getPublicTraderProfile(userId: string): Promise<TraderProfile | null> {
  const { data, error } = await supabase
    .from('trader_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching trader profile:', error);
    return null;
  }

  // Get additional profile info
  const { data: profileData } = await supabase
    .from('profiles')
    .select('name, email, avatar_url')
    .eq('id', userId)
    .single();

  if (profileData) {
    return {
      ...data,
      full_name: profileData.name,
      email: profileData.email,
      avatar_url: data.avatar_url || profileData.avatar_url
    };
  }

  return data;
}

export async function getRecommendedTraders(): Promise<TraderProfile[]> {
  const { data, error } = await supabase
    .from('trader_profiles')
    .select('*')
    .eq('is_public', true)
    .order('total_payouts', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching recommended traders:', error);
    return [];
  }

  // Enrich with avatar_url from profiles table
  if (data && data.length > 0) {
    const userIds = data.map(p => p.id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, avatar_url, name')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return data.map(tp => {
      const p = profileMap.get(tp.id);
      return {
        ...tp,
        avatar_url: tp.avatar_url || p?.avatar_url || null,
        full_name: tp.display_name || p?.name || null,
      };
    });
  }

  return data || [];
}

export async function getHighlightedTrades(userId: string): Promise<HighlightedTrade[]> {
  const { data, error } = await supabase
    .from('highlighted_trades')
    .select('*')
    .eq('user_id', userId)
    .order('close_date', { ascending: false });

  if (error) {
    console.error('Error fetching highlighted trades:', error);
    return [];
  }
  return data || [];
}

// ============================================================
// Leaderboard Functions
// ============================================================

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // Get manual leaderboard entries
  const { data: manualEntries, error: manualError } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('is_visible', true)
    .order('total_payout', { ascending: false });

  if (manualError) {
    console.error('Error fetching leaderboard:', manualError);
    return [];
  }

  // Also get auto-generated entries from trader_profiles
  const { data: profileEntries, error: profileError } = await supabase
    .from('trader_profiles')
    .select('id, display_name, total_payouts, total_certificates, is_public, is_featured')
    .eq('is_public', true)
    .gt('total_payouts', 0)
    .order('total_payouts', { ascending: false });

  if (profileError) {
    console.error('Error fetching profile leaderboard:', profileError);
    return manualEntries || [];
  }

  // Collect all user_ids to batch-fetch avatars
  const allUserIds = [
    ...(manualEntries || []).filter(e => e.user_id).map(e => e.user_id as string),
    ...(profileEntries || []).map(p => p.id as string),
  ];

  // Fetch avatars from profiles table
  const avatarMap: Record<string, string> = {};
  if (allUserIds.length > 0) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', allUserIds);
    (profileData || []).forEach(p => {
      if (p.avatar_url) avatarMap[p.id] = p.avatar_url;
    });
  }

  // Merge: convert profile entries to leaderboard format, avoid duplicates
  const manualUserIds = new Set((manualEntries || []).filter(e => e.user_id).map(e => e.user_id));

  const autoEntries: LeaderboardEntry[] = (profileEntries || [])
    .filter(p => !manualUserIds.has(p.id))
    .map(p => ({
      id: p.id,
      user_id: p.id,
      display_name: p.display_name || 'Trader',
      total_payout: p.total_payouts,
      account_type: null,
      is_manual: false,
      is_visible: true,
      created_at: '',
      updated_at: '',
      certificate_count: p.total_certificates,
      avatar_url: avatarMap[p.id],
    }));

  // Attach avatars to manual entries too
  const enrichedManual = (manualEntries || []).map(e => ({
    ...e,
    avatar_url: e.user_id ? (avatarMap[e.user_id] ?? e.avatar_url) : e.avatar_url,
  }));

  const combined = [...enrichedManual, ...autoEntries];
  combined.sort((a, b) => b.total_payout - a.total_payout);

  return combined;
}

// ============================================================
// Admin Certificate Functions
// ============================================================

export async function getAllCertificates(): Promise<PayoutCertificate[]> {
  const { data, error } = await supabase
    .from('payout_certificates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createManualCertificate(data: {
  user_id: string;
  trader_name: string;
  account_type: string;
  account_size: number;
  payout_amount: number;
  payout_date: string;
}): Promise<PayoutCertificate> {
  // Generate a certificate number
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  const certNumber = `FC-${new Date().getFullYear()}-M${timestamp}${random}`;

  const { data: cert, error } = await supabase
    .from('payout_certificates')
    .insert({
      certificate_number: certNumber,
      user_id: data.user_id,
      trader_name: data.trader_name,
      account_type: data.account_type,
      account_size: data.account_size,
      payout_amount: data.payout_amount,
      payout_date: data.payout_date,
      verification_url: `https://account.fundedcobra.com/verify/${certNumber}`,
      is_verified: true
    })
    .select()
    .single();

  if (error) throw error;
  return cert;
}

export async function toggleCertificateVerification(certId: string, isVerified: boolean): Promise<void> {
  const { error } = await supabase
    .from('payout_certificates')
    .update({ is_verified: isVerified })
    .eq('id', certId);

  if (error) throw error;
}

// ============================================================
// Admin Trader Profile Functions
// ============================================================

export async function getAllTraderProfiles(): Promise<TraderProfile[]> {
  const { data, error } = await supabase
    .from('trader_profiles')
    .select('*')
    .order('total_payouts', { ascending: false });

  if (error) throw error;

  // Enrich with profile data
  if (data && data.length > 0) {
    const userIds = data.map(p => p.id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return data.map(tp => {
      const p = profileMap.get(tp.id);
      return {
        ...tp,
        full_name: p?.name || null,
        email: p?.email || null,
        avatar_url: p?.avatar_url || null
      };
    });
  }

  return data || [];
}

export async function createTraderProfile(data: {
  user_id: string;
  display_name: string;
  bio?: string;
  is_public?: boolean;
  is_featured?: boolean;
  total_payouts?: number;
  total_certificates?: number;
}): Promise<void> {
  const { error } = await supabase
    .from('trader_profiles')
    .insert({
      id: data.user_id,
      display_name: data.display_name,
      bio: data.bio || null,
      is_public: data.is_public ?? false,
      is_featured: data.is_featured ?? false,
      total_payouts: data.total_payouts ?? 0,
      total_certificates: data.total_certificates ?? 0,
    });

  if (error) throw error;
}

export async function updateTraderProfile(userId: string, updates: {
  display_name?: string;
  bio?: string;
  is_public?: boolean;
  is_featured?: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('trader_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}

export async function addHighlightedTrade(data: {
  user_id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  profit: number;
  volume: number;
  duration?: string;
  account_type?: string;
  close_date?: string;
  is_manual?: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('highlighted_trades')
    .insert({
      ...data,
      is_manual: data.is_manual ?? true,
      added_by_admin: true
    });

  if (error) throw error;
}

export async function removeHighlightedTrade(tradeId: string): Promise<void> {
  const { error } = await supabase
    .from('highlighted_trades')
    .delete()
    .eq('id', tradeId);

  if (error) throw error;
}

export async function pullTopTradesFromHistory(userId: string, limit: number = 5): Promise<void> {
  // 1. Get user's MT5 accounts to link trades
  const { data: accounts, error: accError } = await supabase
    .from('trading_accounts')
    .select('mt5_login, package_name')
    .eq('user_id', userId);

  if (accError) throw accError;
  if (!accounts || accounts.length === 0) return; // No accounts to pull from

  const mt5Logins = accounts.map(a => a.mt5_login);

  // 2. Pull biggest trades from trade_history
  const { data: trades, error: fetchError } = await supabase
    .from('trade_history')
    .select('*')
    .in('mt5_id', mt5Logins)
    .gt('profit', 0)
    .order('profit', { ascending: false })
    .limit(limit);

  if (fetchError) throw fetchError;

  if (trades && trades.length > 0) {
    const highlighted = trades.map(t => {
      const package_name = accounts.find(a => a.mt5_login === t.mt5_id)?.package_name || null;
      return {
        user_id: userId,
        symbol: t.symbol || 'Unknown',
        direction: (t.type?.toLowerCase()?.includes('sell') ? 'sell' : 'buy') as 'buy' | 'sell',
        profit: t.profit || 0,
        volume: t.volume || 0.01,
        duration: t.duration || null,
        account_type: package_name,
        close_date: t.close_time || t.created_at || null,
        is_manual: false,
        added_by_admin: true
      };
    });

    const { error: insertError } = await supabase
      .from('highlighted_trades')
      .insert(highlighted);

    if (insertError) throw insertError;
  }
}

// ============================================================
// Admin Leaderboard Functions
// ============================================================

export async function getAllLeaderboardEntries(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .order('total_payout', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createLeaderboardEntry(data: {
  user_id?: string;
  display_name: string;
  total_payout: number;
  account_type?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('leaderboard_entries')
    .insert({
      ...data,
      is_manual: true,
      is_visible: true
    });

  if (error) throw error;
}

export async function updateLeaderboardEntry(id: string, updates: {
  display_name?: string;
  total_payout?: number;
  account_type?: string;
  is_visible?: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('leaderboard_entries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteLeaderboardEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('leaderboard_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
