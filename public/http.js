// let host = 'http://localhost:3000';
// const host = process.env.PUSH_SERVER_URL;

async function post(path, body) {
  const res = await fetch('/swsubscription', {
        method: 'POST', // or 'PUT'
        body: JSON.stringify(body), // data can be `string` or {object}!
        headers:{
        'Content-Type': 'application/json'
        }
      });
  const data = await res.json();
  // host = data.host
  return data;
}

async function get(path) {
  const response = await fetch(`/${path}`, {
    headers: { "content-type": "application/json;charset=UTF-8"},
    method: "GET",
  });
  const data = await response.json();
  return data;
}

export const http = {
  post: post,
  get: get
};

// export default http;