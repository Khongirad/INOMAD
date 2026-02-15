'use client';

import * as React from 'react';
import { MessageSquare, Plus, Search, Users, Send, ArrowLeft, Hash, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  name: string | null;
  type: string;
  participants: { user: { id: string; username: string } }[];
  messages: { id: string; body: string; sender: { id: string; username: string }; createdAt: string }[];
  updatedAt: string;
}

interface Message {
  id: string;
  body: string;
  sender: { id: string; username: string };
  createdAt: string;
  isEdited: boolean;
  replyToId: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  React.useEffect(() => {
    fetchConversations();
  }, []);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations`, { headers });
      if (res.ok) setConversations(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/messages/${convId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.reverse());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectConversation = (convId: string) => {
    setSelectedConv(convId);
    fetchMessages(convId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;

    try {
      const res = await fetch(`${API_BASE}/api/messages/${selectedConv}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body: newMessage }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setNewMessage('');
      } else {
        toast.error('Error отправки');
      }
    } catch (e) {
      toast.error('Error сети');
    }
  };

  const getConvName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    if (conv.type === 'DIRECT_MESSAGE') {
      const other = conv.participants.find((p) => p.user.id !== user?.userId);
      return other?.user.username || 'Unknown';
    }
    return 'Chat';
  };

  const getConvIcon = (type: string) => {
    switch (type) {
      case 'DIRECT_MESSAGE': return <Lock className="h-4 w-4 text-zinc-500" />;
      case 'ORG_CHANNEL': return <Hash className="h-4 w-4 text-amber-500" />;
      default: return <Users className="h-4 w-4 text-blue-500" />;
    }
  };

  const filteredConvs = conversations.filter((c) =>
    getConvName(c).toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar — Conversation List */}
      <div className={cn(
        "w-80 border-r border-white/5 flex flex-col bg-zinc-950",
        selectedConv && "hidden md:flex"
      )}>
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-500" />
              Messages
            </h2>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 h-8">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900 border-white/10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading...</div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No сообщений</p>
              <p className="text-zinc-600 text-xs mt-1">Начните разговор</p>
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-white/5 hover:bg-zinc-900/50 transition-colors",
                  selectedConv === conv.id && "bg-amber-950/20 border-l-2 border-l-amber-500"
                )}
              >
                <div className="flex items-center gap-3">
                  {getConvIcon(conv.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white truncate">
                      {getConvName(conv)}
                    </div>
                    {conv.messages[0] && (
                      <div className="text-xs text-zinc-500 truncate mt-0.5">
                        {conv.messages[0].body}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main — Message Thread */}
      <div className={cn(
        "flex-1 flex flex-col",
        !selectedConv && "hidden md:flex"
      )}>
        {selectedConv ? (
          <>
            {/* Thread Header */}
            <div className="h-14 border-b border-white/5 flex items-center gap-3 px-4 bg-zinc-950/50">
              <button
                onClick={() => setSelectedConv(null)}
                className="md:hidden p-1 text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h3 className="font-medium text-white text-sm">
                  {conversations.find((c) => c.id === selectedConv)
                    ? getConvName(conversations.find((c) => c.id === selectedConv)!)
                    : 'Chat'}
                </h3>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender.id === user?.userId;
                return (
                  <div
                    key={msg.id}
                    className={cn("flex", isMe ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2",
                        isMe
                          ? "bg-amber-700/60 text-white rounded-br-md"
                          : "bg-zinc-800 text-zinc-100 rounded-bl-md"
                      )}
                    >
                      {!isMe && (
                        <div className="text-xs font-medium text-amber-400 mb-1">
                          {msg.sender.username}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <div className="text-[10px] text-zinc-400 mt-1 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {msg.isEdited && ' (ред.)'}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/5 p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Написать сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="bg-zinc-900 border-white/10"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <MessageSquare className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Select чат</h3>
              <p className="text-zinc-400 max-w-sm">
                Select существующий разговор or начните new.
                Чаты работают for организаций, квестов, courtебных дел и прямых сообщений.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
