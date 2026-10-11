export async function brightDataRequest(apiKey, payload) {
  const clean = value => String(value || '').split(apiKey).join('[redacted]').slice(0, 500);
  let result;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(120000),
    });
    const text = await response.text();
    const code = clean(response.headers.get('x-brd-error-code') || response.headers.get('x-brd-err-code'));
    const message = clean(response.headers.get('x-brd-error') || response.headers.get('x-brd-err-msg'));
    const description = clean(response.headers.get('x-brd-err-msg'));
    const rejected = /auth failed|ip_forbidden|client_10030|not whitelisted|unauthorized|forbidden/i.test(`${code} ${message} ${description} ${text.slice(0, 500)}`);
    const providerError = !!(code || message || rejected);
    const ok = response.ok && !providerError;
    const category = rejected ? 'access_denied' : response.status === 429 ? 'rate_limit' : [400, 401, 403, 407].includes(response.status) ? 'configuration' : 'temporary';
    const diagnostics = { status: response.status, code, message, description,
      request_id: clean(response.headers.get('x-brd-request-id') || response.headers.get('x-request-id') || response.headers.get('cf-ray')),
      zone: payload.zone, attempts: attempt, category, ...(ok ? {} : { body: clean(text) }) };
    result = { ok, text, status: response.status, diagnostics };
    console.info('Bright Data response', ok ? { status: response.status, attempts: attempt } : diagnostics);
    if (ok || rejected || attempt === 2) return result;
    const period = Number(response.headers.get('x-brd-rate-limit-period-ms')) || 0;
    const retryAfter = response.headers.get('retry-after');
    const retryMs = retryAfter ? (/^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now())) : 0;
    const delay = Math.max(16000, period, retryMs || 0);
    const temporary = [429, 500, 502, 503, 504, 520, 522, 524].includes(response.status);
    if (!temporary || delay > 60000) return result;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return result;
}

export function brightDataFailure(result) {
  const { diagnostics: d } = result;
  let error;
  if (d.category === 'access_denied') error = 'Bright Data rejected access. Check the SERP zone’s allowed IPs and API permissions.';
  else if (d.category === 'configuration') error = 'Bright Data rejected the request configuration. Check the SERP zone and API permissions.';
  else if (d.category === 'rate_limit') error = 'Bright Data is limiting requests. Wait at least 30 seconds before trying again.';
  else error = `Bright Data request failed (${result.status}) after ${d.attempts} attempt${d.attempts === 1 ? '' : 's'}. Please try again later.`;
  return { success: false, provider: 'Bright Data', request_succeeded: false, result_count: 0,
    error: `${error} No fallback search was used.`, details: d };
}