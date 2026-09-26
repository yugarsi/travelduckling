// Shared frontend configuration for local API development and production.
export const API_BASE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "http://127.0.0.1:8000"
  : "https://travelduckling-api-656145342063.us-west1.run.app";

// This is a browser key, not a server secret. Restrict it to TravelDuckling's
// website referrers and only the Maps JavaScript, Places, and Geocoding APIs.
export const GOOGLE_MAPS_API_KEY = "AIzaSyCUez3A0QzErmlDPO9oKEBhMMldEpcWrcI";
