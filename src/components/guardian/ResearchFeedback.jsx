import React from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ResearchFeedback({ investigation, sending, onRetry, empty = false }) {
  const error = investigation.research.error;
  const response = error?.data || error?.response?.data;
  const details = response?.details;
  const vendor = investigation.record?.payment?.vendor;
  if (investigation.research.isError) return <div role="alert" className="rounded-lg border bg-card p-4 space-y-3 text-sm">
    <p className="font-medium text-destructive">{response?.error || error?.message || 'Research could not be completed.'}</p>
    <p className="text-muted-foreground">No new findings were saved.{investigation.record?.research ? ' Your previous findings remain available below and in Payment Advisor.' : ' Your payment context is still available.'}</p>
    <Button variant="outline" size="sm" onClick={onRetry} disabled={sending}>{sending ? <Loader2 size={14} className="animate-spin" /> : null}Retry research</Button>
    {details && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Bright Data error details</summary><pre className="mt-2 whitespace-pre-wrap break-words">{typeof details === 'string' ? details : JSON.stringify(details, null, 2)}</pre></details>}
  </div>;
  if (!empty) return null;
  return <div className="flex flex-col items-center justify-center h-full text-center space-y-3 px-4">
    <Globe size={40} className="text-muted-foreground/50" />
    <p className="text-sm text-muted-foreground max-w-md">{sending ? `Researching ${vendor || 'your query'} through Bright Data. Temporary failures may take longer while a delayed retry runs.` : investigation.id ? `Research ${vendor || 'this vendor'}’s public pricing to help review the selected payment. Submit the suggested query below; successful findings will be saved for Payment Advisor.` : 'Enter a vendor or pricing search query below. Research uses Bright Data only.'}</p>
  </div>;
}