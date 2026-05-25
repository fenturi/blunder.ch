export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new HttpError(response.status, `Request failed for ${url}`);
  }

  return response.json();
}

export async function fetchText(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new HttpError(response.status, `Request failed for ${url}`);
  }

  return response.text();
}
