import { auth, onAuthStateChanged } from '../../firebase-auth.js';
import { groupApi } from './groups/api.js';
    var CATEGORIES = {
      hiking:    { label: "Hiking",        emoji: "🥾", cover: "linear-gradient(140deg, #2f7d6f, #57b89f)" },
      roadtrip:  { label: "Road trip",     emoji: "🚐", cover: "linear-gradient(140deg, #d99a10, #ffd257)" },
      food:      { label: "Food & drink",  emoji: "🍜", cover: "linear-gradient(140deg, #c2521f, #ff9f52)" },
      culture:   { label: "Culture",       emoji: "🏛️", cover: "linear-gradient(140deg, #4b3a86, #8a74d6)" },
      beach:     { label: "Beach",         emoji: "🏝️", cover: "linear-gradient(140deg, #1f6fb2, #5cc6f0)" },
      nightlife: { label: "Nightlife",     emoji: "🎷", cover: "linear-gradient(140deg, #3a2a5c, #7b5ac0)" }
    };


const $ = id => document.getElementById(id);
const grid = $('group-grid'), notice = $('group-notice');
$('group-mine').checked = new URLSearchParams(location.search).has('mine');
let trips = [], mine = [], category = 'all', generation = 0;
function render() {
  const own = new Map(mine.map(t => [t.id, t]));
  const source = $('group-mine').checked ? mine : trips.map(t => own.get(t.id) || t);
  const query = $('group-query').value.toLowerCase().trim();
  const filtered = source.filter(t => (category === 'all' || category === t.category)
    && (!query || `${t.title} ${t.place} ${t.desc}`.toLowerCase().includes(query))
    && ($('spots-only').getAttribute('aria-pressed') !== 'true' || t.spots > 0))
    .sort((a,b) => a.start.localeCompare(b.start));
  grid.replaceChildren(...filtered.map(buildCard));
  $('group-empty').hidden = filtered.length > 0;
  $('group-count').textContent = `${filtered.length} group trips`;
}
async function load() {
  const version = ++generation;
  notice.textContent = 'Loading trips…';
  try {
    const publicTrips = await groupApi('', 'GET', undefined, true);
    let myTrips = [], warning = '';
    if (auth.currentUser) {
      try { myTrips = await groupApi('/mine'); } catch (error) { warning = error.message; }
    }
    if (version !== generation) return;
    trips = publicTrips; mine = myTrips; render(); notice.textContent = warning;
  } catch (error) { if (version === generation) notice.textContent = error.message; }
}
$('group-query').addEventListener('input', render);
$('group-mine').addEventListener('change', render);
$('group-categories').addEventListener('click', event => {
  const button = event.target.closest('[data-category]'); if (!button) return;
  category = button.dataset.category;
  document.querySelectorAll('[data-category]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  render();
});
$('spots-only').addEventListener('click', () => {
  const button = $('spots-only'); button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true')); render();
});
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
      var spots = data.spots;

      var card = el("li", "group-card group-card--new");
      card.dataset.category = data.category;
      card.dataset.spots = String(spots);
      card.dataset.keywords = [data.title, data.place, meta.label, data.desc].join(" ").toLowerCase();

      var cover = el("div", "group-card__cover");
      cover.style.setProperty("--cover", meta.cover);
      cover.appendChild(el("span", "group-card__pill group-card__pill--category", meta.label));
      cover.appendChild(el("span", "group-card__pill group-card__pill--when", data.start + " – " + data.end));
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
        data.desc || "More details coming from the host."));

      var metaRow = el("div", "group-card__meta");
      var avatars = el("ul", "avatars");
      avatars.setAttribute("aria-hidden", "true");
      var you = el("li", null, data.host_name);
      you.style.setProperty("--av", "#d99a10");
      you.style.fontSize = "0.55rem";
      avatars.appendChild(you);
      metaRow.appendChild(avatars);
      metaRow.appendChild(el("span", null,
        spots + " of " + data.size + " spots left" +
        " · Hosted by " + data.host_name));
      body.appendChild(metaRow);

      var foot = el("div", "group-card__foot");
      var price = el("span", "group-card__price");
      price.appendChild(el("strong", null, data.cost > 0 ? "$" + data.cost : "Free"));
      price.appendChild(document.createTextNode(" estimated per person · no payment collected"));
      foot.appendChild(price);

      const past = data.end < new Date().toISOString().slice(0, 10);
      const closed = data.status !== 'open' || past;
      const act = (label, path, method = 'POST', payload) => {
        const button = el('button', 'btn btn--quiet', label);
        button.type = 'button';
        button.addEventListener('click', async () => {
          if (!auth.currentUser) { location.href = 'login.html?next=group-trips.html'; return; }
          button.disabled = true;
          try { await groupApi(path, method, payload); await load(); }
          catch (error) { notice.textContent = error.message; button.disabled = false; }
        });
        foot.appendChild(button);
      };
      body.appendChild(el('p', '', data.is_host ? 'You are hosting' : data.membership ? 'Your request: ' + data.membership : 'Host approval required'));
      if (closed) body.appendChild(el('p', '', data.status === 'cancelled' ? 'Trip cancelled' : 'Past trip'));
      else if (data.is_host) {
        for (const request of data.requests || []) {
          body.appendChild(el('p', '', request.name + ' · ' + request.status));
          if (request.status === 'pending') {
            act('Accept ' + request.name, `/${data.id}/requests/${encodeURIComponent(request.uid)}`, 'PATCH', {decision: 'accept'});
            act('Decline ' + request.name, `/${data.id}/requests/${encodeURIComponent(request.uid)}`, 'PATCH', {decision: 'decline'});
          }
        }
        act('Cancel trip', `/${data.id}/cancel`);
      } else if (['pending', 'accepted'].includes(data.membership)) act('Withdraw / leave', `/${data.id}/leave`);
      else if (spots > 0) act(auth.currentUser ? 'Request to join' : 'Log in to join', `/${data.id}/join`);
      else body.appendChild(el('p', '', 'This group is full'));
      body.appendChild(foot);

      card.appendChild(body);
      return card;
    }


const dialog = $('create-dialog');
$('create-open').addEventListener('click', () => {
  if (!auth.currentUser) { location.href = 'login.html?next=group-trips.html'; return; }
  $('create-error').textContent = '';
  $('g-start').min = $('g-end').min = new Date().toISOString().slice(0,10);
  dialog.showModal();
});
$('create-close').addEventListener('click', () => dialog.close());
$('create-cancel').addEventListener('click', () => dialog.close());
$('create-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.target.querySelector('[type=submit]'); button.disabled = true;
  const data = Object.fromEntries(['title','place','category','start','end','size','cost','desc'].map(k => [k, $('g-' + k).value]));
  data.end ||= data.start; data.size = Number(data.size); data.cost = Number(data.cost);
  try {
    await groupApi('', 'POST', data);
    dialog.close(); event.target.reset(); $('group-mine').checked = true;
    await load(); notice.textContent = 'Your trip is published. You can review join requests here.';
  } catch (error) { $('create-error').textContent = error.message; }
  finally { button.disabled = false; }
});
onAuthStateChanged(auth, () => { mine = []; grid.replaceChildren(); load(); });
