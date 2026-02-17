'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMessage } from '@/hooks/useMessage';
import type { Message, MessageQuery } from '@/lib/backend';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Mail, MessageSquare, Users, Search } from 'lucide-react';

interface MessageInboxProps {
  userId?: string;
}

export function MessageInbox({ userId }: MessageInboxProps) {
  const [query, setQuery] = useState<MessageQuery>({
    message_type: null,
    sender_id: null,
    recipient_id: userId || null,
    task_id: null,
    client_id: null,
    status: null,
    priority: null,
    date_from: null,
    date_to: null,
    limit: 50,
    offset: null,
    correlation_id: null,
  });
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const { messages, loading, error, total, hasMore: _hasMore, fetchMessages, markAsRead } = useMessage();

  useEffect(() => {
    if (userId) {
      setQuery((prev: MessageQuery) => ({ ...prev, recipient_id: userId }));
      fetchMessages({ ...query, recipient_id: userId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, fetchMessages]);

  const handleMessageClick = async (message: Message) => {
    setSelectedMessage(message);
    if (message.status !== 'read') {
      await markAsRead(message.id);
    }
  };

  const getMessageIcon = (messageType: string) => {
    switch (messageType) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'in_app':
        return <Users className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'read':
        return <Badge variant="secondary">Lu</Badge>;
      case 'sent':
        return <Badge variant="default">Envoyé</Badge>;
      case 'delivered':
        return <Badge variant="default">Livré</Badge>;
      case 'failed':
        return <Badge variant="destructive">Échec</Badge>;
      default:
        return <Badge variant="outline">En attente</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="destructive">Élevé</Badge>;
      case 'normal':
        return <Badge variant="default">Normal</Badge>;
      case 'low':
        return <Badge variant="secondary">Faible</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* Message List */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Messages ({total})</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMessages(query)}
            >
              Actualiser
            </Button>
          </CardTitle>

          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les messages..."
                className="pl-9"
                onChange={(_e) => {
                  // Implement search
                }}
              />
            </div>
            <Select
              onValueChange={(value) => {
                setQuery((prev: MessageQuery) => ({ ...prev, message_type: value === 'all' ? null : value }));
                fetchMessages({ ...query, message_type: value === 'all' ? null : value });
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="in_app">In-App</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) => {
                setQuery((prev: MessageQuery) => ({ ...prev, status: value === 'all' ? null : value }));
                fetchMessages({ ...query, status: value === 'all' ? null : value });
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="sent">Envoyé</SelectItem>
                <SelectItem value="read">Lu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="p-4 text-center">Chargement...</div>
            ) : error ? (
              <div className="p-4 text-center text-destructive">{error}</div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Aucun message trouvé
              </div>
            ) : (
              <div className="divide-y">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedMessage?.id === message.id ? 'bg-muted' : ''
                    } ${message.status !== 'read' ? 'bg-blue-50/50' : ''}`}
                    onClick={() => handleMessageClick(message)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getMessageIcon(message.message_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {message.subject && (
                            <h4 className="font-medium truncate">{message.subject}</h4>
                          )}
                          {getPriorityBadge(message.priority)}
                          {getStatusBadge(message.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {message.body}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>
                            {message.created_at
                              ? formatDistanceToNow(new Date(Number(message.created_at) * 1000), {
                                  addSuffix: true,
                                  locale: fr
                                })
                              : 'Date inconnue'
                            }
                          </span>
                          {message.sender_id && (
                            <span>• Expéditeur: {message.sender_id}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Message Detail */}
      {selectedMessage && (
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getMessageIcon(selectedMessage.message_type)}
              <span className="truncate">
                {selectedMessage.subject || 'Message'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getPriorityBadge(selectedMessage.priority)}
                {getStatusBadge(selectedMessage.status)}
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Envoyé {selectedMessage.created_at
                  ? formatDistanceToNow(new Date(Number(selectedMessage.created_at) * 1000), {
                      addSuffix: true,
                      locale: fr
                    })
                  : 'à une date inconnue'
                }</p>
                {selectedMessage.sender_id && (
                  <p>De: {selectedMessage.sender_id}</p>
                )}
              </div>

              <div className="border rounded p-3 bg-muted/50">
                <pre className="whitespace-pre-wrap text-sm">
                  {selectedMessage.body}
                </pre>
              </div>

              {selectedMessage.error_message && (
                <div className="border border-destructive/50 rounded p-3 bg-destructive/10">
                  <p className="text-sm font-medium text-destructive">Erreur de livraison:</p>
                  <p className="text-sm text-destructive">{selectedMessage.error_message}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
