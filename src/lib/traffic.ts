// Reads UTM params and referrer from the URL/session and returns traffic source info.
// Call this on app load and persist to sessionStorage so it survives OAuth redirects.

export function captureTrafficSource(): { traffic_source: string; referrer: string } {
  // Try to get from sessionStorage first (survives OAuth redirect)
  const stored = sessionStorage.getItem('nudely_traffic');
  if (stored) {
    try { return JSON.parse(stored); } catch {}
  }

  // Read UTM params from current URL
  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get('utm_source');
  const utm_medium = params.get('utm_medium');
  const utm_campaign = params.get('utm_campaign');
  const ref = params.get('ref'); // custom short param e.g. ?ref=twitter

  // Read document referrer
  const docReferrer = document.referrer || '';

  let traffic_source = 'direct';

  if (utm_source) {
    // Explicit UTM tag — most reliable
    traffic_source = utm_campaign
      ? `${utm_source}/${utm_campaign}`
      : utm_medium
      ? `${utm_source}/${utm_medium}`
      : utm_source;
  } else if (ref) {
    traffic_source = ref;
  } else if (docReferrer) {
    // Infer from referrer domain
    try {
      const refHost = new URL(docReferrer).hostname.replace('www.', '');
      if (refHost.includes('google')) traffic_source = 'google';
      else if (refHost.includes('x.com') || refHost.includes('twitter')) traffic_source = 'x/twitter';
      else if (refHost.includes('facebook') || refHost.includes('fb.')) traffic_source = 'facebook';
      else if (refHost.includes('instagram')) traffic_source = 'instagram';
      else if (refHost.includes('tiktok')) traffic_source = 'tiktok';
      else if (refHost.includes('reddit')) traffic_source = 'reddit';
      else if (refHost.includes('youtube')) traffic_source = 'youtube';
      else if (refHost.includes('bing')) traffic_source = 'bing';
      else traffic_source = refHost; // use the domain as-is
    } catch {}
  }

  const result = { traffic_source, referrer: docReferrer.slice(0, 200) };

  // Persist so OAuth redirect doesn't wipe it
  sessionStorage.setItem('nudely_traffic', JSON.stringify(result));

  return result;
}
