import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { extractBrightData } from '../../shared/extractBrightData.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    return await extractBrightData(await req.json());
  } catch (error) {
    console.error('Bright Data request exception', { type: error?.name || 'Error' });
    return Response.json({ success: false, provider: 'Bright Data', result_count: 0, error: 'Bright Data retrieval failed. Please try again. No fallback search was used.' }, { status: 500 });
  }
}