import React, { useState, useEffect } from 'react';
import { AlertTriangle, ArrowRight, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ComplianceStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [breachedAccounts, setBreachedAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadCompliance();
  }, [user]);

  const loadCompliance = async () => {
    try {
      const { data } = await supabase
        .from('trading_accounts')
        .select('id, mt5_login, breach_reason')
        .eq('user_id', user!.id)
        .eq('status', 'breached');

      setBreachedAccounts(data || []);
    } catch (err) {
      console.error('Error loading compliance status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || breachedAccounts.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-500/10"
         style={{ background: 'linear-gradient(135deg, #1f1418 0%, #161B22 100%)' }}>
      <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="relative z-10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {breachedAccounts.length} account{breachedAccounts.length > 1 ? 's' : ''} breached
            </p>
            <p className="text-xs text-[#8B949E] mt-1 max-w-lg leading-relaxed">
              Keep your momentum going! Unlike other firms, our Instant accounts require no evaluations — get back to trading in minutes.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/buy-account')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap shadow-md shadow-emerald-500/20"
        >
          <Rocket className="w-4 h-4" />
          Get New Account
        </button>
      </div>
    </div>
  );
}
