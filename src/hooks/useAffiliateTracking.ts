import { useEffect } from 'react';

export function useAffiliateTracking() {
  useEffect(() => {
    // First try ?ref from current URL
    const url = new URL(window.location.href);
    let ref = url.searchParams.get('ref');

    // If found in URL, save it persistently
    if (ref) {
      localStorage.setItem('affiliate_ref', ref);
    } else {
      // Fallback: check localStorage
      ref = localStorage.getItem('affiliate_ref');
    }

    if (!ref) return;

    // prevent re-posting on the same session
    const KEY = `affTracked:${ref}`;
    if (sessionStorage.getItem(KEY)) return;

    // call your PHP tracker to set cookie
    fetch(`${import.meta.env.VITE_API_URL}/track.php`, {
      method: 'POST',
      credentials: 'include', // allow Set-Cookie from apex → subdomain
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        ref,
        landing_url: window.location.href,
      }),
    })
      .catch(() => {
        /* ignore errors */
      })
      .finally(() => sessionStorage.setItem(KEY, '1'));
  }, []);
}
