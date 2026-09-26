# Google Maps address setup

The home page uses the Maps JavaScript API Places library for US-only address suggestions. Selecting a suggestion retrieves only its formatted address and place ID. The optional “Use my current location” action asks for browser location permission only after the user clicks it, then uses the Geocoding library to find a nearby US address. Selected place IDs are sent to the ride API along with the address text.

## Create a restricted browser key

In Google Cloud Console, select the `travelduckling` project, then:

1. Enable **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**.
2. Open **Google Maps Platform → Credentials** and create a dedicated API key for the website.
3. Set **Application restrictions → Websites**. Add the production site origins (for example, `https://travelduckling.com/*` and `https://www.travelduckling.com/*`) and the exact local development origin you use (for example, `http://localhost:5500/*`). Add the GitHub Pages hostname only if you still use it.
4. Set **API restrictions → Restrict key** to those three APIs only, then save.
5. A restricted browser key is already set in `assets/js/config.js`. This key will be visible in the public website and public source. Website and API restrictions are the protection; never put a server/service-account key here. If you rotate it later, replace that value with the new browser key.
6. Set low per-day quotas for Places Autocomplete, Place Details, and Geocoding while the prototype is invite-only. Budget alerts notify you but do not stop usage; quota limits are the stronger usage cap.

Once the key is configured, use the site over HTTPS or localhost, type at least three characters into either location field, and select a suggestion. For current location, click **Use my current location** and allow the browser prompt. Typing arbitrary text remains available if a user does not select a suggestion.

## Prototype cost

Google's current pricing lists monthly free usage caps of 10,000 Autocomplete Requests, 10,000 Place Details Essentials, and 10,000 Geocoding events per billing account. Since this page uses session tokens and ends a selected session with an Essentials Place Details request, the first 12 autocomplete requests in a selected session are billed per request (the next requests in that session are free); the Place Details request is billed separately. An abandoned session is billed per request. After the applicable free caps, the published first paid tiers are currently $2.83 per 1,000 autocomplete requests, $5 per 1,000 Place Details Essentials, and $5 per 1,000 geocoding events. Google aggregates usage across projects attached to the billing account, so these aren't necessarily separate allowances for every project. Check [session pricing](https://developers.google.com/maps/documentation/places/web-service/session-pricing) and the [current pricing table](https://developers.google.com/maps/billing-and-pricing/pricing) before expanding usage.

Use autocomplete session tokens and request only the fields this page uses. Keep the “Use current location” flow opt-in. A Cloud Billing budget is an alert, not a hard spending limit; use API quotas to limit request volume.

## Google Maps terms and attribution

Keep Google's required attribution visible wherever Places content is displayed outside a Google map, and include the Google Maps Platform terms and privacy disclosures in the site's public Terms and Privacy pages before opening this to more users. The official [Maps JavaScript API policies](https://developers.google.com/maps/documentation/javascript/policies) and [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies) describe display and storage rules. Place IDs are exempt from Google's caching limits; other Places content is subject to restrictions. Review those policies against how ride addresses are displayed and retained before public launch.
