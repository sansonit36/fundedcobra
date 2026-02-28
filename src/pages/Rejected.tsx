import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, Ban, AlertTriangle, Shield } from 'lucide-react';

export default function Rejected() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-logout after 10 seconds
    const timer = setTimeout(() => {
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login');
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="card-gradient rounded-2xl p-8 border-2 border-red-500/50 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-red-500/10 border-4 border-red-500/30 flex items-center justify-center animate-pulse">
              <Ban className="w-12 h-12 text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center mb-4">
            <span className="text-red-400">Account Suspended</span>
          </h1>

          {/* Subtitle */}
          <p className="text-center text-gray-300 text-lg mb-8">
            Your account has been permanently suspended
          </p>

          {/* Reason Section */}
          <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-start space-x-3 mb-4">
              <Shield className="w-6 h-6 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-white font-bold text-lg mb-2">Suspension Reason</h3>
                <p className="text-red-300 text-sm leading-relaxed">
                  Our AI-powered verification system detected that you uploaded a <span className="font-bold">fake or manipulated payment screenshot</span>. 
                  This is a serious violation of our terms of service.
                </p>
              </div>
            </div>
          </div>

          {/* What This Means */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <div className="flex items-start space-x-3 mb-3">
              <XCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <h3 className="text-white font-semibold">What This Means:</h3>
            </div>
            <ul className="space-y-2 ml-8 text-gray-300 text-sm">
              <li className="flex items-start">
                <span className="text-red-400 mr-2">•</span>
                <span>Your account has been <strong className="text-white">permanently banned</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-red-400 mr-2">•</span>
                <span>You cannot create new accounts with the same email or device</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-400 mr-2">•</span>
                <span>All pending requests have been cancelled</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-400 mr-2">•</span>
                <span>No refunds will be processed for fraudulent submissions</span>
              </li>
            </ul>
          </div>

          {/* Warning Notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-200 text-sm">
                  <span className="font-bold">We take fraud seriously.</span> All payment screenshots are verified using 
                  advanced AI technology. Attempting to deceive our system results in immediate and permanent suspension.
                </p>
              </div>
            </div>
          </div>

          {/* Policy Reference */}
          <div className="text-center text-gray-400 text-xs mb-6">
            <p>This action is in accordance with our Terms of Service, Section 4.2:</p>
            <p className="italic mt-1">"Users found submitting fraudulent payment proof will face immediate account termination."</p>
          </div>

          {/* Contact Support (Optional) */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-gray-300 text-sm mb-2">
              Believe this was a mistake?
            </p>
            <p className="text-gray-400 text-xs">
              Contact support at{' '}
              <a href="mailto:support@rivertonmarkets.com" className="text-blue-400 hover:text-blue-300 underline">
                support@rivertonmarkets.com
              </a>
              {' '}with your account details and evidence of legitimate payment.
            </p>
          </div>

          {/* Auto-logout Timer */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              You will be automatically logged out in 10 seconds...
            </p>
          </div>
        </div>

        {/* Footer Message */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Riverton Markets · Protecting Our Community Since 2024
          </p>
        </div>
      </div>
    </div>
  );
}
