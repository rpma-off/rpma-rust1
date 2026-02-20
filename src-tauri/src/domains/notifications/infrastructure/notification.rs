//! Notification service for sending emails, SMS, and push notifications

use crate::models::notification::{
    EmailConfig, EmailProvider, NotificationChannel, NotificationConfig, NotificationMessage,
    NotificationPriority, NotificationTemplate, NotificationType, SmsConfig, SmsProvider,
    TemplateVariables,
};
use chrono::Utc;
use chrono_tz::Europe;
use reqwest::Client;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::warn;

#[derive(Clone)]
pub struct NotificationService {
    config: Arc<Mutex<NotificationConfig>>,
    http_client: Client,
    templates: Arc<Mutex<HashMap<String, NotificationTemplate>>>,
}

impl NotificationService {
    pub fn new(config: NotificationConfig) -> Self {
        let mut templates = HashMap::new();

        // Initialize default templates
        Self::initialize_default_templates(&mut templates);

        Self {
            config: Arc::new(Mutex::new(config)),
            http_client: Client::new(),
            templates: Arc::new(Mutex::new(templates)),
        }
    }

    pub async fn update_config(&self, config: NotificationConfig) {
        let mut current_config = self.config.lock().await;
        *current_config = config;
    }

    pub async fn send_notification(
        &self,
        user_id: String,
        notification_type: NotificationType,
        recipient: String,
        variables: TemplateVariables,
    ) -> Result<(), String> {
        // Check if notifications are enabled for this type and user preferences
        if !self.should_send_notification(&notification_type).await {
            return Ok(());
        }

        // Check quiet hours
        if self.is_quiet_hours().await {
            return Ok(());
        }

        // Get template
        let template = self
            .get_template(&notification_type, &NotificationChannel::Email)
            .await
            .ok_or_else(|| {
                format!(
                    "No template found for notification type {:?}",
                    notification_type
                )
            })?;

        // Render template
        let (subject, body) = self.render_template(&template, &variables)?;

        // Create notification message
        let message = NotificationMessage::new(
            user_id,
            notification_type.clone(),
            NotificationChannel::Email,
            recipient.clone(),
            Some(subject),
            body,
            NotificationPriority::Normal,
        );

        // Try email first, then SMS if configured and email fails
        let email_result = if let Some(email_config) = &self.get_config().await.email {
            self.send_email(email_config, &message).await
        } else {
            Err("Email not configured".to_string())
        };

        if email_result.is_err() {
            warn!("Email failed, trying SMS: {:?}", email_result);
            if let Some(sms_config) = &self.get_config().await.sms {
                let sms_template = self
                    .get_template(&notification_type, &NotificationChannel::Sms)
                    .await;
                if let Some(sms_template) = sms_template {
                    let sms_body = self.render_template(&sms_template, &variables)?.1;
                    let sms_message = NotificationMessage::new(
                        message.user_id.clone(),
                        notification_type,
                        NotificationChannel::Sms,
                        recipient,
                        None,
                        sms_body,
                        NotificationPriority::Normal,
                    );
                    let _ = self.send_sms(sms_config, &sms_message).await;
                }
            }
        }

        Ok(())
    }

    async fn send_email(
        &self,
        config: &EmailConfig,
        message: &NotificationMessage,
    ) -> Result<(), String> {
        let subject = message.subject.as_ref().ok_or("No subject for email")?;

        match config.provider {
            EmailProvider::SendGrid => {
                self.send_sendgrid_email(config, &message.recipient, subject, &message.body)
                    .await
            }
            EmailProvider::Mailgun => {
                self.send_mailgun_email(config, &message.recipient, subject, &message.body)
                    .await
            }
            EmailProvider::Smtp => Err("SMTP not implemented yet".to_string()),
        }
    }

    async fn send_sendgrid_email(
        &self,
        config: &EmailConfig,
        to: &str,
        subject: &str,
        body: &str,
    ) -> Result<(), String> {
        let url = "https://api.sendgrid.com/v3/mail/send";
        let payload = json!({
            "personalizations": [{
                "to": [{"email": to}]
            }],
            "from": {"email": config.from_email, "name": config.from_name},
            "subject": subject,
            "content": [{"type": "text/html", "value": body}]
        });

        let response = self
            .http_client
            .post(url)
            .header("Authorization", format!("Bearer {}", config.api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(format!("SendGrid API error: {}", error_text))
        }
    }

    async fn send_mailgun_email(
        &self,
        config: &EmailConfig,
        to: &str,
        subject: &str,
        body: &str,
    ) -> Result<(), String> {
        let domain = config
            .from_email
            .split('@')
            .nth(1)
            .ok_or("Invalid from_email format")?;
        let url = format!("https://api.mailgun.net/v3/{}/messages", domain);

        let params = [
            (
                "from",
                format!("{} <{}>", config.from_name, config.from_email),
            ),
            ("to", to.to_string()),
            ("subject", subject.to_string()),
            ("html", body.to_string()),
        ];

        let response = self
            .http_client
            .post(&url)
            .basic_auth("api", Some(&config.api_key))
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(format!("Mailgun API error: {}", error_text))
        }
    }

    async fn send_sms(
        &self,
        config: &SmsConfig,
        message: &NotificationMessage,
    ) -> Result<(), String> {
        match config.provider {
            SmsProvider::Twilio => {
                self.send_twilio_sms(config, &message.recipient, &message.body)
                    .await
            }
            SmsProvider::AwsSns => Err("AWS SNS not implemented yet".to_string()),
        }
    }

    async fn send_twilio_sms(
        &self,
        config: &SmsConfig,
        to: &str,
        body: &str,
    ) -> Result<(), String> {
        let url = format!(
            "https://api.twilio.com/2010-04-01/Accounts/{}/Messages.json",
            config.api_key.split(':').next().unwrap_or("")
        );

        let auth = config.api_key.split(':').collect::<Vec<&str>>();
        if auth.len() != 2 {
            return Err("Invalid Twilio API key format".to_string());
        }

        let params = [
            ("From", config.from_number.as_str()),
            ("To", to),
            ("Body", body),
        ];

        let response = self
            .http_client
            .post(&url)
            .basic_auth(auth[0], Some(auth[1]))
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(format!("Twilio API error: {}", error_text))
        }
    }

    async fn should_send_notification(&self, notification_type: &NotificationType) -> bool {
        // This would check user preferences from database
        // For now, return true for all types
        match notification_type {
            NotificationType::TaskAssignment => true,
            NotificationType::TaskUpdate => true,
            NotificationType::TaskCompletion => true,
            NotificationType::StatusChange => true,
            NotificationType::OverdueWarning => true,
            NotificationType::SystemAlert => true,
            NotificationType::NewAssignment => true,
            NotificationType::DeadlineReminder => true,
            NotificationType::QualityApproval => true,
        }
    }

    async fn is_quiet_hours(&self) -> bool {
        let config = self.get_config().await;
        let now = Utc::now().with_timezone(&Europe::Paris);

        if let (Some(start), Some(end)) = (&config.quiet_hours_start, &config.quiet_hours_end) {
            let start_time = chrono::NaiveTime::parse_from_str(start, "%H:%M").unwrap_or(
                chrono::NaiveTime::from_hms_opt(22, 0, 0).expect("22:00:00 is a valid time"),
            );
            let end_time = chrono::NaiveTime::parse_from_str(end, "%H:%M").unwrap_or(
                chrono::NaiveTime::from_hms_opt(8, 0, 0).expect("08:00:00 is a valid time"),
            );

            let current_time = now.time();
            if start_time <= end_time {
                current_time >= start_time && current_time <= end_time
            } else {
                current_time >= start_time || current_time <= end_time
            }
        } else {
            false
        }
    }

    async fn get_template(
        &self,
        notification_type: &NotificationType,
        channel: &NotificationChannel,
    ) -> Option<NotificationTemplate> {
        let templates = self.templates.lock().await;
        templates
            .values()
            .find(|t| {
                t.notification_type == *notification_type && t.channel == *channel && t.is_active
            })
            .cloned()
    }

    fn render_template(
        &self,
        template: &NotificationTemplate,
        variables: &TemplateVariables,
    ) -> Result<(String, String), String> {
        let mut subject = template.subject_template.clone();
        let mut body = template.body_template.clone();

        // Simple variable substitution - in production, use a proper template engine
        let var_map = self.variables_to_map(variables);

        for (key, value) in &var_map {
            let placeholder = format!("{{{{{}}}}}", key);
            subject = subject.replace(&placeholder, value);
            body = body.replace(&placeholder, value);
        }

        Ok((subject, body))
    }

    fn variables_to_map(&self, variables: &TemplateVariables) -> HashMap<String, String> {
        let mut map = HashMap::new();

        if let Some(ref v) = variables.user_name {
            map.insert("user_name".to_string(), v.clone());
        }
        if let Some(ref v) = variables.task_title {
            map.insert("task_title".to_string(), v.clone());
        }
        if let Some(ref v) = variables.task_id {
            map.insert("task_id".to_string(), v.clone());
        }
        if let Some(ref v) = variables.client_name {
            map.insert("client_name".to_string(), v.clone());
        }
        if let Some(ref v) = variables.due_date {
            map.insert("due_date".to_string(), v.clone());
        }
        if let Some(ref v) = variables.status {
            map.insert("status".to_string(), v.clone());
        }
        if let Some(ref v) = variables.priority {
            map.insert("priority".to_string(), v.clone());
        }
        if let Some(ref v) = variables.assignee_name {
            map.insert("assignee_name".to_string(), v.clone());
        }
        if let Some(ref v) = variables.system_message {
            map.insert("system_message".to_string(), v.clone());
        }

        map
    }

    pub async fn get_config(&self) -> NotificationConfig {
        self.config.lock().await.clone()
    }

    fn initialize_default_templates(templates: &mut HashMap<String, NotificationTemplate>) {
        // Task Assignment Email
        let task_assignment_email = NotificationTemplate::new(
            "task-assignment-email".to_string(),
            "Task Assignment Email".to_string(),
            NotificationType::TaskAssignment,
            NotificationChannel::Email,
            "Nouvelle tÃƒÂ¢che assignÃƒÂ©e: {{task_title}}".to_string(),
            r#"
            <h2>Bonjour {{user_name}},</h2>
            <p>Une nouvelle tÃƒÂ¢che vous a ÃƒÂ©tÃƒÂ© assignÃƒÂ©e:</p>
            <ul>
                <li><strong>TÃƒÂ¢che:</strong> {{task_title}}</li>
                <li><strong>ID:</strong> {{task_id}}</li>
                <li><strong>Client:</strong> {{client_name}}</li>
                <li><strong>Ãƒâ€°chÃƒÂ©ance:</strong> {{due_date}}</li>
                <li><strong>PrioritÃƒÂ©:</strong> {{priority}}</li>
            </ul>
            <p>Veuillez vous connecter ÃƒÂ  l'application pour consulter les dÃƒÂ©tails.</p>
            <p>Cordialement,<br>L'ÃƒÂ©quipe RPMA</p>
            "#
            .to_string(),
            vec![
                "user_name".to_string(),
                "task_title".to_string(),
                "task_id".to_string(),
                "client_name".to_string(),
                "due_date".to_string(),
                "priority".to_string(),
            ],
        );
        templates.insert(task_assignment_email.id.clone(), task_assignment_email);

        // Task Assignment SMS
        let task_assignment_sms = NotificationTemplate::new(
            "task-assignment-sms".to_string(),
            "Task Assignment SMS".to_string(),
            NotificationType::TaskAssignment,
            NotificationChannel::Sms,
            "".to_string(),
            "Nouvelle tÃƒÂ¢che: {{task_title}} - Ãƒâ€°chÃƒÂ©ance: {{due_date}}".to_string(),
            vec!["task_title".to_string(), "due_date".to_string()],
        );
        templates.insert(task_assignment_sms.id.clone(), task_assignment_sms);

        // Add more templates as needed...
    }
}
