import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Input } from '../ui/input';
import { Bot, Send, X, MessageSquare, Sparkles, History, Plus } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

export default function AIAssistant({ context, onDataChange }: { context: any, onDataChange?: () => void }) {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hi! I am SpendWise AI. How can I help you with your finances today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showHistory]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    const data = await aiService.getChatHistory();
    if (data.sessions) {
      setSessions(data.sessions);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const data = await aiService.chatWithAssistant(userMessage, history, context, currentSessionId || undefined);
      const reply = typeof data === 'string' ? data : data.reply;
      const sessionId = typeof data === 'object' ? data.sessionId : null;

      if (sessionId && !currentSessionId) {
        setCurrentSessionId(sessionId);
      }
      
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
      if (sessionId) loadHistory();
      
      // Check if the reply suggests a data update happened
      if (onDataChange && (reply.toLowerCase().includes('successfully') || reply.toLowerCase().includes('added') || reply.toLowerCase().includes('set'))) {
        onDataChange();
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([{ role: 'model', text: 'Hi! I am SpendWise AI. How can I help you with your finances today?' }]);
    setShowHistory(false);
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setShowHistory(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4"
          >
            <Card className="w-[350px] sm:w-[400px] h-[500px] flex flex-col shadow-2xl border-neutral-200 overflow-hidden">
              <CardHeader className="bg-amber-500 text-white p-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1.5 rounded-lg">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">SpendWise AI</CardTitle>
                    <div className="text-[10px] opacity-80 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      Online
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowHistory(!showHistory)} 
                    className="text-white hover:bg-white/10 h-8 w-8"
                    title="History"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={startNewChat} 
                    className="text-white hover:bg-white/10 h-8 w-8"
                    title="New Chat"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 h-8 w-8">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {showHistory ? (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Previous Chats</h3>
                    {sessions.length === 0 ? (
                      <div className="text-center py-8 text-neutral-400 text-sm">No previous chats found.</div>
                    ) : (
                      sessions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => selectSession(s)}
                          className={`w-full text-left p-3 rounded-xl text-sm transition-colors ${
                            currentSessionId === s.id ? 'bg-amber-50 border-amber-200 border' : 'bg-neutral-50 hover:bg-neutral-100 border-transparent border'
                          }`}
                        >
                          <div className="font-medium truncate">{s.title || 'Untitled Chat'}</div>
                          <div className="text-[10px] text-neutral-400 mt-1">
                            {new Date(s.updatedAt).toLocaleDateString()}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <>
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                          m.role === 'user' 
                            ? 'bg-amber-500 text-white rounded-tr-none' 
                            : 'bg-neutral-100 text-neutral-800 rounded-tl-none'
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {messages.length === 1 && !loading && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-neutral-700 space-y-2">
                        <div className="font-semibold text-blue-900">I can help you with:</div>
                        <div className="space-y-1 text-[11px]">
                          <div>✓ <strong>Transactions:</strong> Add, update, delete transactions</div>
                          <div>✓ <strong>Budgets:</strong> Set and manage budgets by category</div>
                          <div>✓ <strong>Categories:</strong> Create new spending categories</div>
                          <div>✓ <strong>Recurring:</strong> Set up recurring transactions</div>
                          <div>✓ <strong>Debts:</strong> Track debts and repayments</div>
                          <div>✓ <strong>Bills:</strong> Add and track upcoming bills</div>
                          <div>✓ <strong>Insights:</strong> Get spending summaries and analysis</div>
                        </div>
                        <div className="text-[10px] text-neutral-600 mt-2">Try: "Add $20 expense for groceries" or "Set a $500 budget for food"</div>
                      </div>
                    )}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-neutral-100 p-3 rounded-2xl rounded-tl-none flex gap-1">
                          <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>

              {!showHistory && (
                <CardFooter className="p-4 border-t border-neutral-100">
                  <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex w-full gap-2">
                    <Input
                      placeholder="Ask me anything..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="flex-1 border-neutral-200 focus-visible:ring-amber-500"
                    />
                    <Button type="submit" size="icon" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </CardFooter>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg flex items-center justify-center group transition-transform hover:scale-110"
      >
        {isOpen ? <X className="w-6 h-6" /> : (
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 bg-white p-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-amber-500" />
            </div>
          </div>
        )}
      </Button>
    </div>
  );
}
