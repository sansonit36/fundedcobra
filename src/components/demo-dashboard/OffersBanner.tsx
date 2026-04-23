import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OffersBanner() {
  return (
    <div className="bg-[#161B22] border border-[#30363D] p-5 flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-5">
      <div className="flex items-start space-x-4">
        <div className="p-2 bg-[#1D9BF0]/10 border border-[#1D9BF0]/20 rounded-sm flex-shrink-0 mt-1">
          <Sparkles className="w-5 h-5 text-[#1D9BF0]" />
        </div>
        <div>
          <h2 className="text-[14px] font-bold text-[#E6EDF3] uppercase tracking-wide">
            Firm Capital Allocation Available
          </h2>
          <p className="text-[13px] text-[#8B949E] mt-1 leading-relaxed max-w-2xl">
            Pass the evaluation phase to trade up to $200,000 of firm capital with an 80% profit split. Leverage institutional conditions and low spread routing.
          </p>
        </div>
      </div>
      
      <div className="mt-4 sm:mt-0 sm:ml-6 flex-shrink-0">
        <Link
          to="/buy-account"
          className="inline-flex items-center space-x-2 px-6 py-2.5 bg-[#E6EDF3] hover:bg-[#C9D1D9] text-[#0E1117] text-[12px] font-bold uppercase tracking-widest rounded-sm transition-colors"
        >
          <span>Request Capital</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
