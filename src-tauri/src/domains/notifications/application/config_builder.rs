//! Configuration building logic for the Notifications bounded context.
//!
//! Converts the flat DTO fields from [`UpdateNotificationConfigRequest`] into
//! the strongly-typed domain model [`NotificationConfig`], keeping provider
//! string → enum mapping out of the IPC layer.

use crate::domains::notifications::application::UpdateNotificationConfigRequest;
use crate::domains::notifications::domain::models::notification::{
    EmailConfig, EmailProvider, NotificationConfig, SmsConfig, SmsProvider,
};

/// Build a [`NotificationConfig`] from the incoming request DTO.
///
/// Returns `Err` with a human-readable message when provider strings are invalid.
pub fn build_notification_config(
    config: &UpdateNotificationConfigRequest,
) -> Result<NotificationConfig, String> {
    let email_config =
        if let (Some(provider), Some(api_key), Some(from_email), Some(from_name)) = (
            config.email_provider.as_deref(),
            config.email_api_key.as_deref(),
            config.email_from_email.as_deref(),
            config.email_from_name.as_deref(),
        ) {
            let email_provider = match provider {
                "sendgrid" => EmailProvider::SendGrid,
                "mailgun" => EmailProvider::Mailgun,
                "smtp" => EmailProvider::Smtp,
                _ => return Err("Invalid email provider".to_string()),
            };

            Some(EmailConfig {
                provider: email_provider,
                api_key: api_key.to_owned(),
                from_email: from_email.to_owned(),
                from_name: from_name.to_owned(),
            })
        } else {
            None
        };

    let sms_config = if let (Some(provider), Some(api_key), Some(from_number)) = (
        config.sms_provider.as_deref(),
        config.sms_api_key.as_deref(),
        config.sms_from_number.as_deref(),
    ) {
        let sms_provider = match provider {
            "twilio" => SmsProvider::Twilio,
            "aws_sns" => SmsProvider::AwsSns,
            _ => return Err("Invalid SMS provider".to_string()),
        };

        Some(SmsConfig {
            provider: sms_provider,
            api_key: api_key.to_owned(),
            from_number: from_number.to_owned(),
        })
    } else {
        None
    };

    Ok(NotificationConfig {
        email: email_config,
        sms: sms_config,
        push_enabled: config.push_enabled.unwrap_or(true),
        quiet_hours_start: config.quiet_hours_start.clone(),
        quiet_hours_end: config.quiet_hours_end.clone(),
        timezone: config
            .timezone
            .clone()
            .unwrap_or_else(|| "Europe/Paris".to_string()),
    })
}
