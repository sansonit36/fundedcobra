import React, { useState, useEffect } from 'react';
import { Shield, AlertOctagon, CheckCircle, ArrowRight } from 'lucide-react';
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
    <div className="mb-6 rounded-2xl border border-white/[0.06] shadow-lg shadow-black/10 overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #161B22 0%, #1a1520 100%)' }}>
      <div className="p-8 flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#8A2BE2]/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="max-w-2xl text-center md:text-left mb-6 md:mb-0 relative z-10">
          <h3 className="text-2xl font-bold text-white mb-3">
            Keep growing in your trading journey with FundedCobra
          </h3>
          <p className="text-[#8B949E] text-sm leading-relaxed">
            Your previous {breachedAccounts.length} account{breachedAccounts.length > 1 ? 's are' : ' is'} now behind you. 
            Keep your momentum going! Unlike other firms, our accounts are 100% instant—no evaluations, no waiting periods.
            Grab a new allocation and jump straight back into the action.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10">
          <button
            onClick={() => navigate('/buy-account')} 
            className="px-6 py-2.5 bg-[#8A2BE2] hover:bg-[#7c22d1] text-white font-bold rounded-xl text-sm transition-all duration-200 w-full sm:w-auto text-nowrap shadow-lg shadow-[#8A2BE2]/20 hover:shadow-[#8A2BE2]/40 hover:-translate-y-0.5"
          >
            Get Instant Funding
          </button>
        </div>
      </div>
    </div>
  );
}
