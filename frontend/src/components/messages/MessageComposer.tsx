'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMessage, useMessageTemplates } from '@/hooks/useMessage';
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();

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
      } catch (_e) {
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
      toast.error('L\'adresse e-mail est obligatoire');
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
      correlation_id: null,
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
          {t('messages.composeMessage')}
        </CardTitle>
      </CardHeader>
      <CardContent>
          <Tabs value={messageType} onValueChange={(value) => setMessageType(value as 'email' | 'sms' | 'in_app')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('messages.emailAddress').split(':')[0]}
              </TabsTrigger>
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="in_app" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('misc.application')}
              </TabsTrigger>
            </TabsList>

          <TabsContent value="email" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">{t('messages.emailAddress')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="destinataire@exemple.com"
                />
              </div>
              <div>
                <Label htmlFor="priority">{t('messages.priority')}</Label>
                <Select value={priority} onValueChange={(value: string) => setPriority(value as "low" | "normal" | "high" | "urgent")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('messages.low')}</SelectItem>
                    <SelectItem value="normal">{t('messages.normal')}</SelectItem>
                    <SelectItem value="high">{t('messages.high')}</SelectItem>
                    <SelectItem value="urgent">{t('messages.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="subject">{t('messages.subject')}</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('messages.messageSubject')}
              />
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">{t('messages.phoneNumber')}</Label>
                <Input
                  id="phone"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+33612345678"
                />
              </div>
              <div>
                <Label htmlFor="priority">{t('messages.priority')}</Label>
                <Select value={priority} onValueChange={(value: string) => setPriority(value as "low" | "normal" | "high" | "urgent")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('messages.low')}</SelectItem>
                    <SelectItem value="normal">{t('messages.normal')}</SelectItem>
                    <SelectItem value="high">{t('messages.high')}</SelectItem>
                    <SelectItem value="urgent">{t('messages.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="in_app" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recipient">{t('messages.recipient')}</Label>
                <Input
                  id="recipient"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  placeholder={t('messages.userId')}
                />
                {defaultRecipient?.name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('messages.sendingTo')} {defaultRecipient.name}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="priority">{t('messages.priority')}</Label>
                <Select value={priority} onValueChange={(value: string) => setPriority(value as "low" | "normal" | "high" | "urgent")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('messages.low')}</SelectItem>
                    <SelectItem value="normal">{t('messages.normal')}</SelectItem>
                    <SelectItem value="high">{t('messages.high')}</SelectItem>
                    <SelectItem value="urgent">{t('messages.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Template Selection */}
          {availableTemplates.length > 0 && (
            <div className="space-y-2">
              <Label>{t('messages.templates')}</Label>
              <Select onValueChange={(templateId) => {
                const template = availableTemplates.find(t => t.id === templateId);
                if (template) loadTemplate(template);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('messages.selectTemplateOptional')} />
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
                  {t('messages.usingTemplate')} {selectedTemplate.name}
                </Badge>
              )}
            </div>
          )}

          {/* Message Body */}
          <div>
            <Label htmlFor="body">{t('messages.message')}</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('messages.typeYourMessage')}
              rows={6}
              className="resize-none"
            />
            {messageType === 'sms' && (
              <p className="text-sm text-muted-foreground mt-1">
                {body.length}/160 {t('messages.characters')}
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
              {t('common.clear')}
            </Button>
            <Button onClick={handleSend}>
              <Send className="h-4 w-4 mr-2" />
              {t('messages.sendMessage')}
            </Button>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
