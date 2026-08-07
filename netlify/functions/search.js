/**
 * Netlify Function: /api/search
 * Proxies the ProPublica Nonprofit Explorer search API.
 */
const BASE = "https://projects.propublica.org/nonprofits/api/v2";
const HEADERS = { "User-Agent": "GrantReadinessPrototype/0.1 (research/demo use)" };

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const q = (params.q || "").trim();
  const state = (params.state || "").trim().toUpperCase();

  if (!q) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Enter an organization name to search." }),
    };
  }

  const url = new URL(`${BASE}/search.json`);
  url.searchParams.set("q", q);
  if (state) url.searchParams.set("state[id]", state);

  try {
    const resp = await fetch(url.toString(), { headers: HEADERS });
    if (!resp.ok) throw new Error(`ProPublica returned ${resp.status}`);
    const data = await resp.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Search failed: ${err.message}` }),
    };
  }
};
