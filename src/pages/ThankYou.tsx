import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

// Extend window interface for external tracking libraries
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    ttq?: {
      track: (...args: any[]) => void;
    };
    gtag?: (...args: any[]) => void;
  }
}

export default function ThankYou() {
  const navigate = useNavigate();
  const location = useLocation();
  const { amount, packageName } = location.state || {};

  useEffect(() => {
    // Use a global flag on window object to prevent double firing
    if ((window as any).__purchaseTracked) {
      console.log('Purchase already tracked, skipping');
      return;
    }
    
    // Set flag immediately
    (window as any).__purchaseTracked = true;
    
    // Small delay to ensure flag is set before any potential re-render
    setTimeout(() => {
      // Track purchase event with value
      if (window.fbq) {
        console.log('Firing Facebook Purchase event with value:', amount);
        window.fbq('track', 'Purchase', {
          value: amount || 1.0,
          currency: 'USD',
          content_name: packageName || 'Trading Account',
          content_type: 'product'
        });
      }

      // Trigger TikTok Purchase event
      if (window.ttq) {
        window.ttq.track('CompletePayment', {
          value: amount || 1.0,
          currency: 'USD',
          content_name: packageName || 'Trading Account'
        });
      }
      
      // Google Ads Conversion Tracking
      if (window.gtag) {
        window.gtag('event', 'conversion', {
          'send_to': 'AW-17758744372/Brw-COi1xMYbELTeg5RC',
          'value': amount || 1.0,
          'currency': 'USD',
          'transaction_id': ''
        });
      }
    }, 100);
  }, [amount, packageName]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card-gradient rounded-2xl p-8 border border-white/5 max-w-2xl w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Thank You for Your Purchase!
        </h1>
        
        <p className="text-gray-300 mb-8">
          Your account request has been submitted successfully. Our team will review your payment and activate your account shortly.
        </p>

        <div className="space-y-6">
          <div className="p-6 rounded-lg bg-white/5 text-left">
            <h2 className="text-xl font-semibold text-white mb-4">Next Steps:</h2>
            <ul className="space-y-4">
              <li className="flex items-start">
                <ArrowRight className="w-5 h-5 text-primary-400 mt-1 shrink-0" />
                <span className="ml-2 text-gray-300">
                  We will verify your payment and process your account request within 24 hours.
                </span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="w-5 h-5 text-primary-400 mt-1 shrink-0" />
                <span className="ml-2 text-gray-300">
                  Once approved, you'll receive your MT5 login credentials via email.
                </span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="w-5 h-5 text-primary-400 mt-1 shrink-0" />
                <span className="ml-2 text-gray-300">
                  You can track your account status in the Trading Accounts section.
                </span>
              </li>
            </ul>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/trading-accounts')}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
            >
              View Trading Accounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}