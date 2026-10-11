import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Plus, MessageSquare, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageBubble from '@/components/agent/MessageBubble';

const AGENT_NAME = 'data_extractor';

export default function DataExtractor() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const result = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      const list = result?.items || result || [];
      setConversations(list);
      if (list.length > 0) {
        setActiveId(list[0].id);
      }
    } catch {
      /* no conversations yet */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    const unsubscribe = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data?.messages || []);
    });
    return () => unsubscribe();
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const newConversation = async () => {
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
                onClick={() => setActiveId(c.id)}
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
        <header className="border-b px-4 py-3 flex items-center gap-2">
          <Globe size={18} className="text-primary shrink-0" />
          <h1 className="text-sm font-semibold">Web Data Extractor</h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">Powered by Bright Data</span>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 px-4">
              <Globe size={40} className="text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground max-w-md">
                Ask me to extract data from any web page. For example: &ldquo;Extract all product names and prices from https://example.com/store&rdquo;
              </p>
            </div>
          ) : (
            <>
              {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
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
              placeholder="Paste a URL and describe what data to extract..."
              disabled={sending}
              className="flex-1"
            />
            <Button onClick={send} disabled={sending || !input.trim()}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}