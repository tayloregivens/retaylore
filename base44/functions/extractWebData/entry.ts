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

    if (query && !url) {
      const params = new URLSearchParams({ q: query, hl: 'en', gl: 'us' });
      url = `https://www.google.com/search?${params}`;
    }

    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'Either url or query is required' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return Response.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const apiKey = secrets.get('brightData');
    if (!apiKey) {
      return Response.json({ error: 'Bright Data API key not configured' }, { status: 500 });
    }

    const payload: Record<string, string> = { zone, url, format };
    if (dataFormat) {
      payload.data_format = dataFormat;
    }

    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({
        error: `Bright Data request failed (${response.status})`,
        details: errorText.slice(0, 500)
      }, { status: 502 });
    }

    const text = await response.text();

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
    return Response.json({ error: error.message }, { status: 500 });
  }
}