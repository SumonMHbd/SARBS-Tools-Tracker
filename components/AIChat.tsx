
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Loader2, Bot, User as UserIcon, Sparkles } from 'lucide-react';
import { generateInventoryAnalysis } from '../services/geminiService';
import { Tool, ChatMessage } from '../types';

interface AIChatProps {
  inventory: Tool[];
}

const AIChat: React.FC<AIChatProps> = ({ inventory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await generateInventoryAnalysis(input, inventory);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I'm having trouble connecting to the cloud hub right now. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-6 md:bottom-8 md:right-8 z-50 p-4 rounded-full shadow-2xl transition-all active:scale-95 group ${
          isOpen ? 'scale-0' : 'scale-100'
        } bg-slate-900 text-white hover:bg-blue-600`}
      >
        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-bounce"></div>
      </button>

      {/* Chat Window */}
      <div
        className={`fixed inset-0 md:inset-auto md:bottom-8 md:right-8 md:w-[400px] md:h-[600px] bg-white z-[100] shadow-2xl transition-all duration-300 transform flex flex-col overflow-hidden ${
          isOpen 
            ? 'translate-y-0 opacity-100 rounded-none md:rounded-3xl' 
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-xl">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest">Asset Intelligence</h3>
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">Powered by Gemini AI</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 scroll-smooth no-scrollbar"
        >
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                <Sparkles className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-widest">SARBS Assistant</p>
                <p className="text-[10px] text-slate-400 font-medium max-w-[200px] mx-auto mt-1 italic leading-relaxed">
                  Ask me anything about current stock levels, maintenance trends, or tool locations across units.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${
                msg.role === 'user' ? 'bg-blue-100' : 'bg-slate-900'
              }`}>
                {msg.role === 'user' ? <UserIcon className="w-3 h-3 text-blue-600" /> : <Bot className="w-3 h-3 text-white" />}
              </div>
              <div className={`max-w-[80%] p-4 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="bg-slate-900 p-2 rounded-lg">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100">
          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-blue-500 focus:bg-white transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-slate-900 text-white rounded-xl hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-slate-900 transition-all active:scale-95 shadow-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AIChat;
