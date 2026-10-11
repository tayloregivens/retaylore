import React from 'react';
import MessageBubble from '@/components/agent/MessageBubble';

export default function BrightDataMessage({ message, messages, index }) {
  if (message.role === 'user') return <MessageBubble message={message} />;
  let start = index, end = index + 1;
  while (start > 0 && messages[start - 1].role !== 'user') start--;
  while (end < messages.length && messages[end].role !== 'user') end++;
  const turnCalls = messages.slice(start, end).flatMap(m => m.tool_calls || []);
  const isLast = index === end - 1;
  if (turnCalls.some(call => /web_search/i.test(call.name || ''))) {
    return isLast ? <MessageBubble message={{ role: 'assistant', content: 'Non-Bright Data search results were blocked. No usable Bright Data results found. Please retry your query.' }} /> : null;
  }
  const calls = (message.tool_calls || []).filter(call => /extractWebData/i.test(call.name || ''));
  if (!calls.length) {
    return isLast && !turnCalls.length ? <MessageBubble message={{ role: 'assistant', content: 'No usable Bright Data results found. Awaiting Bright Data retrieval; no fallback search is used.' }} /> : null;
  }
  return <div className="space-y-3">{calls.map((call, i) => {
    if (['pending', 'running', 'in_progress'].includes(call.status)) {
      return <MessageBubble key={i} message={{ role: 'assistant', tool_calls: [call] }} />;
    }
    let result = call.results;
    if (typeof result === 'string') {
      try { result = JSON.parse(result); } catch { result = null; }
    }
    result = result?.data || result;
    if (result?.provider !== 'Bright Data' || result?.success !== true || !Array.isArray(result.results) || !result.results.length) {
      return <MessageBubble key={i} message={{ role: 'assistant', content: result?.provider === 'Bright Data' ? (result.error || 'No usable Bright Data results found.') : 'No usable Bright Data results found. No fallback search was used.' }} />;
    }
    return <div key={i} className="max-w-[85%] bg-card border rounded-lg px-4 py-3 text-sm space-y-3">
      <p className="font-semibold">Retrieval provider: Bright Data · {result.result_count} structured results</p>
      {result.results.map((entry, j) => {
        if (!/^https?:\/\//i.test(entry.url || '')) return null;
        return <div key={j} className="space-y-1">
          <a className="text-primary underline" href={entry.url} target="_blank" rel="noopener noreferrer">{entry.title}</a>
          <p>{entry.description}</p>
          <p className="text-muted-foreground">Pricing evidence: {entry.pricing?.length ? entry.pricing.join(', ') : 'Not available in this search snippet.'}</p>
        </div>;
      })}
      <p className="text-xs text-muted-foreground">Search snippets are evidence, not confirmation of current pricing.</p>
    </div>;
  })}</div>;
}