import { secrets } from 'base44:runtime';
import { brightDataRequest, brightDataFailure } from './brightDataRequest.ts';

export async function extractBrightData(body) {
  const zone = body?.zone || 'serp_api1';
  let url = body?.url;
  const query = body?.query;
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
    if (searchUrl.hostname !== 'www.google.com' || searchUrl.pathname !== '/search') {
      return Response.json({ error: 'Use a search query or a Google search URL.' }, { status: 400 });
    }
    searchUrl.searchParams.set('brd_json', '1');
    url = searchUrl.href;
  } catch {
    return Response.json({ error: 'Invalid URL format' }, { status: 400 });
  }
  const apiKey = secrets.get('brightData');
  if (!apiKey) return Response.json({ error: 'Bright Data API key not configured' }, { status: 500 });
  const result = await brightDataRequest(apiKey, { zone, url, format: 'raw' });
  if (!result.ok) return Response.json(brightDataFailure(result), { status: 502 });
  const text = result.text;
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