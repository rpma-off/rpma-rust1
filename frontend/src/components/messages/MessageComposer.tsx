'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMessage, useMessageTemplates } from '@/hooks/useMessage';
import type { SendMessageRequest, MessageTemplate } from '@/lib/backend';
import { toast } from 'sonner';
import { Send, FileText, Users, Mail, MessageSquare } from 'lucide-react';

interface MessageComposerProps {
  onMessageSent?: () => void;
  defaultRecipient?: {
    id?: string;
    email?: string;
    phone?: string;
    name?: string;
  };
  taskId?: string;
  clientId?: string;
}

export function MessageComposer({
  onMessageSent,
  defaultRecipient,
  taskId,
  clientId
}: MessageComposerProps) {
  const [messageType, setMessageType] = useState<'email' | 'sms' | 'in_app'>('email');
  const [recipientId, setRecipientId] = useState(defaultRecipient?.id || '');
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipient?.email || '');
  const [recipientPhone, setRecipientPhone] = useState(defaultRecipient?.phone || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  const { sendMessage } = useMessage();
  const { templates } = useMessageTemplates();

  // Filter templates by message type
  const availableTemplates = templates.filter(t => t.message_type === messageType);

  // Load template content
  const loadTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setSubject(template.subject || '');
    setBody(template.body);

    // Parse variables and show placeholders
    if (template.variables) {
      try {
        const variables = JSON.parse(template.variables);
        if (Array.isArray(variables)) {
          let templateBody = template.body;
          variables.forEach((variable: string) => {
            templateBody = templateBody.replace(
              new RegExp(`{{${variable}}}`, 'g'),
              `[${variable.toUpperCase()}]`
            );
          });
          setBody(templateBody);
        }
      } catch (e) {
        // Variables not valid JSON, use as-is
      }
    }
  };

  // Handle form submission
  const handleSend = async () => {
    if (!body.trim()) {
      toast.error('Le corps du message est obligatoire');
      return;
    }

    if (messageType === 'email' && !recipientEmail.trim()) {
      toast.error('L'adresse e-mail est obligatoire');
      return;
    }

    if (messageType === 'sms' && !recipientPhone.trim()) {
      toast.error('Le numéro de téléphone est obligatoire');
      return;
    }

    if (messageType === 'in_app' && !recipientId.trim()) {
      toast.error('Le destinataire est obligatoire');
      return;
    }

    const request: SendMessageRequest = {
      message_type: messageType,
      recipient_id: recipientId || null,
      recipient_email: recipientEmail || null,
      recipient_phone: recipientPhone || null,
      subject: subject || null,
      body,
      template_id: selectedTemplate?.id || null,
      task_id: taskId || null,
      client_id: clientId || null,
      priority,
      scheduled_at: null,
    };

    const result = await sendMessage(request);
    if (result.success) {
      // Reset form
      setSubject('');
      setBody('');
      setSelectedTemplate(null);
      onMessageSent?.();
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Compose Message
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={messageType} onValueChange={(value) => setMessageType(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="in_app" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              In-App
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Message subject"
              />
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="in_app" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recipient">Recipient</Label>
                <Input
                  id="recipient"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  placeholder="User ID"
                />
                {defaultRecipient?.name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Sending to: {defaultRecipient.name}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Template Selection */}
          {availableTemplates.length > 0 && (
            <div className="space-y-2">
              <Label>Templates</Label>
              <Select onValueChange={(templateId) => {
                const template = availableTemplates.find(t => t.id === templateId);
                if (template) loadTemplate(template);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {template.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <Badge variant="secondary" className="w-fit">
                  Using template: {selectedTemplate.name}
                </Badge>
              )}
            </div>
          )}

          {/* Message Body */}
          <div>
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
              className="resize-none"
            />
            {messageType === 'sms' && (
              <p className="text-sm text-muted-foreground mt-1">
                {body.length}/160 characters
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSubject('');
                setBody('');
                setSelectedTemplate(null);
              }}
            >
              Clear
            </Button>
            <Button onClick={handleSend}>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}