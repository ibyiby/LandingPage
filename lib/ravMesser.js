const RAV_MESSER_API_URL = "https://graph.responder.live/v2";
const RAV_MESSER_TIMEOUT_MS = 8000;
const ACCESS_TOKEN_FALLBACK_CACHE_MS = 13 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_SAFETY_MARGIN_MS = 60 * 60 * 1000;

// Best effort only: a new Netlify Function instance requests a new token.
let cachedAccessToken = null;
let accessTokenExpiresAt = 0;

const NAME_PATTERN = /^[\p{L}\p{M}\s.'"\u2019\u05f3\u05f4-]+$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getConfig() {
  const config = {
    clientId: process.env.RAV_MESSER_CLIENT_ID,
    clientSecret: process.env.RAV_MESSER_CLIENT_SECRET,
    userToken: process.env.RAV_MESSER_USER_TOKEN,
    listId: process.env.RAV_MESSER_LIST_ID,
  };

  const hasMissingValue = Object.values(config).some(
    (value) => typeof value !== "string" || value.length === 0,
  );

  if (
    hasMissingValue ||
    !/^\d+$/.test(config.clientId || "") ||
    !/^\d+$/.test(config.listId || "")
  ) {
    return null;
  }

  return config;
}

function clearAccessToken() {
  cachedAccessToken = null;
  accessTokenExpiresAt = 0;
}

function getAccessTokenCacheMs(expiresIn) {
  const expiresInSeconds = Number(expiresIn);

  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return ACCESS_TOKEN_FALLBACK_CACHE_MS;
  }

  return Math.max(
    0,
    expiresInSeconds * 1000 - ACCESS_TOKEN_SAFETY_MARGIN_MS,
  );
}

async function getAccessToken(config, signal, forceRefresh = false) {
  if (
    !forceRefresh &&
    cachedAccessToken &&
    Date.now() < accessTokenExpiresAt
  ) {
    return cachedAccessToken;
  }

  const response = await fetch(`${RAV_MESSER_API_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      scope: "*",
      client_id: Number(config.clientId),
      client_secret: config.clientSecret,
      user_token: config.userToken,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error("Rav Messer authentication failed");
  }

  const result = await response.json();
  const accessToken = result?.access_token || result?.token;

  if (typeof accessToken !== "string" || !accessToken) {
    throw new Error("Rav Messer returned no access token");
  }

  cachedAccessToken = accessToken;
  accessTokenExpiresAt =
    Date.now() + getAccessTokenCacheMs(result?.expires_in);

  return accessToken;
}

function createSubscriber(config, accessToken, name, email, signal) {
  return fetch(`${RAV_MESSER_API_URL}/subscribers`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      list_ids: [Number(config.listId)],
    }),
    signal,
  });
}

function isValidName(name) {
  return (
    name.length >= 2 &&
    name.length <= 100 &&
    NAME_PATTERN.test(name)
  );
}

function isValidEmail(email) {
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

async function processSubscription(payload, requestId = "unknown") {
  const honeypot = String(payload.honeypot ?? "").trim();

  if (honeypot) {
    console.info("Newsletter subscription ignored", {
      requestId,
      outcome: "honeypot",
    });
    return { statusCode: 200, ok: true, code: "subscribed" };
  }

  const name =
    typeof payload.name === "string" ? payload.name.trim() : "";
  const email =
    typeof payload.email === "string" ? payload.email.trim() : "";

  if (!isValidName(name)) {
    return { statusCode: 400, ok: false, code: "invalid_name" };
  }

  if (!isValidEmail(email)) {
    return { statusCode: 400, ok: false, code: "invalid_email" };
  }

  if (payload.consent !== true) {
    return { statusCode: 400, ok: false, code: "consent_required" };
  }

  const config = getConfig();

  if (!config) {
    console.error("Newsletter subscription configuration error", {
      requestId,
    });
    return { statusCode: 500, ok: false, code: "service_unavailable" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    RAV_MESSER_TIMEOUT_MS,
  );

  try {
    let accessToken = await getAccessToken(
      config,
      controller.signal,
    );
    let apiResponse = await createSubscriber(
      config,
      accessToken,
      name,
      email,
      controller.signal,
    );

    if (apiResponse.status === 401) {
      clearAccessToken();
      accessToken = await getAccessToken(
        config,
        controller.signal,
        true,
      );
      apiResponse = await createSubscriber(
        config,
        accessToken,
        name,
        email,
        controller.signal,
      );
    }

    if (!apiResponse.ok) {
      console.warn("Rav Messer rejected subscription request", {
        requestId,
        status: apiResponse.status,
      });
      return { statusCode: 502, ok: false, code: "subscription_rejected" };
    }

    const result = await apiResponse.json();
    const created =
      result?.status === true &&
      Number.isInteger(result?.createdId) &&
      result.createdId > 0;
    const existing = result?.duplicate === true;

    if (!created && !existing) {
      console.warn("Rav Messer did not accept subscription", {
        requestId,
        outcome: "rejected",
      });
      return { statusCode: 502, ok: false, code: "subscription_rejected" };
    }

    console.info("Newsletter subscription completed", {
      requestId,
      outcome: created ? "created" : "existing",
    });
    return { statusCode: 200, ok: true, code: "subscribed" };
  } catch (error) {
    const timedOut = error?.name === "AbortError";

    console.error("Rav Messer subscription request failed", {
      requestId,
      errorType: timedOut ? "timeout" : error?.name || "unknown",
    });

    return {
      statusCode: timedOut ? 504 : 502,
      ok: false,
      code: timedOut ? "service_timeout" : "service_error",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  processSubscription,
};
