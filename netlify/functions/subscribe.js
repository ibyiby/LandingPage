const { processSubscription } = require("../../lib/ravMesser");

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function jsonResponse(statusCode, ok, code, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders,
    },
    body: JSON.stringify({ ok, code }),
  };
}

function parseRequestBody(event) {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body;

  const payload = JSON.parse(rawBody || "{}");

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new SyntaxError("Invalid JSON payload");
  }

  return payload;
}

exports.handler = async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, false, "method_not_allowed", {
      Allow: "POST",
    });
  }

  let payload;

  try {
    payload = parseRequestBody(event);
  } catch {
    return jsonResponse(400, false, "invalid_json");
  }

  const result = await processSubscription(
    payload,
    context?.awsRequestId || "unknown",
  );

  return jsonResponse(result.statusCode, result.ok, result.code);
};
