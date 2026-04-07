exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 401, headers, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }) };
  try {
    const body = JSON.parse(event.body);
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: body.model || "claude-sonnet-4-20250514", max_tokens: body.max_tokens || 4096, system: body.system || "", messages: body.messages || [] }) });
    return { statusCode: response.status, headers, body: JSON.stringify(await response.json()) };
  } catch (error) { return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }; }
};
