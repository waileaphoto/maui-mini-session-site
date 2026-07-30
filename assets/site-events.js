// Maui Mini Session marketing attribution and Meta Pixel events.
(function () {
  const PIXEL_ID = '2822112537943189';
  const ATTRIBUTION_KEY = 'mms_marketing_attribution_v1';

  function readAttribution() {
    try {
      return JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function captureAttribution() {
    const params = new URLSearchParams(window.location.search);
    const current = {
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || '',
      content: params.get('utm_content') || '',
      term: params.get('utm_term') || '',
      fbclid: params.get('fbclid') || '',
      landingPage: window.location.href,
      capturedAt: new Date().toISOString(),
    };
    const hasCampaignData = Object.values(current).some(Boolean);
    const previous = readAttribution();
    if (hasCampaignData) {
      const combined = { ...previous, ...current };
      try {
        localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(combined));
      } catch (_) {}
      return combined;
    }
    return previous;
  }

  function inferredReferral(attribution) {
    const source = String(attribution.source || '').toLowerCase();
    const medium = String(attribution.medium || '').toLowerCase();
    if (source.includes('instagram')) return medium.includes('paid') ? 'Instagram Ad' : 'Instagram Post';
    if (source.includes('facebook') || attribution.fbclid) return medium.includes('group') ? 'Facebook Group' : 'Facebook Ad';
    if (source.includes('google')) return medium.includes('paid') || medium.includes('cpc') ? 'Google Ad' : 'Google Search';
    return '';
  }

  function eventId(name) {
    if (window.crypto?.randomUUID) return `${name}-${window.crypto.randomUUID()}`;
    return `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const attribution = captureAttribution();

  // Meta Pixel base code, loaded once.
  if (!window.fbq) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  }

  window.fbq('init', PIXEL_ID);

  function campaignParams(extra) {
    return {
      campaign_source: attribution.source || undefined,
      campaign_medium: attribution.medium || undefined,
      campaign_name: attribution.campaign || undefined,
      campaign_content: attribution.content || undefined,
      ...extra,
    };
  }

  function track(name, params, id) {
    const resolvedId = id || eventId(name);
    window.fbq('track', name, campaignParams(params || {}), { eventID: resolvedId });
    return resolvedId;
  }

  function trackCustom(name, params, id) {
    const resolvedId = id || eventId(name);
    window.fbq('trackCustom', name, campaignParams(params || {}), { eventID: resolvedId });
    return resolvedId;
  }

  window.MMSAnalytics = {
    attribution,
    inferredReferral: inferredReferral(attribution),
    track,
    trackCustom,
    eventId,
  };

  track('PageView');

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]').forEach((link) => {
      link.addEventListener('click', () => {
        track('Contact', {
          contact_method: link.href.startsWith('tel:') ? 'phone' : 'email',
        });
      });
    });
  });
})();
