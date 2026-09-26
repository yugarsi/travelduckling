import { attachAddressAutocomplete, readPlaceId } from '../places.js';
const byId = id => document.getElementById(id);
export function initializeForm() {
  for (const id of ['origin','destination']) attachAddressAutocomplete(byId(id));
  byId('timezone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
  function update() {
    const driver = document.querySelector('[name=role]:checked').value === 'driver';
    const round = byId('trip-type').value === 'roundtrip';
    byId('return-fields').hidden = !round;
    byId('return-fields').disabled = !round;
    byId('one-way-option').hidden = !driver;
    byId('detour-field').hidden = !driver;
    byId('publish').textContent = driver ? 'Publish seat offer' : 'Publish ride request';
  }
  byId('trip-type').addEventListener('change',update);
  document.querySelectorAll('[name=role]').forEach(el => el.addEventListener('change',update));
  const local = new Date();
  const value = new Date(local.getTime() - local.getTimezoneOffset()*60000).toISOString().slice(0,16);
  for (const id of ['earliest','latest','return-earliest','return-latest']) byId(id).min = value;
  const params = new URLSearchParams(location.search);
  if (params.get('role') === 'rider') document.querySelector('[name=role][value=rider]').checked = true;
  update();
}
export function readForm() {
  const place = id => {
    const input = byId(id), place_id = readPlaceId(input);
    if (!place_id) throw new Error('Please select both locations from the address suggestions.');
    return {label: input.value.trim(), place_id};
  };
  const time = id => {
    const date = new Date(byId(id).value);
    if (!Number.isFinite(date.getTime()) || date <= new Date()) throw new Error('Choose future departure times.');
    return date.toISOString();
  };
  const origin = place('origin'), destination = place('destination');
  const legs = [{origin, destination, earliest:time('earliest'), latest:time('latest'), seats:Number(byId('seats').value)}];
  if (byId('trip-type').value === 'roundtrip') legs.push({origin:destination, destination:origin,
    earliest:time('return-earliest'), latest:time('return-latest'), seats:Number(byId('return-seats').value)});
  return {role:document.querySelector('[name=role]:checked').value, legs,
    allow_one_way:byId('allow-one-way').checked, max_detour_minutes:Number(byId('detour').value),
    preferences:byId('preferences').value.trim(), activity:byId('activity').value.trim()};
}
