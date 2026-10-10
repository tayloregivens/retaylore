import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { analyze, loadSource } from '../../shared/guardianAnalysis.ts';
import { historyText, pendingText } from '../../shared/guardianSample.ts';
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Please sign in to review payments.' }, { status: 401 });
    const body = await req.json();
    const source = body.historyText !== undefined || body.pendingText !== undefined
      ? { historyText: body.historyText, pendingText: body.pendingText }
      : await loadSource(base44, user, body.batchId || 'sample');
    return Response.json({ ...analyze(source.historyText, source.pendingText), sampleFiles: { historyText, pendingText } });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to analyze these files.' }, { status: 400 });
  }
}