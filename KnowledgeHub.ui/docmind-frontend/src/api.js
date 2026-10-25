const BASE = '/api';
export const getToken = () => localStorage.getItem('token');

async function req(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const isForm = body instanceof FormData;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 401 && getToken()) {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('logout')); // token expired -> back to login
  }
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  return res.status === 204 ? null : res.json();
}

export const api = {
  login: (email, password) => req('/auth/login', { method: 'POST', body: { email, password } }),
  register: (email, password) => req('/auth/register', { method: 'POST', body: { email, password } }),
  listDocs: () => req('/documents'),
  uploadDoc: (file) => {
    const form = new FormData();
    form.append('file', file);
    return req('/documents', { method: 'POST', body: form });
  },
  deleteDoc: (id) => req(`/documents/${id}`, { method: 'DELETE' }),
};

/**
 * POST /api/chat returns Server-Sent Events:
 *   data:<token>                      -> a piece of the answer
 *   event:sources / data:[{...}]      -> citations, sent once at the end
 * EventSource only supports GET, so we read the stream with fetch.
 */
export async function streamChat(body, { onToken, onSources, signal }) {
  const res = await fetch(BASE + '/chat', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let end;
    while ((end = buf.indexOf('\n\n')) !== -1) {
      const raw = buf.slice(0, end);
      buf = buf.slice(end + 2);
      let event = 'message';
      const data = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5)); // keep spaces: they belong to the token
      }
      const payload = data.join('\n');
      if (event === 'sources') onSources(JSON.parse(payload));
      else onToken(payload);
    }
  }
}
