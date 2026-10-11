import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const url = body?.url;
    const zone = body?.zone || 'web_unlocker1';
    const format = body?.format || 'raw';

    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'A valid url is required' }, { status: 400 });
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

    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ zone, url, format }),
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({
        error: `Bright Data request failed (${response.status})`,
        details: errorText.slice(0, 500)
      }, { status: 502 });
    }

    const content = await response.text();
    const maxLength = 50000;
    const truncated = content.length > maxLength;

    return Response.json({
      url,
      content: truncated ? content.slice(0, maxLength) : content,
      truncated,
      content_length: content.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}