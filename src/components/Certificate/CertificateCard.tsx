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
          dark: '#FFFFFF',
          light: 'transparent'
        },
        errorCorrectionLevel: 'M'
      });
    }
  }, [certificate, compact]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
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
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-4 transition-all duration-300 hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/5">
        {/* Decorative accent */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Payout Certificate
              </span>
            </div>
            <p className="text-lg font-bold text-emerald-400">
              {formatAmount(certificate.payout_amount)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(certificate.payout_date)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {certificate.account_type} · ${certificate.account_size.toLocaleString()}
            </p>
          </div>
          <canvas ref={qrCanvasRef} className="rounded" />
        </div>
        
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-mono">
            {certificate.certificate_number}
          </span>
          {certificate.is_verified && (
            <span className="text-[10px] text-emerald-400 font-medium">
              ✓ Verified
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] shadow-2xl">
      {/* Top accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-primary-500 to-cyan-500" />

      {/* Decorative corner elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-primary-500/5 to-transparent rounded-tr-full" />

      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <img src="/logo.png" alt="FundedCobra" className="h-8 object-contain" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-3">
              PAYOUT
            </h2>
            <p className="text-sm text-gray-400 font-medium tracking-widest uppercase mt-1">
              Certificate
            </p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <canvas ref={qrCanvasRef} className="rounded" />
            </div>
            <span className="text-[9px] text-gray-500 mt-1">Scan to verify</span>
          </div>
        </div>

        {/* Trader Info */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
            Proudly presented to
          </p>
          <p className="text-xl md:text-2xl font-bold text-primary-400">
            {certificate.trader_name}
          </p>
        </div>

        {/* Payout Amount */}
        <div className="mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
            Your payout
          </p>
          <p className="text-4xl md:text-5xl font-extrabold text-emerald-400 tracking-tight">
            {formatAmount(certificate.payout_amount)}
          </p>
          <div className="flex items-center space-x-4 mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20">
              {certificate.account_type}
            </span>
            <span className="text-sm text-gray-400">
              ${certificate.account_size.toLocaleString()} Account
            </span>
          </div>
        </div>

        {/* Footer with date and signature */}
        <div className="flex items-end justify-between pt-6 border-t border-white/10">
          <div>
            <p className="text-sm font-medium text-white">
              {formatDate(certificate.payout_date)}
            </p>
            <p className="text-xs text-gray-500">Date</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-script italic text-gray-300" style={{ fontFamily: 'Georgia, serif' }}>
              FundedCobra
            </p>
            <p className="text-xs text-gray-500">CEO, FundedCobra</p>
          </div>
        </div>

        {/* Certificate ID */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-gray-600 font-mono">
            Certificate: {certificate.certificate_number}
          </span>
          {certificate.is_verified && (
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">
                Verified by FundedCobra
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
