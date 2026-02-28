import { useEffect } from 'react';

export function useAffiliateTracking() {
  useEffect(() => {
    // First try ?ref from current URL
    const url = new URL(window.location.href);
    let ref = url.searchParams.get('ref');

    // Fallback: check what index.html stored earlier
    if (!ref) {
      ref = sessionStorage.getItem('pending_aff_ref');
    }

    if (!ref) return;

    // prevent re-posting on the same session
    const KEY = `affTracked:${ref}`;
    if (sessionStorage.getItem(KEY)) return;

    // call your PHP tracker to set cookie on .rivertonmarkets.com
    fetch('https://rivertonmarkets.com/affiliate/api/track.php', {
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
