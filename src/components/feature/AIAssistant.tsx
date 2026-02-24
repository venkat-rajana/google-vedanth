import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User as UserIcon } from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { useAuthStore } from '../../store/auth';
import { cn } from '../../lib/utils';
import Markdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const MAX_MESSAGES = 20;
  const messageCount = messages.filter(m => m.role === 'user').length;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || messageCount >= MAX_MESSAGES) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const responseText = await geminiService.chat(userMsg.text, history);
      
      const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: 'Sorry, I encountered an error processing your request.' };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-teal-600 text-white rounded-full shadow-xl hover:bg-teal-700 transition-transform hover:scale-105 z-50 flex items-center gap-2"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="font-medium hidden md:inline">Vedanth AI</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-teal-600 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">Vedanth AI</h3>
                <p className="text-xs text-teal-100">Medical Practice Assistant</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-teal-700 rounded-md transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-10">
                <Bot className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Hi {user.name.split(' ')[0]}, how can I help you today?</p>
              </div>
            )}
            
            {messages.map(msg => (
              <div key={msg.id} className={cn("flex gap-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-teal-600" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                  msg.role === 'user' 
                    ? "bg-teal-600 text-white rounded-tr-sm" 
                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                )}>
                  {msg.role === 'model' ? (
                    <div className="markdown-body prose prose-sm prose-teal max-w-none">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-gray-500" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-teal-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-200">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-gray-500">{messageCount}/{MAX_MESSAGES} messages used</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={messageCount >= MAX_MESSAGES ? "Message limit reached" : "Type a message..."}
                disabled={isLoading || messageCount >= MAX_MESSAGES}
                className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 rounded-full px-4 py-2 text-sm transition-all disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || messageCount >= MAX_MESSAGES}
                className="p-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
