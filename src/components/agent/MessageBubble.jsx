import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);

  const status = toolCall.status;
  const isError = status === 'failed' || status === 'error';
  const isPending = status === 'pending' || status === 'running' || status === 'in_progress';

  let parsedArgs = toolCall.arguments_string;
  try { parsedArgs = JSON.parse(toolCall.arguments_string); } catch { /* keep raw */ }

  let parsedResults = toolCall.results;
  if (typeof parsedResults === 'string') {
    try { parsedResults = JSON.parse(parsedResults); } catch { /* keep raw */ }
  }

  const projection = toolCall.display_projection || {};
  const hideDetails = projection.hide_details && projection.details_redacted;

  const statusIcon = isError
    ? <XCircle size={14} className="text-destructive shrink-0" />
    : isPending
      ? <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
      : <CheckCircle2 size={14} className="text-success shrink-0" />;

  const statusLabel = isError
    ? (projection.error_label || 'Failed')
    : isPending
      ? (projection.active_label || 'Running...')
      : (projection.label || 'Done');

  return (
    <div className="mt-2 text-xs border rounded-md bg-muted/30">
      <button
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {!hideDetails && (expanded
          ? <ChevronDown size={14} className="shrink-0" />
          : <ChevronRight size={14} className="shrink-0" />)}
        <Wrench size={14} className="text-muted-foreground shrink-0" />
        <span className="font-medium">{toolCall.name}</span>
        {statusIcon}
        <span className="text-muted-foreground">{statusLabel}</span>
      </button>
      {!hideDetails && expanded && (
        <div className="px-3 pb-3 space-y-2">
          {parsedArgs && (
            <div>
              <p className="font-medium text-muted-foreground mb-1">Parameters:</p>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">{JSON.stringify(parsedArgs, null, 2)}</pre>
            </div>
          )}
          {parsedResults !== undefined && parsedResults !== null && (
            <div>
              <p className="font-medium text-muted-foreground mb-1">Result:</p>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">{JSON.stringify(parsedResults, null, 2).slice(0, 2000)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div className={`max-w-[85%] ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card border'} rounded-lg px-4 py-3`}>
        {message.content && (
          isUser
            ? <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            : <ReactMarkdown className="text-sm space-y-2 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:px-2 [&_td]:px-2 [&_th]:bg-muted">{message.content}</ReactMarkdown>
        )}
        {message.tool_calls?.map((tc, i) => <ToolCallDisplay key={i} toolCall={tc} />)}
      </div>
    </div>
  );
}