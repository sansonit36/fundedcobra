import { useEffect } from 'react';
import { MessageCircle, Clock, Mail, Globe } from 'lucide-react';

declare global {
  interface Window {
    Tawk_API?: {
      showWidget?: () => void;
      hideWidget?: () => void;
      [key: string]: unknown;
    };
    Tawk_LoadStart?: Date;
  }
}

export default function LiveSupport() {
  useEffect(() => {
    // Inject Tawk.to script
    if (!document.getElementById('tawkto-script')) {
      window.Tawk_API = window.Tawk_API || {};
      window.Tawk_LoadStart = new Date();

      const s1 = document.createElement('script');
      const s0 = document.getElementsByTagName('script')[0];
      s1.id = 'tawkto-script';
      s1.async = true;
      s1.src = `https://embed.tawk.to/${import.meta.env.VITE_TAWKTO_ID}`;
      s1.charset = 'UTF-8';
      s1.setAttribute('crossorigin', '*');
      s0?.parentNode?.insertBefore(s1, s0);
    } else {
      // Script already loaded — show the widget if hidden
      window.Tawk_API?.showWidget?.();
    }

    return () => {
      // Hide widget when leaving the page (optional UX choice)
      // window.Tawk_API?.hideWidget?.();
    };
  }, []);

  const supportInfo = [
    {
      icon: Clock,
      title: 'Support Hours',
      description: 'Monday – Friday, 9 AM – 6 PM (UTC)',
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: import.meta.env.VITE_SUPPORT_EMAIL,
    },
    {
      icon: Globe,
      title: 'Languages',
      description: 'English, Arabic, Spanish',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Live Support
        </h1>
        <p className="text-gray-400 max-w-md mx-auto text-sm leading-relaxed">
          Our support team is here to help you. Use the chat widget below to
          connect with us in real time.
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {supportInfo.map((item, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 flex flex-col items-center text-center space-y-3 hover:border-primary-500/40 transition-colors duration-300"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-500/20 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{item.title}</p>
              <p className="text-gray-400 text-xs mt-1">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chat box placeholder / notice */}
      <div className="rounded-2xl border border-primary-500/20 bg-gradient-to-br from-primary-500/5 to-primary-500/5 backdrop-blur-sm p-8 text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>
          <span className="text-green-400 text-sm font-medium">Support agents are online</span>
        </div>
        <p className="text-gray-400 text-sm">
          The live chat widget is loading in the bottom-right corner of your screen.
          Click it to start a conversation with our team.
        </p>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
        <p className="text-gray-500 text-xs">
          Powered by{' '}
          <span className="text-primary-400 font-medium">Tawk.to</span> — your
          messages are private and secure.
        </p>
      </div>
    </div>
  );
}
