'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Send, FileText } from 'lucide-react';
import type { SendMessageRequest, MessageTemplate } from '@/lib/backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { useMessages, useMessageTemplates } from '../api/useMessages';

interface MessageComposerProps {
  onMessageSent?: () => void;
  defaultRecipient?: {
    id?: string;
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
  const [recipientId, setRecipientId] = useState(defaultRecipient?.id || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  const { sendMessage } = useMessages();
  const { templates } = useMessageTemplates();
  const { t } = useTranslation();

  const availableTemplates = templates.filter((t: MessageTemplate) => t.message_type === 'in_app');

  const loadTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setSubject(template.subject || '');
    setBody(template.body);

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

  const handleSend = async () => {
    if (!body.trim()) {
      toast.error('Le corps du message est obligatoire');
      return;
    }

    if (!recipientId.trim()) {
      toast.error('Le destinataire est obligatoire');
      return;
    }

    const request: SendMessageRequest = {
      message_type: 'in_app',
      recipient_id: recipientId || null,
      recipient_email: null,
      recipient_phone: null,
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
      <CardContent className="space-y-4">
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
            <Select value={priority} onValueChange={(value: string) => setPriority(value as 'low' | 'normal' | 'high' | 'urgent')}>
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

        {/* Template Selection */}
        {availableTemplates.length > 0 && (
          <div className="space-y-2">
            <Label>{t('messages.templates')}</Label>
            <Select onValueChange={(templateId) => {
              const template = availableTemplates.find((t: MessageTemplate) => t.id === templateId);
              if (template) loadTemplate(template);
            }}>
              <SelectTrigger>
                <SelectValue placeholder={t('messages.selectTemplateOptional')} />
              </SelectTrigger>
              <SelectContent>
                {availableTemplates.map((template: MessageTemplate) => (
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
      </CardContent>
    </Card>
  );
}
