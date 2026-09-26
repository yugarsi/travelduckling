
import { auth, onAuthStateChanged, signOut } from "../../firebase-auth.js";
import { API_BASE_URL } from "./config.js";
import { attachAddressAutocomplete, readPlaceId, swapPlaceSelections, useCurrentLocation } from "./places.js";

  (function () {
    "use strict";

    var form    = document.getElementById("search-form");
    var fromEl  = document.getElementById("from");
    var toEl    = document.getElementById("to");
    var dateEl  = document.getElementById("date");
    var seatsEl = document.getElementById("seats");
    var dateField = document.getElementById("date-field");
    var modeField = document.getElementById("mode-field");
    var departureTrigger = document.getElementById("departure-trigger");
    var departureDialog = document.getElementById("departure-dialog");
    var departureChoices = Array.prototype.slice.call(document.querySelectorAll('input[name="departure-choice"]'));
    var departureWindow = document.getElementById("departure-window");
    var searchDateEl = document.getElementById("search-date");
    var searchStartEl = document.getElementById("search-start-time");
    var searchEndEl = document.getElementById("search-end-time");
    var departureError = document.getElementById("departure-error");
    var departureMode = "now";
    var timeField = document.getElementById("time-field");
    var timeEl = document.getElementById("departure-time");
    var results = document.getElementById("ride-results");
    var status  = document.getElementById("search-status");
    var publishSuccess = document.getElementById("publish-success");
    var label   = document.getElementById("submit-label");
    var tabs    = Array.prototype.slice.call(document.querySelectorAll(".search__tab"));
    var myTripsLink = document.getElementById("my-trips-link");
    var profileDialog = document.getElementById("driver-profile-dialog");

    attachAddressAutocomplete(fromEl);
    attachAddressAutocomplete(toEl);
    document.getElementById("use-current-location").addEventListener("click", function () {
      useCurrentLocation(fromEl, this);
    });

    document.getElementById("year").textContent = String(new Date().getFullYear());
    var accountLink = document.querySelector(".site-nav .nav-cta");
    onAuthStateChanged(auth, function (user) {
      if (!user) {
        myTripsLink.hidden = true;
        accountLink.textContent = "Log in";
        accountLink.href = "pages/login.html?next=../index.html";
        return;
      }
      myTripsLink.hidden = false;
      accountLink.textContent = "Sign out";
      accountLink.href = "#sign-out";
    });
    accountLink.addEventListener("click", function (event) {
      if (auth.currentUser) {
        event.preventDefault();
        signOut(auth).then(function () {
          window.location.replace("/index.html");
        }).catch(function () {
          status.textContent = "Could not sign out. Please try again.";
        });
      }
    });

    // Default the date picker to today and disallow trips in the past.
    var today = new Date();
    var iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    dateEl.value = iso;
    dateEl.min = iso;

    function localDateString(date) {
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    function localTimeString(date) {
      return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
    }

    function setDefaultSearchWindow() {
      iso = localDateString(new Date());
      dateEl.min = iso;
      if (!dateEl.value || dateEl.value < iso) dateEl.value = iso;
      var start = new Date();
      start.setMinutes(0, 0, 0);
      start.setHours(start.getHours() + 1);
      if (start.getHours() > 21) {
        start.setDate(start.getDate() + 1);
        start.setHours(9, 0, 0, 0);
      }
      var end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      searchDateEl.value = localDateString(start);
      searchDateEl.min = iso;
      searchStartEl.value = localTimeString(start);
      searchEndEl.value = localTimeString(end);
    }

    function formatSearchWindow(start, end) {
      var dateText = start.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
      var timeOptions = { hour: "numeric", minute: "2-digit" };
      var startText = start.toLocaleTimeString(undefined, timeOptions);
      var endText = end.toLocaleTimeString(undefined, timeOptions);
      var startPeriod = startText.match(/\s?(AM|PM)$/i);
      var endPeriod = endText.match(/\s?(AM|PM)$/i);
      if (startPeriod && endPeriod && startPeriod[1].toLowerCase() === endPeriod[1].toLowerCase()) {
        startText = startText.replace(/\s?(AM|PM)$/i, "");
      }
      return dateText + "\n" + startText + "–" + endText;
    }

    setDefaultSearchWindow();

    function updateDepartureOptions() {
      var custom = departureChoices.some(function (choice) { return choice.checked && choice.value === "range"; });
      departureWindow.hidden = !custom;
      departureError.textContent = "";
    }

    departureTrigger.addEventListener("click", function () {
      if (departureMode === "now") setDefaultSearchWindow();
      departureChoices.forEach(function (choice) { choice.checked = choice.value === departureMode; });
      updateDepartureOptions();
      departureTrigger.setAttribute("aria-expanded", "true");
      departureDialog.showModal();
    });
    departureChoices.forEach(function (choice) { choice.addEventListener("change", updateDepartureOptions); });
    departureDialog.addEventListener("close", function () { departureTrigger.setAttribute("aria-expanded", "false"); });
    document.getElementById("departure-dialog-close").addEventListener("click", function () { departureDialog.close(); });
    document.getElementById("departure-dialog-cancel").addEventListener("click", function () { departureDialog.close(); });
    document.getElementById("departure-dialog-apply").addEventListener("click", function () {
      var custom = departureChoices.some(function (choice) { return choice.checked && choice.value === "range"; });
      if (custom) {
        if (!searchDateEl.value || !searchStartEl.value || !searchEndEl.value) {
          departureError.textContent = "Choose a date, start time, and end time.";
          return;
        }
        var start = new Date(searchDateEl.value + "T" + searchStartEl.value);
        var end = new Date(searchDateEl.value + "T" + searchEndEl.value);
        if (searchDateEl.value < iso || start <= new Date()) {
          departureError.textContent = "Choose a departure window that starts in the future.";
          return;
        }
        if (end <= start) {
          departureError.textContent = "The end time must be later than the start time on the same day.";
          return;
        }
        departureMode = "range";
        departureTrigger.textContent = formatSearchWindow(start, end);
      } else {
        departureMode = "now";
        departureTrigger.textContent = "Next 2 hours";
      }
      departureDialog.close();
    });

    function isOffering() {
      return document.getElementById("tab-offer").getAttribute("aria-selected") === "true";
    }

    function updateFields() {
      var offering = isOffering();
      form.classList.toggle("search__panel--offering", offering);
      modeField.hidden = offering;
      dateField.hidden = !offering;
      timeField.hidden = !offering;
      form.setAttribute("aria-labelledby", offering ? "tab-offer" : "tab-find");
      label.textContent = offering ? "Publish ride" : "Search";
      document.querySelector("label[for=seats]").textContent = offering ? "Seats free" : "Seats";
    }

    // Tabs switch the intent of the same form rather than swapping markup.
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); });
        status.textContent = "";
        publishSuccess.hidden = true;
        results.replaceChildren();
        updateFields();
      });
    });
    updateFields();

    document.getElementById("swap").addEventListener("click", function () {
      var held = fromEl.value;
      fromEl.value = toEl.value;
      toEl.value = held;
      swapPlaceSelections(fromEl, toEl);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!fromEl.value.trim() || !toEl.value.trim()) {
        status.textContent = "Tell us where you're leaving from and where you're going.";
        (fromEl.value.trim() ? toEl : fromEl).focus();
        return;
      }

      var offering = isOffering();
      var user = auth.currentUser;
      results.replaceChildren();
      publishSuccess.hidden = true;
      if (offering && !user) {
        status.innerHTML = 'Please <a href="pages/login.html?next=../index.html">log in</a> to publish a ride.';
        return;
      }

      var origin = fromEl.value.trim();
      var destination = toEl.value.trim();
      var headers = { "Content-Type": "application/json" };
      status.textContent = offering ? "Publishing your ride…" : "Searching for rides…";
      form.querySelector(".search__submit").disabled = true;

      Promise.resolve(user ? user.getIdToken() : null).then(function (token) {
        if (token) headers.Authorization = "Bearer " + token;
        var url;
        var request;
        if (offering) {
          if (!dateEl.value || !timeEl.value) throw new Error("Choose a departure date and time.");
          var departure = new Date(dateEl.value + "T" + timeEl.value);
          if (Number.isNaN(departure.getTime()) || departure <= new Date()) {
            throw new Error("Choose a future departure date and time.");
          }
          url = API_BASE_URL + "/api/v1/rides";
          request = fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
              origin: origin,
              destination: destination,
              origin_place_id: readPlaceId(fromEl) || undefined,
              destination_place_id: readPlaceId(toEl) || undefined,
              departure_at: departure.toISOString(),
              available_seats: Number(seatsEl.value)
            })
          });
        } else {
          var params = new URLSearchParams({
            origin: origin,
            destination: destination,
            departure_mode: departureMode,
            seats: seatsEl.value
          });
          if (readPlaceId(fromEl)) params.set("origin_place_id", readPlaceId(fromEl));
          if (readPlaceId(toEl)) params.set("destination_place_id", readPlaceId(toEl));
          if (departureMode === "range") {
            if (!searchDateEl.value || !searchStartEl.value || !searchEndEl.value) {
              throw new Error("Choose a date, start time, and end time.");
            }
            var start = new Date(searchDateEl.value + "T" + searchStartEl.value);
            var end = new Date(searchDateEl.value + "T" + searchEndEl.value);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start <= new Date() || end <= start) {
              throw new Error("Your departure window is invalid or has passed. Choose a new date and time.");
            }
            params.set("start_at", start.toISOString());
            params.set("end_at", end.toISOString());
          }
          url = API_BASE_URL + "/api/v1/rides/search?" + params.toString();
          request = fetch(url, { headers: headers });
        }
        return request.then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (body) {
            if (!response.ok) {
              if (response.status === 401) throw new Error("Your sign-in could not be verified. Please log in again.");
              if (response.status === 403) throw new Error(body.detail || "The API is not ready to accept browser requests yet.");
              if (response.status === 422) throw new Error(Array.isArray(body.detail) ? "Check the ride details and try again." : (body.detail || "Check the ride details and try again."));
              throw new Error(body.detail || "The ride request failed. Please try again.");
            }
            if (offering) {
              status.textContent = "";
              publishSuccess.hidden = false;
              publishSuccess.scrollIntoView({ behavior: "smooth", block: "nearest" });
              return;
            }
            status.textContent = body.count === 1 ? "1 ride found." : body.count + " rides found.";
            body.rides.forEach(function (ride) {
              var card = document.createElement("article");
              card.className = "ride-result";
              var title = document.createElement("strong");
              title.textContent = ride.origin + " → " + ride.destination;
              var detail = document.createElement("span");
              detail.textContent = new Date(ride.departure_at).toLocaleString() + " · " + ride.available_seats + " seat(s)";
              var top = document.createElement("div");
              top.className = "ride-result__top";
              top.append(title, detail);
              card.appendChild(top);

              var driverRow = document.createElement("div");
              driverRow.className = "ride-result__driver";
              var avatar = document.createElement("span");
              avatar.className = "driver-avatar";
              avatar.textContent = (ride.driver && ride.driver.first_name ? ride.driver.first_name.charAt(0) : "T").toUpperCase();
              avatar.setAttribute("aria-hidden", "true");
              var profileButton = document.createElement("button");
              profileButton.type = "button";
              var driverName = document.createElement("strong");
              driverName.textContent = ride.driver && ride.driver.first_name ? ride.driver.first_name : "TravelDuckling driver";
              var driverMeta = document.createElement("small");
              driverMeta.textContent = (ride.driver ? ride.driver.rides_count : 0) + " rides · ★ " + Number(ride.driver ? ride.driver.rating : 0).toFixed(1);
              profileButton.append(driverName, driverMeta);
              profileButton.addEventListener("click", function () {
                document.getElementById("driver-profile-avatar").textContent = avatar.textContent;
                document.getElementById("driver-profile-name").textContent = driverName.textContent;
                document.getElementById("driver-profile-rides").textContent = (ride.driver ? ride.driver.rides_count : 0) + " rides";
                document.getElementById("driver-profile-rating").textContent = "★ " + Number(ride.driver ? ride.driver.rating : 0).toFixed(1);
                document.getElementById("driver-profile-about").textContent = ride.driver && ride.driver.about
                  ? ride.driver.about
                  : "This driver is new to TravelDuckling and hasn’t added an introduction yet.";
                profileDialog.showModal();
              });
              driverRow.append(avatar, profileButton);
              card.appendChild(driverRow);

              var actions = document.createElement("div");
              actions.className = "ride-result__actions";
              if (ride.viewer_is_driver) {
                var ownRide = document.createElement("span");
                ownRide.textContent = "Your ride";
                actions.appendChild(ownRide);
              } else {
                var requestButton = document.createElement("button");
                requestButton.className = "ride-action";
                requestButton.type = "button";
                requestButton.textContent = auth.currentUser ? "Request to join" : "Log in to request";
                requestButton.addEventListener("click", function () {
                  var requestUser = auth.currentUser;
                  if (!requestUser) {
                    window.location.href = "pages/login.html?next=../index.html";
                    return;
                  }
                  requestButton.disabled = true;
                  requestUser.getIdToken().then(function (token) {
                    return fetch(API_BASE_URL + "/api/v1/rides/" + encodeURIComponent(ride.id) + "/requests", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                      body: JSON.stringify({ seats_requested: Number(seatsEl.value) })
                    });
                  }).then(function (response) {
                    return response.json().catch(function () { return {}; }).then(function (body) {
                      if (!response.ok) throw new Error(body.detail || "Could not send your request. Please try again.");
                      requestButton.textContent = "Request sent";
                      requestButton.classList.add("ride-action--quiet");
                      status.textContent = "Your request was sent to the driver. You can follow it in My trips.";
                    });
                  }).catch(function (error) {
                    status.textContent = error.message || "Could not send your request. Please try again.";
                  }).finally(function () { requestButton.disabled = false; });
                });
                actions.appendChild(requestButton);
              }
              var myTripsButton = document.createElement("a");
              myTripsButton.className = "ride-action ride-action--quiet";
              myTripsButton.href = "pages/my-trips.html";
              myTripsButton.textContent = "My trips";
              myTripsButton.style.textDecoration = "none";
              if (auth.currentUser) actions.appendChild(myTripsButton);
              card.appendChild(actions);
              results.appendChild(card);
            });
          });
        });
      }).catch(function (error) {
        status.textContent = error.message || "The ride request failed. Please try again.";
      }).finally(function () {
        form.querySelector(".search__submit").disabled = false;
      });
    });
  })();

  document.getElementById("driver-profile-close").addEventListener("click", function () {
    document.getElementById("driver-profile-dialog").close();
  });
