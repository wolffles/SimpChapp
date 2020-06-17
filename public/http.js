const host = 'http://localhost:3000';
// const host = process.env.PUSH_SERVER_URL;

async function post(path, body) {
  const res = await fetch(`${host}${path}`, {
    credentials: "omit",
    headers: { "content-type": "application/json;charset=UTF-8", "sec-fetch-mode": "cors" },
    body: JSON.stringify(body),
    method: "POST",
    mode: "cors"
  });
  const data = await res.json();
  return data;
}

async function get(path) {
  const response = await fetch(`${host}${path}`, {
    credentials: "omit",
    headers: { "content-type": "application/json;charset=UTF-8", "sec-fetch-mode": "cors" },
    method: "GET",
    mode: "cors"
  });
  const data = await response.json();
  return data;
}

export const http = {
  post: post,
  get: get
};

// export default http;