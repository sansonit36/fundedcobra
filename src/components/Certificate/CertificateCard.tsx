import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck } from 'lucide-react';
import type { PayoutCertificate } from '../../lib/certificates';

interface CertificateCardProps {
  certificate: PayoutCertificate;
  compact?: boolean;
}

export default function CertificateCard({ certificate, compact = false }: CertificateCardProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (qrCanvasRef.current) {
      const verificationUrl = certificate.verification_url ||
        `https://account.fundedcobra.com/verify/${certificate.certificate_number}`;

      QRCode.toCanvas(qrCanvasRef.current, verificationUrl, {
        width: compact ? 80 : 120,
        margin: 1,
        color: {
          dark: '#E6EDF3', // Light gray/white for QR on dark bg
          light: '#0E1117' // GitHub dark background color
        },
        errorCorrectionLevel: 'M'
      });
    }
  }, [certificate, compact]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-[#30363D] bg-[#0E1117] p-5 transition-all duration-300 hover:border-white/20">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h3 className="text-[14px] font-bold text-[#E6EDF3] uppercase tracking-wide">
              Payout Certificate
            </h3>
            <p className="text-xl font-bold text-[#1D9BF0] mt-1.5 leading-tight">
              {formatAmount(certificate.payout_amount)}
            </p>
            <p className="text-[12px] text-[#8B949E] mt-1">
              Issued {formatDate(certificate.payout_date)}
            </p>
          </div>
          <div className="p-1 rounded bg-[#0E1117] border border-[#30363D]">
            <canvas ref={qrCanvasRef} className="rounded-sm" />
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-[#30363D] flex items-center justify-between">
          <span className="text-[11px] text-[#7D8590] font-mono tracking-widest uppercase">
            ID: {certificate.certificate_number}
          </span>
          {certificate.is_verified && (
            <span className="text-[11px] text-[#3FB950] font-bold tracking-wide uppercase flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Verified
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-none sm:rounded-sm border border-[#30363D] bg-[#0E1117] shadow-xl overflow-hidden text-left p-8 md:p-14">
      {/* Header Block constraints */}
      <div className="flex flex-col md:flex-row md:items-start justify-between border-b border-[#30363D] pb-10">
        <div>
          <img src="/logo.png" alt="FundedCobra" className="h-10 object-contain block mb-6 opacity-90" />
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#E6EDF3] tracking-tight uppercase leading-none">
            PAYOUT CERTIFICATE
          </h1>
          <p className="text-sm text-[#8B949E] font-medium tracking-widest uppercase mt-3">
            Official Financial Document
          </p>
        </div>
        {certificate.is_verified && (
          <div className="hidden md:flex flex-col items-end">
            <div className="flex items-center space-x-2 text-[#3FB950] border border-[#3FB950]/20 bg-[#3FB950]/5 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[11px] font-bold tracking-widest uppercase">
                Authentic
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recipient Details */}
      <div className="mt-12 space-y-12">
        <div>
          <p className="text-[11px] text-[#7D8590] uppercase tracking-widest mb-2 font-semibold">
            Awarded To
          </p>
          <p className="text-3xl md:text-4xl font-bold text-[#E6EDF3]">
            {certificate.trader_name}
          </p>
        </div>

        {/* Payout Block (Accent) */}
        <div>
          <p className="text-[11px] text-[#7D8590] uppercase tracking-widest mb-3 font-semibold">
            Authorized Payout Amount
          </p>
          <p className="text-5xl md:text-6xl font-black text-[#1D9BF0] tracking-tighter">
            {formatAmount(certificate.payout_amount)}
          </p>
          <div className="inline-flex mt-4">
            <span className="text-[13px] font-bold text-[#E6EDF3] bg-[#21262D] border border-[#30363D] px-4 py-1.5 rounded-none sm:rounded">
              {certificate.account_type} — ${certificate.account_size.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Verification Layout */}
      <div className="mt-16 pt-10 border-t border-[#30363D] grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* QR Verification Block */}
        <div className="flex items-start space-x-5">
          <div className="p-1 border border-[#30363D] bg-[#0E1117] flex-shrink-0">
            <canvas ref={qrCanvasRef} className="rounded-sm" />
          </div>
          <div className="flex flex-col justify-center py-1">
            <span className="text-[11px] font-bold text-[#E6EDF3] tracking-widest uppercase mb-1">
              Scan to Verify
            </span>
            <span className="text-[13px] text-[#8B949E] font-medium leading-relaxed mb-3">
              Aim your camera at the code <br className="hidden md:block" />
              to validate origin.
            </span>
            <div>
              <p className="text-[10px] text-[#7D8590] uppercase tracking-widest mb-0.5">Certificate ID</p>
              <p className="text-[13px] font-mono text-[#E6EDF3] font-semibold">{certificate.certificate_number}</p>
            </div>
          </div>
        </div>

        {/* Authorized Signature Block */}
        <div className="flex flex-col justify-end md:items-end">
          <div className="w-48 border-b border-[#30363D] pb-3 text-left md:text-right">
            <p className="text-2xl font-serif italic text-[#8B949E] mb-2 pr-2">
              FundedCobra
            </p>
          </div>
          <p className="text-[11px] text-[#7D8590] font-bold tracking-widest uppercase mt-3 text-left md:text-right">
            Authorized Signature
          </p>
          <p className="text-[11px] text-[#7D8590] uppercase tracking-widest mt-1 text-left md:text-right">
            Dated: {formatDate(certificate.payout_date)}
          </p>
        </div>

      </div>
    </div>
  );
}
