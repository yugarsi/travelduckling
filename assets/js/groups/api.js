import { auth } from '../../../firebase-auth.js';
import { API_BASE_URL } from '../config.js';
export async function groupApi(path = '', method = 'GET', data, publicRead = false) {
  const headers = {};
  if (!publicRead) {
    if (!auth.currentUser) throw new Error('Please log in to manage group trips.');
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }
  if (data) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${API_BASE_URL}/api/v1/group-trips${path}`, {
    method, headers, ...(data ? {body: JSON.stringify(data)} : {})
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(body.detail)
    ? body.detail.map(item => item.msg).join(' ') : body.detail || 'Unable to load group trips. Please try again.');
  return body;
}
