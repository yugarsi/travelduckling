  /* --------------------------------------------------------------------
     Group trips & activities — browse, filter, and create.
     Front-end only: created groups live in the DOM for this page view.
  -------------------------------------------------------------------- */
  (function () {
    "use strict";

    var CATEGORIES = {
      hiking:    { label: "Hiking",        emoji: "🥾", cover: "linear-gradient(140deg, #2f7d6f, #57b89f)" },
      roadtrip:  { label: "Road trip",     emoji: "🚐", cover: "linear-gradient(140deg, #d99a10, #ffd257)" },
      food:      { label: "Food & drink",  emoji: "🍜", cover: "linear-gradient(140deg, #c2521f, #ff9f52)" },
      culture:   { label: "Culture",       emoji: "🏛️", cover: "linear-gradient(140deg, #4b3a86, #8a74d6)" },
      beach:     { label: "Beach",         emoji: "🏝️", cover: "linear-gradient(140deg, #1f6fb2, #5cc6f0)" },
      nightlife: { label: "Nightlife",     emoji: "🎷", cover: "linear-gradient(140deg, #3a2a5c, #7b5ac0)" }
    };

    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    var grid     = document.getElementById("group-grid");
    var empty    = document.getElementById("group-empty");
    var count    = document.getElementById("group-count");
    var query    = document.getElementById("group-query");
    var chipList = document.getElementById("group-categories");
    var spotsOnly = document.getElementById("spots-only");

    var dialog   = document.getElementById("create-dialog");
    var openBtn  = document.getElementById("create-open");
    var closeBtn = document.getElementById("create-close");
    var cancel   = document.getElementById("create-cancel");
    var createForm = document.getElementById("create-form");
    var createError = document.getElementById("create-error");

    var activeCategory = "all";

    /* ---- Browsing ---------------------------------------------------- */

    function cards() {
      return Array.prototype.slice.call(grid.children);
    }

    function matches(card, needle) {
      if (activeCategory !== "all" && card.dataset.category !== activeCategory) return false;
      if (spotsOnly.getAttribute("aria-pressed") === "true" && Number(card.dataset.spots) < 1) return false;
      if (!needle) return true;

      var haystack = (card.dataset.keywords || "") + " " +
        card.querySelector(".group-card__title").textContent + " " +
        card.querySelector(".group-card__place").textContent;
      return haystack.toLowerCase().indexOf(needle) !== -1;
    }

    function render() {
      var needle = query.value.trim().toLowerCase();
      var shown = 0;

      cards().forEach(function (card) {
        var keep = matches(card, needle);
        card.hidden = !keep;
        if (keep) shown += 1;
      });

      empty.hidden = shown > 0;
      count.textContent = shown === 1
        ? "1 group open"
        : shown + " groups open";
    }

    query.addEventListener("input", render);

    chipList.addEventListener("click", function (event) {
      var chip = event.target.closest(".chip");
      if (!chip) return;

      activeCategory = chip.dataset.category;
      Array.prototype.forEach.call(chipList.querySelectorAll(".chip"), function (c) {
        c.setAttribute("aria-pressed", String(c === chip));
      });
      render();
    });

    spotsOnly.addEventListener("click", function () {
      var on = spotsOnly.getAttribute("aria-pressed") === "true";
      spotsOnly.setAttribute("aria-pressed", String(!on));
      render();
    });

    // Join / waitlist are stubs until the backend lands — flip the button so
    // the intent is at least acknowledged.
    grid.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-join], [data-waitlist]");
      if (!btn || btn.disabled) return;

      var waitlist = btn.hasAttribute("data-waitlist");
      btn.textContent = waitlist ? "On the waitlist ✓" : "Request sent ✓";
      btn.disabled = true;
      btn.closest(".group-card").classList.add("group-card--joined");
    });

    /* ---- Creating ---------------------------------------------------- */

    function prettyDate(value) {
      var parts = value.split("-");
      if (parts.length !== 3) return "";
      return MONTHS[Number(parts[1]) - 1] + " " + Number(parts[2]);
    }

    function dateRange(start, end) {
      var a = prettyDate(start);
      var b = prettyDate(end);
      if (!a) return "Dates TBC";
      if (!b || b === a) return a;
      return a + " – " + b;
    }

    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    var PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/>' +
      '<circle cx="12" cy="10" r="2.5"/></svg>';

    function buildCard(data) {
      var meta = CATEGORIES[data.category];
      var spots = Math.max(0, data.size - 1); // the host takes one spot

      var card = el("li", "group-card group-card--new");
      card.dataset.category = data.category;
      card.dataset.spots = String(spots);
      card.dataset.keywords = [data.title, data.place, meta.label, data.desc].join(" ").toLowerCase();

      var cover = el("div", "group-card__cover");
      cover.style.setProperty("--cover", meta.cover);
      cover.appendChild(el("span", "group-card__pill group-card__pill--category", meta.label));
      cover.appendChild(el("span", "group-card__pill group-card__pill--when", dateRange(data.start, data.end)));
      var glyph = el("span", null, meta.emoji);
      glyph.setAttribute("aria-hidden", "true");
      cover.appendChild(glyph);
      card.appendChild(cover);

      var body = el("div", "group-card__body");
      body.appendChild(el("h3", "group-card__title", data.title));

      var place = el("p", "group-card__place");
      place.innerHTML = PIN;
      place.appendChild(document.createTextNode(" " + data.place));
      body.appendChild(place);

      body.appendChild(el("p", "group-card__desc",
        data.desc || "The host hasn't added a plan yet — ask in the group chat."));

      var metaRow = el("div", "group-card__meta");
      var avatars = el("ul", "avatars");
      avatars.setAttribute("aria-hidden", "true");
      var you = el("li", null, "You");
      you.style.setProperty("--av", "#d99a10");
      you.style.fontSize = "0.55rem";
      avatars.appendChild(you);
      metaRow.appendChild(avatars);
      metaRow.appendChild(el("span", null,
        spots + " of " + data.size + " spots left" +
        (data.visibility === "invite" ? " · invite only" : "")));
      body.appendChild(metaRow);

      var foot = el("div", "group-card__foot");
      var price = el("span", "group-card__price");
      price.appendChild(el("strong", null, data.cost > 0 ? "$" + data.cost : "Free"));
      price.appendChild(document.createTextNode("per person"));
      foot.appendChild(price);

      var manage = el("button", "btn btn--quiet", "You're the host");
      manage.type = "button";
      manage.disabled = true;
      foot.appendChild(manage);
      body.appendChild(foot);

      card.appendChild(body);
      return card;
    }

    function openDialog() {
      createError.textContent = "";
      var todayIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString().slice(0, 10);
      var start = document.getElementById("g-start");
      var end = document.getElementById("g-end");
      start.min = todayIso;
      end.min = todayIso;
      if (!start.value) start.value = todayIso;

      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      document.getElementById("g-title").focus();
    }

    function closeDialog() {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }

    openBtn.addEventListener("click", openDialog);
    closeBtn.addEventListener("click", closeDialog);
    cancel.addEventListener("click", closeDialog);

    // Clicking the backdrop dismisses: the dialog element fills the viewport,
    // so a click that lands on it rather than the panel is a backdrop click.
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog();
    });

    createForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var data = {
        title: document.getElementById("g-title").value.trim(),
        place: document.getElementById("g-place").value.trim(),
        category: document.getElementById("g-category").value,
        start: document.getElementById("g-start").value,
        end: document.getElementById("g-end").value,
        size: Number(document.getElementById("g-size").value),
        cost: Number(document.getElementById("g-cost").value) || 0,
        desc: document.getElementById("g-desc").value.trim(),
        visibility: createForm.elements.visibility.value
      };

      if (!data.title || !data.place) {
        createError.textContent = "Give the group a name and a destination.";
        document.getElementById(data.title ? "g-place" : "g-title").focus();
        return;
      }

      if (!data.size || data.size < 2) {
        createError.textContent = "A group needs room for at least 2 people.";
        document.getElementById("g-size").focus();
        return;
      }

      if (data.end && data.start && data.end < data.start) {
        createError.textContent = "The end date falls before the start date.";
        document.getElementById("g-end").focus();
        return;
      }

      grid.insertBefore(buildCard(data), grid.firstChild);
      createForm.reset();
      closeDialog();

      // Clear any active filter so the new group is definitely visible.
      query.value = "";
      spotsOnly.setAttribute("aria-pressed", "false");
      activeCategory = "all";
      Array.prototype.forEach.call(chipList.querySelectorAll(".chip"), function (c) {
        c.setAttribute("aria-pressed", String(c.dataset.category === "all"));
      });
      render();

      grid.firstChild.scrollIntoView({ block: "center", behavior: "smooth" });
    });

    render();
  })();
