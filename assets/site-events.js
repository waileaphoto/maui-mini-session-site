/* ---------- Analytics + consent gate ----------
   Prepended ahead of the existing MMSAnalytics module below, which is left
   untouched. Two jobs:
     1. Load Google Analytics (G-2PV69QT3HR), denied by default in the EEA/UK/CH.
     2. Decide whether the Meta pixel may load at all.
   The module below calls window.fbq(...). When consent has not been given we
   install a stub that quietly collects those calls instead of sending them, so
   the module keeps working and nothing reaches Meta. If the visitor later
   clicks Allow, the real pixel loads and the collected calls are replayed. */
(function () {
  var LIVE = ['mauiminisession.com', 'www.mauiminisession.com'];
  var CONSENT_KEY = 'mms-consent';
  var GA_ID = 'G-2PV69QT3HR';

  function stubPixel() {
    var pend = [];
    var f = function () { pend.push(Array.prototype.slice.call(arguments)); };
    f.queue = []; f.loaded = true; f.version = '2.0'; f.__pending = pend;
    window.fbq = f; window._fbq = f;
  }

  // Deploy previews and local files: measure nothing at all.
  if (LIVE.indexOf(location.hostname) === -1) { stubPixel(); return; }

  window.__GA_ON = true;

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('consent', 'default', {ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
  gtag('consent', 'default', {ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500,
    region:['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH']});
  gtag('js', new Date());
  gtag('config', GA_ID);
  var gs = document.createElement('script');
  gs.async = true;
  gs.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(gs);

  function realPixel() {
    if (window.fbq && window.fbq.__real) return;
    var pending = (window.fbq && window.fbq.__pending) || [];
    var n = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = []; n.__real = true;
    window.fbq = n; window._fbq = n;
    var t = document.createElement('script');
    t.async = true;
    t.src = 'https://connect.facebook.net/en_US/fbevents.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(t, s);
    pending.forEach(function (a) { try { n.apply(null, a); } catch (e) {} });
  }

  function regionLikely() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (/^Europe\//.test(tz)) return true;
      if (/^Atlantic\/(Canary|Madeira|Azores|Faroe)/.test(tz)) return true;
    } catch (e) {}
    return /^(de|fr|es|it|nl|pt|pl|sv|da|fi|el|cs|sk|sl|hu|ro|bg|hr|et|lv|lt|ga|mt|is|no)\b/i
      .test(navigator.language || '');
  }

  function showBanner() {
    var bar = document.createElement('div');
    bar.className = 'consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Analytics cookies');
    bar.innerHTML = '<p>We use Google Analytics and the Meta pixel to understand how people find us. Nothing is collected unless you agree.</p>' +
      '<div class="consent-btns"><button type="button" class="consent-no">Decline</button>' +
      '<button type="button" class="consent-yes">Allow</button></div>';
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.classList.add('on'); });
    function close(granted) {
      try { localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied'); } catch (e) {}
      gtag('consent', 'update', {analytics_storage: granted ? 'granted' : 'denied'});
      if (granted) realPixel();
      bar.classList.remove('on');
      setTimeout(function () { bar.remove(); }, 350);
    }
    bar.querySelector('.consent-yes').addEventListener('click', function () { close(true); });
    bar.querySelector('.consent-no').addEventListener('click', function () { close(false); });
  }

  var saved = null;
  try { saved = localStorage.getItem(CONSENT_KEY); } catch (e) {}

  if (saved === 'granted') {
    gtag('consent', 'update', {analytics_storage: 'granted'});
    realPixel();
  } else if (saved === 'denied') {
    stubPixel();
  } else if (!regionLikely()) {
    realPixel();
  } else {
    stubPixel();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showBanner);
    else showBanner();
  }
})();

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

  // Bridge for booking-widget.js, which is shared with the sister site (waileaphoto.com)
    // and calls window.waileaTrack(...) with GA4-style event names. That function was never
    // defined on this site, so booking_start/begin_checkout/purchase/booking_abandoned were
    // silently going nowhere — only PageView and Contact ever reached the Pixel. This maps
    // each call onto the equivalent Meta standard event (or a custom one where there's no
    // standard match) so real booking activity actually reaches ad optimization.
    window.waileaTrack = function (eventName, params) {
          params = params || {};
          const currency = params.currency || 'USD';
          switch (eventName) {
            case 'booking_start':
                      track('ViewContent', {
                                  content_name: params.session_type,
                                  content_category: 'booking',
                      });
                      break;
            case 'begin_checkout':
                      track('InitiateCheckout', {
                                  value: params.value,
                                  currency,
                                  content_name: params.session_type,
                                  num_items: 1,
                      });
                      break;
            case 'purchase':
                      track(
                                  'Purchase',
                        { value: params.value, currency, content_name: params.session_type },
                                  params.transaction_id ? `purchase-${params.transaction_id}` : undefined
                                );
                      break;
            case 'booking_abandoned':
                      trackCustom('BookingAbandoned', {
                                  value: params.value,
                                  currency,
                                  content_name: params.session_type,
                                  reason: params.reason,
                      });
                      break;
            default:
                      trackCustom(eventName, params);
          }
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
