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
    <div className="mb-6 rounded-md bg-[#1e1e1e] border border-[#2A2A2A] shadow-sm overflow-hidden">
      <div className="p-8 flex flex-col md:flex-row items-center justify-between">
        <div className="max-w-2xl text-center md:text-left mb-6 md:mb-0">
          <h3 className="text-2xl font-bold text-white mb-3">
            Keep growing in your trading journey with FundedCobra
          </h3>
          <p className="text-[#a0a0a0] text-sm leading-relaxed">
            Your previous {breachedAccounts.length} account{breachedAccounts.length > 1 ? 's are' : ' is'} now behind you. 
            Keep your momentum going! Unlike other firms, our accounts are 100% instant—no evaluations, no waiting periods.
            Grab a new allocation and jump straight back into the action.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => navigate('/buy-account')} 
            className="px-6 py-2.5 bg-[#bd4dd6] hover:bg-[#a63aba] text-white font-bold rounded text-sm transition-colors w-full sm:w-auto text-nowrap"
          >
            Get Instant Funding
          </button>
        </div>
      </div>
    </div>
  );
}
