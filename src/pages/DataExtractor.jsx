import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Plus, MessageSquare, Globe, Loader2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import usePaymentInvestigation from '@/components/guardian/usePaymentInvestigation';
import InvestigationContextBar from '@/components/guardian/InvestigationContextBar';
import { researchRequest } from '@/components/guardian/investigationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import BrightDataMessage from '@/components/agent/BrightDataMessage';

const AGENT_NAME = 'data_extractor';

export default function DataExtractor() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const investigation = usePaymentInvestigation();
  useEffect(() => {
    if (investigation.record) setInput(researchRequest(investigation.record));
  }, [investigation.record?.id]);
  const displayedMessages = investigation.id ? (investigation.record?.research ? [{ role: 'assistant', tool_calls: [{ name: 'extractWebData', status: 'completed', results: investigation.record.research }] }] : []) : messages;

  const loadConversations = useCallback(async () => {
    try {
      const result = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      const list = result?.items || result || [];
      setConversations(list);
      if (!investigation.id && list.length > 0) {
        setActiveId(current => list.some(c => c.id === current) ? current : list[0].id);
      }
    } catch {
      /* no conversations yet */
    } finally {
      setLoading(false);
    }
  }, [investigation.id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!activeId || investigation.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data?.messages || []);
    });
    return () => unsubscribe();
  }, [activeId, investigation.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const newConversation = async () => {
    navigate('/extractor');
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: 'New extraction', description: 'New extraction' }
    });
    setConversations(prev => [conv, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (investigation.id) {
      if (!investigation.record || investigation.loading || investigation.error) return;
      setSending(true);
      try { await investigation.research.mutateAsync(text); setInput(''); }
      catch { /* The research error is displayed below; keep the request for retry. */ }
      finally { setSending(false); }
      return;
    }
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    try {
      let conv = conversations.find(c => c.id === activeId);
      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: text.slice(0, 50), description: text.slice(0, 50) }
        });
        setConversations(prev => [conv, ...prev]);
        setActiveId(conv.id);
      }
      await base44.agents.addMessage(conv, { role: 'user', content: text });
    } catch {
      setInput(text);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r bg-card shrink-0">
        <div className="p-4 border-b">
          <Button onClick={newConversation} className="w-full">
            <Plus size={16} /> New extraction
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => { navigate('/extractor'); setActiveId(c.id); }}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-left transition-colors ${c.id === activeId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
              >
                <MessageSquare size={14} className="shrink-0" />
                <span className="truncate">{c.metadata?.name || 'Untitled'}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b px-4 py-3 flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm"><Link to="/"><ArrowLeft size={16} />Back to dashboard</Link></Button>
          <Globe size={18} className="text-primary shrink-0" />
          <h1 className="text-sm font-semibold">Web Data Extractor</h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">Powered by Bright Data</span>
        </header>
        <InvestigationContextBar investigation={investigation} page="extractor" />
        {investigation.research.isError && <p role="alert" className="px-4 py-2 text-sm text-destructive">{investigation.research.error.response?.data?.error || investigation.research.error.message} No new findings were saved.</p>}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading || investigation.loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : displayedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 px-4">
              <Globe size={40} className="text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground max-w-md">
                Search the web using Bright Data only. For example: &ldquo;Figma official pricing plans&rdquo;
              </p>
            </div>
          ) : (
            <>
              {displayedMessages.map((m, i) => <BrightDataMessage key={i} message={m} messages={displayedMessages} index={i} />)}
              <div ref={scrollRef} />
            </>
          )}
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Enter a search query, such as Figma official pricing plans..."
              disabled={sending || investigation.loading || !!investigation.error}
              className="flex-1"
            />
            <Button onClick={send} disabled={sending || !input.trim() || investigation.loading || !!investigation.error} aria-label={investigation.id ? 'Research Vendor with Bright Data' : 'Send extraction request'}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}