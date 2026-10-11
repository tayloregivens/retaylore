import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const zone = body?.zone || 'serp_api1';
    const format = body?.format || 'raw';
    const dataFormat = body?.data_format;

    let url = body?.url;
    const query = body?.query;
    // Preserve the existing pricing-investigation caller's explicit legacy format.
    const legacy = dataFormat === 'parsed_light';
    if (query && (typeof query !== 'string' || query.length > 1000)) {
      return Response.json({ error: 'Search query must be at most 1000 characters.' }, { status: 400 });
    }

    if (query && !url) {
      const params = new URLSearchParams({ q: query, hl: 'en', gl: 'us' });
      url = `https://www.google.com/search?${params}`;
    }

    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'Either url or query is required' }, { status: 400 });
    }

    try {
      const searchUrl = new URL(url);
      if (!legacy) {
        if (searchUrl.hostname !== 'www.google.com' || searchUrl.pathname !== '/search') {
          return Response.json({ error: 'Use a search query or a Google search URL.' }, { status: 400 });
        }
        searchUrl.searchParams.set('brd_json', '1');
        url = searchUrl.href;
      }
    } catch {
      return Response.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const apiKey = secrets.get('brightData');
    if (!apiKey) {
      return Response.json({ error: 'Bright Data API key not configured' }, { status: 500 });
    }

    const payload: Record<string, string> = { zone, url, format: legacy ? format : 'raw' };
    payload.data_format = legacy ? dataFormat : 'parsed_light';

    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000),
    });

    console.info('Bright Data response', { status: response.status, contentType: response.headers.get('content-type'), mode: legacy ? 'legacy' : 'brd_json=1' });
    if (!response.ok) {
      const apiError = (await response.text()).replaceAll(apiKey, '[redacted]').slice(0, 500);
      console.error('Bright Data API error', { status: response.status, contentType: response.headers.get('content-type'), message: apiError });
      return Response.json({ success: false, provider: 'Bright Data', request_succeeded: false, result_count: 0, error: `Bright Data request failed (${response.status}). No fallback search was used.`, details: apiError }, { status: 502 });
    }

    const text = await response.text();
    if (!legacy) {
      let parsed;
      try { parsed = JSON.parse(text); } catch {
        console.error('Bright Data invalid response', { responseType: text ? 'non-JSON' : 'empty', bytes: text.length });
        return Response.json({ success: false, provider: 'Bright Data', request_succeeded: true, result_count: 0, error: 'No usable Bright Data results found. The response was empty or not parsed JSON.' }, { status: 502 });
      }
      console.info('Bright Data parsed response', { responseType: Array.isArray(parsed) ? 'array' : typeof parsed, keys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : [] });
      const organic = Array.isArray(parsed?.organic) ? parsed.organic : [];
      const results = organic.slice(0, 20).flatMap(entry => {
        let source;
        try { source = new URL(entry.link || entry.url); } catch { return []; }
        if (!['https:', 'http:'].includes(source.protocol)) return [];
        const description = String(entry.description || entry.snippet || '').slice(0, 2000);
        const pricing = description.match(/(?:[$€£]\s?\d[\d,.]*(?:\s*\/\s*(?:mo(?:nth)?|year|user|seat))?|\b\d[\d,.]*\s*(?:USD|EUR|GBP)\b)/gi) || [];
        return [{ title: String(entry.title || source.hostname).slice(0, 300), url: source.href, description, pricing: [...new Set(pricing)].slice(0, 10) }];
      });
      console.info('Bright Data structured results', { count: results.length });
      return Response.json({ success: results.length > 0, provider: 'Bright Data', request_succeeded: true, query: query || new URL(url).searchParams.get('q'), source_url: url, result_count: results.length, results, ...(results.length ? {} : { error: 'No usable Bright Data results found.' }) });
    }

    if (!text || text.length === 0) {
      return Response.json({
        url,
        error: 'Bright Data returned an empty response. The query may have been blocked or rate-limited. Try again in a moment.',
      }, { status: 502 });
    }

    const maxLength = 50000;
    const truncated = text.length > maxLength;

    return Response.json({
      url,
      content: truncated ? text.slice(0, maxLength) : text,
      truncated,
      content_length: text.length,
    });
  } catch (error) {
    console.error('Bright Data request exception', { type: error?.name || 'Error' });
    return Response.json({ success: false, provider: 'Bright Data', result_count: 0, error: 'Bright Data retrieval failed. Please try again. No fallback search was used.' }, { status: 500 });
  }
}