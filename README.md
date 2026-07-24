# Maui Mini Session

Static marketing and booking site for [Maui Mini Session](https://mauiminisession.com/), deployed with Netlify.

## Structure

- `index.html` — homepage, metadata, and structured data
- `assets/site.css` — site presentation and responsive layout
- `assets/booking-widget.js` and `assets/booking-widget.css` — live availability and Stripe deposit flow
- `netlify.toml` — publishing directory, domain redirect, security headers, and cache policy
- `robots.txt` and `sitemap.xml` — search-engine discovery

The booking widget connects to the Wailea Photo booking service configured in `index.html`.

## Deployment

Netlify can publish directly from the repository root. Confirm the custom domain and booking flow before directing production traffic to a new deployment.
