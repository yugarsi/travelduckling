import { auth } from '../../../firebase-auth.js';
import { API_BASE_URL } from '../config.js';
export async function api(path = '', method = 'GET', data) {
  if (!auth.currentUser) throw new Error('Please log in to manage journeys.');
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/journeys${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, ...(data ? {'Content-Type': 'application/json'} : {}) },
    ...(data ? {body: JSON.stringify(data)} : {})
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(body.detail) ? body.detail.map(e => e.msg).join('\n') : body.detail;
    throw new Error(detail || 'Could not complete that request. Please try again.');
  }
  return body;
}
