import { GOOGLE_MAPS_API_KEY } from "./config.js";

let mapsPromise;
let locationBias;

function loadPlaces() {
  if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error("Google Maps browser key is not configured."));
  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      const callbackName = "__travelDucklingMapsReady";
      window[callbackName] = () => {
        delete window[callbackName];
        resolve(window.google.maps);
      };
      const script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(GOOGLE_MAPS_API_KEY) + "&v=weekly&loading=async&callback=" + callbackName;
      script.async = true;
      script.onerror = () => reject(new Error("Google Maps could not load. Check the browser key and enabled APIs."));
      document.head.appendChild(script);
    });
  }
  return mapsPromise.then((maps) => maps.importLibrary("places"));
}

const selectedPlaces = new WeakMap();

export function readPlaceId(input) {
  return selectedPlaces.get(input)?.placeId || "";
}

export function swapPlaceSelections(firstInput, secondInput) {
  const first = selectedPlaces.get(firstInput);
  const second = selectedPlaces.get(secondInput);
  const firstAttribution = firstInput.closest(".address-autocomplete").querySelector(".address-selected-attribution");
  const secondAttribution = secondInput.closest(".address-autocomplete").querySelector(".address-selected-attribution");
  const firstHadAttribution = !firstAttribution.hidden;
  const secondHadAttribution = !secondAttribution.hidden;
  if (second) selectedPlaces.set(firstInput, second); else selectedPlaces.delete(firstInput);
  if (first) selectedPlaces.set(secondInput, first); else selectedPlaces.delete(secondInput);
  firstAttribution.hidden = !secondHadAttribution;
  secondAttribution.hidden = !firstHadAttribution;
}

export function attachAddressAutocomplete(input) {
  const wrap = input.closest(".address-autocomplete");
  const list = wrap.querySelector(".address-suggestions");
  const message = wrap.querySelector(".address-status");
  const selectedAttribution = wrap.querySelector(".address-selected-attribution");
  let sessionToken = null;
  let timer;
  let requestNumber = 0;

  function closeSuggestions() {
    list.replaceChildren();
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function clearSelection() {
    selectedPlaces.delete(input);
    selectedAttribution.hidden = true;
  }

  input.addEventListener("input", () => {
    clearSelection();
    message.textContent = "";
    clearTimeout(timer);
    const value = input.value.trim();
    const currentRequest = ++requestNumber;
    closeSuggestions();
    if (value.length < 3 || !GOOGLE_MAPS_API_KEY) return;

    timer = setTimeout(async () => {
      try {
        const places = await loadPlaces();
        const { AutocompleteSuggestion, AutocompleteSessionToken } = places;
        if (!sessionToken) sessionToken = new AutocompleteSessionToken();
        const request = { input: value, includedRegionCodes: ["us"], sessionToken };
        if (locationBias) request.locationBias = locationBias;
        const { suggestions = [] } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        if (currentRequest !== requestNumber || input.value.trim() !== value) return;
        const predictions = suggestions.map((item) => item.placePrediction).filter(Boolean);
        predictions.forEach((prediction, index) => {
          const option = document.createElement("button");
          option.type = "button";
          option.className = "address-suggestion";
          option.id = input.id + "-suggestion-" + index;
          option.setAttribute("role", "option");
          option.textContent = prediction.text.toString();
          option.addEventListener("click", async () => {
            option.disabled = true;
            try {
              const place = prediction.toPlace();
              await place.fetchFields({ fields: ["formattedAddress", "location"] });
              input.value = place.formattedAddress || prediction.text.toString();
              selectedPlaces.set(input, { placeId: place.id || "", address: input.value });
              selectedAttribution.hidden = false;
              sessionToken = null;
              message.textContent = "";
              input.dispatchEvent(new Event("change", { bubbles: true }));
            } catch (_) {
              message.textContent = "Could not select that address. Please try again.";
            } finally {
              closeSuggestions();
              input.focus();
            }
          });
          list.appendChild(option);
        });
        const attribution = document.createElement("div");
        attribution.className = "address-attribution";
        const logo = document.createElement("img");
        logo.src = "https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png";
        logo.alt = "Powered by Google";
        attribution.appendChild(logo);
        list.appendChild(attribution);
        list.hidden = false;
        input.setAttribute("aria-expanded", "true");
      } catch (error) {
        if (currentRequest === requestNumber) {
          message.textContent = error.message.includes("not configured")
            ? "Address suggestions need a restricted Google Maps key."
            : "Address suggestions are unavailable right now.";
        }
      }
    }, 250);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSuggestions();
  });
  document.addEventListener("click", (event) => {
    if (!wrap.contains(event.target)) closeSuggestions();
  });
  return { close: closeSuggestions };
}

export async function useCurrentLocation(input, button) {
  const wrap = input.closest(".address-autocomplete");
  const message = wrap.querySelector(".address-status");
  if (!navigator.geolocation) {
    message.textContent = "Location is not available in this browser.";
    return;
  }
  if (!GOOGLE_MAPS_API_KEY) {
    message.textContent = "Current-location lookup needs a restricted Google Maps key.";
    return;
  }
  button.disabled = true;
  message.textContent = "Finding your location…";
  try {
    const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false, timeout: 10000, maximumAge: 60000
    }));
    await loadPlaces();
    const geocoding = await window.google.maps.importLibrary("geocoding");
    const point = { lat: position.coords.latitude, lng: position.coords.longitude };
    const geocoder = new geocoding.Geocoder();
    const response = await geocoder.geocode({ location: point, region: "US" });
    const result = response.results.find((item) => item.address_components?.some((part) => part.types.includes("country") && part.short_name === "US"));
    if (!result) throw new Error("No US address was found at your location.");
    input.value = result.formatted_address;
    selectedPlaces.set(input, { placeId: result.place_id || "", address: result.formatted_address });
    wrap.querySelector(".address-selected-attribution").hidden = false;
    locationBias = { center: point, radius: 50000 };
    message.textContent = "Using your current location.";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    message.textContent = error.code === 1
      ? "Location permission was denied. You can type an address instead."
      : error.message || "Could not find an address for your location.";
  } finally {
    button.disabled = false;
  }
}
