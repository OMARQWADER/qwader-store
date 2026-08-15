/* Small fetch wrapper for the backend API. Cookies (the session token)
   are same-origin, so the browser sends them automatically — no manual
   token handling needed on the frontend. */
async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no/invalid JSON body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body === undefined ? {} : body),
  patch: (path, body) => request("PATCH", path, body === undefined ? {} : body),
  del: (path) => request("DELETE", path),
};
