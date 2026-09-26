import { auth, onAuthStateChanged, signOut } from "../../firebase-auth.js";
import { API_BASE_URL } from "./config.js";

    const tripList = document.getElementById("trip-list");
    const notice = document.getElementById("page-notice");
    let trips = { driver_trips: [], rider_trips: [] };
    let period = "upcoming";
    let role = "all";
    let currentUser = null;
    let signingOut = false;

    const make = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const displayDate = (value) => new Date(value).toLocaleString(undefined, {
      weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
    });
    const setNotice = (message, kind) => {
      notice.hidden = !message;
      notice.textContent = message || "";
      notice.dataset.kind = kind || "info";
    };

    async function api(path, options = {}) {
      const token = await currentUser.getIdToken();
      const response = await fetch(API_BASE_URL + path, {
        ...options,
        headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), Authorization: "Bearer " + token, ...(options.headers || {}) }
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || "We couldn’t complete that request. Please try again.");
      return body;
    }

    function createAction(label, className, callback) {
      const button = make("button", "button " + (className || ""), label);
      button.type = "button";
      button.addEventListener("click", callback);
      return button;
    }

    function renderRequest(request, rideId) {
      const row = make("div", "request-row");
      const left = make("div");
      left.append(
        make("strong", "", request.rider_name || "Traveler"),
        make("span", "trip-date", " · " + request.seats_requested + (request.seats_requested === 1 ? " seat" : " seats") + " · " + request.status)
      );
      row.appendChild(left);
      if (request.status === "pending") {
        const actions = make("div", "request-actions");
        const decide = async (decision, button) => {
          button.disabled = true;
          try {
            await api(`/api/v1/rides/${encodeURIComponent(rideId)}/requests/${encodeURIComponent(request.id)}`, {
              method: "PATCH", body: JSON.stringify({ decision })
            });
            setNotice(decision === "accept" ? "You accepted the rider. The remaining seats have been updated." : "You declined the request.");
            await loadTrips();
          } catch (error) {
            button.disabled = false;
            setNotice(error.message, "error");
          }
        };
        actions.append(
          createAction("Accept", "button--gold", function () { decide("accept", this); }),
          createAction("Decline", "button--danger", function () { decide("decline", this); })
        );
        row.appendChild(actions);
      }
      return row;
    }

    function renderTrip(entry) {
      const ride = entry.ride;
      const card = make("article", "trip-card");
      const head = make("div", "trip-card__head");
      const roleTag = make("span", "role-tag " + (entry.role === "driver" ? "role-tag--driver" : "role-tag--rider"), entry.role === "driver" ? "🚗  You’re driving" : "🧍  You’re riding");
      const statusName = entry.role === "rider" ? (entry.request?.status || entry.status) : entry.status;
      const stateTag = make("span", "state-tag state-tag--" + String(statusName).toLowerCase(), statusName === "scheduled" ? "Confirmed trip" : statusName.charAt(0).toUpperCase() + statusName.slice(1));
      head.append(roleTag, stateTag);
      card.appendChild(head);
      card.appendChild(make("h3", "trip-route", ride.origin + "  →  " + ride.destination));
      card.appendChild(make("div", "trip-date", displayDate(ride.departure_at)));
      const accepted = (entry.requests || []).filter((item) => item.status === "accepted").length;
      const pending = (entry.requests || []).filter((item) => item.status === "pending").length;
      const info = make("div", "trip-info");
      if (entry.role === "driver") {
        info.append(make("span", "", ride.available_seats + " seat(s) still open"), make("span", "", accepted + " rider(s) accepted"));
        if (pending) info.appendChild(make("span", "", pending + " request(s) waiting"));
      } else {
        info.append(make("span", "", "Driver: " + (ride.driver?.first_name || "TravelDuckling driver")), make("span", "", (entry.request?.seats_requested || 1) + " seat(s) requested"));
      }
      card.appendChild(info);

      if (entry.role === "driver" && (entry.requests || []).length) {
        const requestPanel = make("section", "requests");
        requestPanel.appendChild(make("h3", "", "Rider requests"));
        entry.requests.forEach((request) => requestPanel.appendChild(renderRequest(request, ride.id)));
        card.appendChild(requestPanel);
      }

      if (entry.role === "driver" && ride.status === "scheduled") {
        const actions = make("div", "trip-card__actions");
        const untilDeparture = new Date(ride.departure_at).getTime() - Date.now();
        if (untilDeparture <= 2 * 60 * 60 * 1000) {
          const start = createAction("▶  Start trip", "button--gold", async function () {
            start.disabled = true;
            try {
              await api(`/api/v1/rides/${encodeURIComponent(ride.id)}/start`, { method: "POST" });
              setNotice("Trip started. Have a safe journey!");
              await loadTrips();
            } catch (error) {
              start.disabled = false;
              setNotice(error.message, "error");
            }
          });
          actions.appendChild(start);
        } else {
          const hours = Math.ceil(untilDeparture / 3600000);
          actions.appendChild(make("span", "trip-date", "Start trip becomes available within 2 hours of departure · about " + hours + "h to go"));
        }
        card.appendChild(actions);
      }
      return card;
    }

    function renderTrips() {
      tripList.replaceChildren();
      const now = Date.now();
      const all = [
        ...trips.driver_trips,
        ...trips.rider_trips
      ].filter((entry) => (role === "all" || entry.role === role) &&
        (period === "upcoming" ? new Date(entry.ride.departure_at).getTime() >= now : new Date(entry.ride.departure_at).getTime() < now));
      all.sort((a, b) => new Date(a.ride.departure_at) - new Date(b.ride.departure_at));
      if (period === "past") all.reverse();
      if (!all.length) {
        const empty = make("div", "empty-state");
        empty.append(make("div", "empty-state__icon", period === "upcoming" ? "🧭" : "🌅"),
          make("h3", "", period === "upcoming" ? "Your next trip starts here" : "No past trips yet"),
          make("p", "", period === "upcoming" ? "Offer a ride or find one to see it here. Driver trips and rider requests live together in this space." : "After a trip’s departure time has passed, it will move here."));
        if (period === "upcoming") {
          const link = make("a", "button button--gold", "Find or offer a ride");
          link.href = "../index.html#offer";
          empty.appendChild(link);
        }
        tripList.appendChild(empty);
        return;
      }
      all.forEach((entry) => tripList.appendChild(renderTrip(entry)));
    }

    async function loadTrips() {
      tripList.replaceChildren(make("div", "notice", "Loading your trips…"));
      try {
        trips = await api("/api/v1/me/trips");
        renderTrips();
      } catch (error) {
        const isNoTrips = false;
        tripList.replaceChildren(make("div", "notice", error.message));
        if (isNoTrips) renderTrips();
      }
    }

    async function loadProfile() {
      try {
        const profile = await api("/api/v1/me/profile");
        document.getElementById("first-name").value = profile.first_name || "";
        document.getElementById("about").value = profile.about || "";
        document.getElementById("profile-avatar").textContent = (profile.first_name || "T").charAt(0).toUpperCase();
        document.getElementById("profile-heading").textContent = profile.first_name || "Your driver profile";
        document.getElementById("profile-summary-text").textContent = profile.about || "A friendly introduction helps riders know who they’ll be traveling with.";
      } catch (error) { setNotice(error.message, "error"); }
    }

    document.getElementById("profile-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = document.getElementById("save-profile");
      button.disabled = true;
      try {
        const profile = await api("/api/v1/me/profile", {
          method: "PUT",
          body: JSON.stringify({ first_name: document.getElementById("first-name").value, about: document.getElementById("about").value })
        });
        document.getElementById("profile-avatar").textContent = profile.first_name.charAt(0).toUpperCase();
        document.getElementById("profile-heading").textContent = profile.first_name;
        document.getElementById("profile-summary-text").textContent = profile.about || "A friendly introduction helps riders know who they’ll be traveling with.";
        setNotice("Your profile is saved.");
      } catch (error) { setNotice(error.message, "error"); }
      finally { button.disabled = false; }
    });

    document.querySelectorAll("[data-period]").forEach((button) => button.addEventListener("click", () => {
      period = button.dataset.period;
      document.querySelectorAll("[data-period]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      renderTrips();
    }));
    document.querySelectorAll("[data-role]").forEach((button) => button.addEventListener("click", () => {
      role = button.dataset.role;
      document.querySelectorAll("[data-role]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      renderTrips();
    }));
    document.getElementById("sign-out").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      signingOut = true;
      button.disabled = true;
      try {
        await signOut(auth);
        location.replace("/index.html");
      } catch (error) {
        signingOut = false;
        button.disabled = false;
        setNotice("Could not sign out. Please try again.", "error");
      }
    });

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (signingOut) return;
        location.replace("login.html?next=../pages/my-trips.html");
        return;
      }
      currentUser = user;
      await Promise.all([loadProfile(), loadTrips()]);
    });
