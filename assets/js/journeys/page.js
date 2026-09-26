import { auth, onAuthStateChanged, signOut } from '../../../firebase-auth.js';
import { api } from './api.js';
import { initializeForm, readForm } from './form.js';
import { node, button, card, profile, time } from './view.js';
const byId = id => document.getElementById(id);
let plans = [], generation = 0;
function notice(message, error = false) {
  const el = byId('notice');
  el.textContent = message;
  el.hidden = !message;
  el.dataset.error = error;
}
async function attempt(action) {
  try { await action(); } catch (error) { notice(error.message, true); }
}
async function refresh() {
  if (!auth.currentUser) return;
  const current = ++generation;
  const result = await api('/mine');
  if (current !== generation || !auth.currentUser) return;
  plans = result;
  render();
}
function render() {
  const list = byId('journey-list');
  list.replaceChildren();
  const visible = plans.filter(plan => {
    const past = plan.status === 'closed' || plan.legs.every(l => ['completed','cancelled'].includes(l.status) || (l.status !== 'started' && new Date(l.latest) < new Date()));
    return byId('period').value === 'all' || (byId('period').value === 'past' ? past : !past);
  });
  if (!visible.length) list.append(node('p','No journeys in this view yet. Publish your travel plan to get started.'));
  visible.forEach(plan => {
    const el = card(plan);
    const active = plan.status === 'open' && plan.legs.some(l => l.status === 'scheduled' && new Date(l.latest) > new Date());
    if (active && !plan.proposals.some(p => p.status === 'accepted' && plan.role === 'rider')) {
      el.append(button(plan.role === 'driver' ? 'Find compatible riders' : 'Find compatible rides', () => attempt(() => findMatches(plan)), true));
    }
    if (plan.role === 'rider' && plan.status === 'open') {
      el.append(button('Cancel my travel plan', () => attempt(async () => {
        if (!confirm('Cancel this travel plan and any confirmed seats in both directions?')) return;
        await api(`/${plan.id}/cancel`,'POST');
        notice('Travel plan cancelled.'); await refresh();
      })));
    }
    if (plan.role === 'driver') plan.legs.forEach((leg,index) => {
      const actions = node('div',undefined,'actions');
      const options = leg.status === 'scheduled' ? ['start','cancel'] : leg.status === 'started' ? ['complete'] : [];
      options.forEach(action => actions.append(button(`${action[0].toUpperCase()+action.slice(1)} ${index ? 'return' : 'outbound'}`, () => attempt(async () => {
        if (action === 'cancel' && !confirm('Cancel this direction? The other direction keeps its current status. Passengers will see this cancellation in their journeys.')) return;
        await api(`/${plan.id}/legs/${index}/actions`,'POST',{action});
        notice('Journey updated.'); await refresh();
      }))));
      el.querySelector(`[data-leg="${index}"]`).append(actions);
    });
    plan.proposals.forEach(p => {
      const box = profile(p.person,p.preferences);
      box.append(node('p',`${p.sender_role === 'driver' ? 'Driver invitation' : 'Seat request'} · ${p.status}`));
      if (p.travel_plan) {
        box.append(node('p',`${p.travel_plan.legs[0].origin.label} → ${p.travel_plan.legs[0].destination.label}`));
        box.append(node('p',p.travel_plan.preferences || 'No travel preferences specified.','hint'));
      }
      if (!p.times && p.estimates) p.estimates.forEach(t => box.append(node('p',`Proposed ${t.rider_leg ? 'return' : 'outbound'} pickup: ${time(t.pickup)} · ${Math.ceil(t.extra_seconds/60)} extra driver minutes`,'hint')));
      if (p.times) p.times.forEach(t => box.append(node('p',`${t.rider_leg ? 'Return' : 'Outbound'} pickup ${time(t.pickup)} · drop-off ${time(t.dropoff)}`,'hint')));
      if (p.leg_statuses) p.leg_statuses.forEach((status,index) => {
        if (status === 'cancelled') box.append(node('strong',`${index ? 'Return' : 'Outbound'} cancelled by driver. Replacement transport is not arranged.`));
        else box.append(node('p',`${index ? 'Return' : 'Outbound'}: ${status}`,'hint'));
      });
      if (p.can_respond) {
        const actions = node('div',undefined,'actions');
        for (const decision of ['accept','decline']) actions.append(button(decision === 'accept' ? 'Accept & confirm seats' : 'Decline', () => attempt(async () => {
          await api(`/${p.driver_plan_id}/proposals/${p.id}`,'PATCH',{decision});
          notice(decision === 'accept' ? 'Your journey is confirmed. Both directions are reserved when requested together.' : 'Request declined.');
          await refresh();
        }),decision === 'accept'));
        box.append(actions);
      }
      el.append(box);
    });
    list.append(el);
  });
}
async function findMatches(plan) {
  const panel = byId('matches-panel');
  panel.hidden = false;
  byId('matches').replaceChildren(node('p','Checking road routes and availability…'));
  byId('match-notice').textContent = '';
  panel.scrollIntoView({behavior:'smooth'});
  panel.focus({preventScroll:true});
  try {
    const result = await api(`/${plan.id}/matches`);
    const list = byId('matches'); list.replaceChildren();
    byId('match-notice').textContent = `${result.notice}${result.limited ? ' This is a limited search, not all available journeys.' : ''}`;
    if (!result.matches.length) list.append(node('p','No compatible journeys found in this search. Your plan remains published for other members to discover. Refresh later to see new offers.'));
    result.matches.forEach(match => {
      const el = card(match.plan);
      el.append(profile(match.plan.profile,match.plan.preferences));
      match.estimates.forEach(e => el.append(node('p',`${e.rider_leg ? 'Return' : 'Outbound'}: pickup ${time(e.pickup)} · ${Math.ceil(e.extra_seconds/60)} extra driver minutes`)));
      const send = button(plan.role === 'driver' ? 'Invite this rider' : 'Request these seats', () => attempt(async () => {
        await api('/proposals','POST',{driver_plan_id:match.driver_plan_id,rider_plan_id:match.rider_plan_id,pairs:match.pairs});
        send.replaceWith(node('p','Sent — awaiting acceptance. Seats are not reserved yet.'));
        notice('Sent. You can follow the response in Your journeys.'); await refresh();
      }),true);
      el.append(send); list.append(el);
    });
  } catch (error) {
    byId('matches').replaceChildren(node('p',error.message));
    throw error;
  }
}
initializeForm();
byId('journey-form').addEventListener('submit',event => {
  event.preventDefault();
  attempt(async () => {
    const payload = readForm();
    byId('publish').disabled = true;
    try {
      await api('','POST',payload);
      notice('Your journey is published! Find compatible people in Your journeys. Your seats are confirmed only after acceptance.');
      await refresh();
      byId('your-heading').scrollIntoView({behavior:'smooth'});
    } finally { byId('publish').disabled = !auth.currentUser; }
  });
});
byId('refresh').addEventListener('click',() => attempt(refresh));
byId('period').addEventListener('change',render);
byId('logout').addEventListener('click',() => attempt(async () => { await signOut(auth); location.replace('../index.html'); }));
onAuthStateChanged(auth,user => {
  generation++;
  byId('logout').hidden = !user; byId('login').hidden = !!user;
  byId('publish').disabled = !user;
  if (user) attempt(refresh);
  else {
    plans = []; byId('journey-list').replaceChildren(node('p','Log in to publish and manage your journeys.'));
    byId('matches-panel').hidden = true;
  }
});
