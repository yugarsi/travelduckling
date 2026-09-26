// All member-provided text is rendered through textContent.
export function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
export function button(label, action, primary = false) {
  const el = node('button', label, primary ? 'primary' : '');
  el.type = 'button';
  el.addEventListener('click', async () => {
    el.disabled = true;
    try { await action(); } finally { el.disabled = false; }
  });
  return el;
}
export const time = value => new Date(value).toLocaleString(undefined, {month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short'});
export function profile(person, preferences = '') {
  const box = node('div',undefined,'person');
  box.append(node('strong',person.first_name || 'Traveler'));
  box.append(node('p',person.rides_count ? `${person.rides_count} published rides · Rating ${person.rating || 0}` : 'New member'));
  if (person.about) box.append(node('p',person.about));
  if (preferences) box.append(node('p',`Travel preferences: ${preferences}`));
  return box;
}
export function card(plan) {
  const el = node('article',undefined,'card');
  el.append(node('span',`${plan.role === 'driver' ? '🚗 Driver' : '🎒 Rider'} · ${plan.legs.length === 2 ? 'Round trip' : 'One way'}`,'badge'));
  el.append(node('h3',`${plan.legs[0].origin.label} → ${plan.legs[0].destination.label}`));
  if (plan.activity) el.append(node('p',`Activity together: ${plan.activity}`));
  if (plan.role === 'driver') el.append(node('p',`Up to ${plan.max_detour_minutes} extra minutes per direction${plan.legs.length === 2 ? (plan.allow_one_way ? ' · One-way bookings welcome' : ' · Book both directions together') : ''}`,'hint'));
  plan.legs.forEach((leg,index) => {
    const block = node('div',undefined,'leg');
    block.append(node('strong',`${index ? 'Return' : 'Outbound'} · ${leg.status}`));
    block.append(node('p',`${time(leg.earliest)} – ${time(leg.latest)}`));
    block.append(node('p',`${plan.role === 'driver' ? leg.remaining + ' seats available' : leg.seats + ' seats needed'}`,'hint'));
    block.dataset.leg = index;
    el.append(block);
  });
  return el;
}
