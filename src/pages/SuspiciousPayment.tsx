import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Shield } from 'lucide-react';

export default function SuspiciousPayment() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-6">
          <div className="flex items-center justify-center">
            <Shield className="h-12 w-12 text-yellow-400" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-center text-white">
            Payment Under Review
          </h2>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-yellow-400 mr-2" />
            <span className="text-yellow-400 font-medium">Review Required</span>
          </div>
          
          <p className="text-gray-300 text-center mb-6">
            Our system has flagged your payment submission for review. This is a standard procedure 
            to ensure the security of our platform.
          </p>
          
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <h3 className="text-white font-medium mb-2">What happens next?</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Our team will manually review your payment screenshot</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>You'll receive an email notification once the review is complete</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>If approved, your account will be activated</span>
              </li>
            </ul>
          </div>
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={handleGoBack}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}