//! HTML report template for PPF intervention reports.
//!
//! `render_report_html` generates a self-contained HTML document (inline CSS only)
//! from a [`ReportViewModel`]. The output is intended to be converted to PDF by a
//! headless browser via [`headless_chrome`].

use super::report_view_model::{severity_label, ReportStep, ReportViewModel};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/// Render a complete, self-contained HTML report from the view model.
///
/// All CSS is inline or inside a `<style>` block in `<head>` — no external
/// resources are required at render time.
pub fn render_report_html(vm: &ReportViewModel) -> String {
    let mut html = String::with_capacity(64 * 1024);

    html.push_str(HTML_PREAMBLE);
    push_header(&mut html, vm);
    push_summary(&mut html, vm);
    push_client_vehicle(&mut html, vm);
    push_work_conditions(&mut html, vm);
    push_materials(&mut html, vm);
    push_workflow_steps(&mut html, vm);
    push_quality(&mut html, vm);
    push_customer_validation(&mut html, vm);
    push_footer(&mut html, vm);
    html.push_str("</body></html>");

    html
}

// ---------------------------------------------------------------------------
// HTML preamble (doctype + head + CSS)
// ---------------------------------------------------------------------------

const HTML_PREAMBLE: &str = r#"<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rapport d'Intervention PPF</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; }
  .header { background: #1e3a5f; color: #fff; padding: 28px 32px 22px; }
  .header .logo { font-size: 28px; font-weight: 900; letter-spacing: 3px; color: #4a9eff; }
  .header h1 { font-size: 20px; font-weight: 700; margin-top: 8px; text-transform: uppercase; }
  .header .meta { font-size: 12px; margin-top: 8px; color: #b8d4f0; }
  .section { margin: 20px 28px 0; }
  .section-title {
    font-size: 13px; font-weight: 700; text-transform: uppercase;
    color: #1e3a5f; border-bottom: 2px solid #1e3a5f;
    padding-bottom: 4px; margin-bottom: 12px; letter-spacing: 0.5px;
  }
  .card {
    background: #fff; border-left: 4px solid #1e3a5f;
    box-shadow: 0 1px 4px rgba(0,0,0,.08);
    padding: 12px 16px; margin-bottom: 12px; border-radius: 0 4px 4px 0;
  }
  .card-alt { border-left-color: #2a7a4f; }
  table.kv { width: 100%; border-collapse: collapse; }
  table.kv td { padding: 3px 6px; vertical-align: top; }
  table.kv td:first-child { font-weight: 600; color: #444; width: 38%; }
  table.data { width: 100%; border-collapse: collapse; font-size: 12px; }
  table.data th { background: #1e3a5f; color: #fff; padding: 5px 8px; text-align: left; font-weight: 600; }
  table.data td { padding: 4px 8px; border-bottom: 1px solid #e8e8e8; }
  table.data tr:nth-child(even) td { background: #f5f7fa; }
  .step-header { background: #f0f4f9; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px; }
  .step-title { font-size: 14px; font-weight: 700; color: #1e3a5f; }
  .badge {
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 11px; font-weight: 700; margin-left: 8px; vertical-align: middle;
  }
  .badge-completed { background: #d1fae5; color: #059669; }
  .badge-in_progress { background: #fef3c7; color: #d97706; }
  .badge-pending { background: #e5e7eb; color: #6b7280; }
  .badge-rejected { background: #fee2e2; color: #dc2626; }
  .severity-high { background: #fee2e2; color: #dc2626; }
  .severity-medium { background: #fef3c7; color: #d97706; }
  .severity-low { background: #d1fae5; color: #059669; }
  .sub-title { font-weight: 700; margin: 10px 0 6px; font-size: 12px; color: #333; }
  .checklist-item { padding: 2px 0; font-size: 12px; }
  .check-y { color: #059669; font-weight: 700; }
  .check-n { color: #9ca3af; }
  .footer {
    background: #f0f4f9; margin-top: 28px; padding: 12px 32px;
    font-size: 11px; color: #6b7280; border-top: 2px solid #1e3a5f;
  }
  @media print {
    body { font-size: 12px; }
    .section { margin: 16px 20px 0; }
    .header { padding: 20px 24px 16px; }
  }
</style>
</head>
<body>
"#;

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

fn push_header(out: &mut String, vm: &ReportViewModel) {
    out.push_str(r#"<div class="header">"#);
    out.push_str(r#"<div class="logo">RPMA</div>"#);
    out.push_str(r#"<h1>RAPPORT D'INTERVENTION PPF</h1>"#);
    out.push_str(r#"<div class="meta">"#);
    out.push_str(&format!(
        "Intervention&nbsp;: <strong>{}</strong>&nbsp;&nbsp;|&nbsp;&nbsp;",
        esc(&vm.meta.intervention_id)
    ));
    if vm.meta.task_number != vm.display.placeholder_not_specified {
        out.push_str(&format!(
            "Tâche&nbsp;: <strong>{}</strong>&nbsp;&nbsp;|&nbsp;&nbsp;",
            esc(&vm.meta.task_number)
        ));
    }
    out.push_str(&format!("Généré le {}", esc(&vm.meta.generated_at)));
    out.push_str("</div></div>\n");
}

fn push_summary(out: &mut String, vm: &ReportViewModel) {
    section_open(out, "Résumé de l'intervention");
    out.push_str(r#"<div class="card"><table class="kv">"#);
    let completion = format!("{:.1}%", vm.summary.completion_percentage);
    // The badge already contains the French label — do not append vm.summary.status
    // (which is the raw enum label) or it will render twice (BUG-1).
    kv_row(out, "Statut", &badge_status(&vm.summary.status_badge));
    kv_row(out, "Technicien", &esc(&vm.summary.technician_name));
    kv_row(out, "Type", &esc(&vm.summary.intervention_type));
    kv_row(out, "Durée estimée", &esc(&vm.summary.estimated_duration));
    kv_row(out, "Durée réelle", &esc(&vm.summary.actual_duration));
    kv_row(out, "Progression", &completion);
    out.push_str("</table></div>\n");
    section_close(out);
}

fn push_client_vehicle(out: &mut String, vm: &ReportViewModel) {
    section_open(out, "Client &amp; Véhicule");
    out.push_str(r#"<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">"#);

    // Client card
    out.push_str(r#"<div class="card">"#);
    out.push_str(r#"<div class="sub-title">Client</div>"#);
    out.push_str(r#"<table class="kv">"#);
    kv_row(out, "Nom", &esc(&vm.client.name));
    kv_row(out, "Email", &esc(&vm.client.email));
    kv_row(out, "Téléphone", &esc(&vm.client.phone));
    out.push_str("</table></div>\n");

    // Vehicle card
    out.push_str(r#"<div class="card card-alt">"#);
    out.push_str(r#"<div class="sub-title">Véhicule</div>"#);
    out.push_str(r#"<table class="kv">"#);
    kv_row(out, "Plaque", &esc(&vm.vehicle.plate));
    // BUG-2: When both make and model are the placeholder, concatenating them
    // produces "Non renseigne Non renseigne". Use a match to display only what
    // is actually known.
    let ns = &vm.display.placeholder_not_specified;
    let make_val = if &vm.vehicle.make == ns {
        None
    } else {
        Some(vm.vehicle.make.as_str())
    };
    let model_val = if &vm.vehicle.model == ns {
        None
    } else {
        Some(vm.vehicle.model.as_str())
    };
    let make_model = match (make_val, model_val) {
        (Some(make), Some(model)) => format!("{} {}", esc(make), esc(model)),
        (Some(make), None) => esc(make),
        (None, Some(model)) => esc(model),
        (None, None) => esc(ns),
    };
    kv_row(out, "Marque / Modèle", &make_model);
    kv_row(out, "Année", &esc(&vm.vehicle.year));
    kv_row(out, "Couleur", &esc(&vm.vehicle.color));
    kv_row(out, "VIN", &esc(&vm.vehicle.vin));
    out.push_str("</table></div>\n");

    out.push_str("</div>\n");
    section_close(out);
}

fn push_work_conditions(out: &mut String, vm: &ReportViewModel) {
    let wc = &vm.work_conditions;
    if [
        &wc.weather,
        &wc.lighting,
        &wc.location,
        &wc.temperature,
        &wc.humidity,
    ]
    .iter()
    .all(|v| *v == &vm.display.placeholder_not_specified)
    {
        return;
    }
    section_open(out, "Conditions de travail");
    out.push_str(r#"<div class="card"><table class="kv">"#);
    kv_row(out, "Météo", &esc(&wc.weather));
    kv_row(out, "Éclairage", &esc(&wc.lighting));
    kv_row(out, "Lieu", &esc(&wc.location));
    kv_row(out, "Température", &esc(&wc.temperature));
    kv_row(out, "Humidité", &esc(&wc.humidity));
    out.push_str("</table></div>\n");
    section_close(out);
}

fn push_materials(out: &mut String, vm: &ReportViewModel) {
    let m = &vm.materials;
    section_open(out, "Matériaux");
    out.push_str(r#"<div class="card"><table class="kv">"#);
    kv_row(out, "Type de film", &esc(&m.film_type));
    kv_row(out, "Marque", &esc(&m.film_brand));
    kv_row(out, "Modèle", &esc(&m.film_model));
    out.push_str("</table></div>\n");
    if !m.consumptions.is_empty() {
        out.push_str(r#"<table class="data"><thead><tr>"#);
        out.push_str("<th>Réf. matériau</th><th>Qté utilisée</th><th>Coût total</th><th>Déchets</th><th>Notes qualité</th>");
        out.push_str("</tr></thead><tbody>");
        for c in &m.consumptions {
            out.push_str("<tr>");
            td(out, &esc(&c.material_id));
            td(out, &format!("{:.3}", c.quantity_used));
            td(out, &esc(&c.total_cost));
            td(out, &format!("{:.3}", c.waste_quantity));
            td(out, &esc(&c.quality_notes));
            out.push_str("</tr>");
        }
        out.push_str("</tbody></table>\n");
    }
    section_close(out);
}

fn push_workflow_steps(out: &mut String, vm: &ReportViewModel) {
    if vm.steps.is_empty() {
        return;
    }
    section_open(out, "Étapes du workflow");
    for step in &vm.steps {
        push_step(out, step, &vm.display.placeholder_not_specified);
    }
    section_close(out);
}

fn push_step(out: &mut String, step: &ReportStep, placeholder_ns: &str) {
    out.push_str(r#"<div style="margin-bottom:16px">"#);

    // Step header
    out.push_str(r#"<div class="step-header">"#);
    out.push_str(&format!(
        r#"<span class="step-title">Étape {} — {}</span>{}"#,
        step.number,
        esc(&step.title),
        badge_from_raw(&step.status_badge)
    ));
    out.push_str("</div>\n");

    // Timing row
    out.push_str(r#"<div class="card"><table class="kv">"#);
    if step.started_at != placeholder_ns && !step.started_at.is_empty() {
        kv_row(out, "Début", &esc(&step.started_at));
    }
    if step.completed_at != placeholder_ns && !step.completed_at.is_empty() {
        kv_row(out, "Fin", &esc(&step.completed_at));
    }
    if step.duration != placeholder_ns && !step.duration.is_empty() {
        kv_row(out, "Durée", &esc(&step.duration));
    }
    if step.photo_count > 0 {
        kv_row(out, "Photos", &step.photo_count.to_string());
    }
    if step.quality_score != "Non evalue" && !step.quality_score.is_empty() {
        kv_row(out, "Score qualité", &esc(&step.quality_score));
    }
    out.push_str("</table></div>\n");

    // Notes
    if !step.notes.is_empty() && step.notes != "Aucune observation" {
        out.push_str(&format!(
            r#"<p style="font-size:12px;margin:4px 0 8px;color:#555"><em>📝 {}</em></p>"#,
            esc(&step.notes)
        ));
    }

    // Checklist
    if !step.checklist.is_empty() {
        out.push_str(r#"<div class="sub-title">Liste de contrôle</div>"#);
        out.push_str(r#"<table class="data"><thead><tr><th style="width:50px"></th><th>Élément</th></tr></thead><tbody>"#);
        for item in &step.checklist {
            let (mark, cls) = if item.checked {
                ("✅", "check-y")
            } else {
                ("❌", "check-n")
            };
            out.push_str(&format!(
                r#"<tr><td class="{}">{}</td><td>{}</td></tr>"#,
                cls,
                mark,
                esc(&item.label)
            ));
        }
        out.push_str("</tbody></table>\n");
    }

    // Defects
    if !step.defects.is_empty() {
        out.push_str(r#"<div class="sub-title">Défauts détectés</div>"#);
        out.push_str(r#"<table class="data"><thead><tr>"#);
        out.push_str("<th>Zone</th><th>Type</th><th>Sévérité</th><th>Notes</th>");
        out.push_str("</tr></thead><tbody>");
        for d in &step.defects {
            out.push_str("<tr>");
            td(out, &esc(&d.zone));
            td(out, &esc(&d.defect_type));
            out.push_str("<td>");
            out.push_str(&severity_badge(&d.severity));
            out.push_str("</td>");
            td(out, &esc(&d.notes));
            out.push_str("</tr>");
        }
        out.push_str("</tbody></table>\n");
    }

    // Zones (installation step)
    if !step.zones.is_empty() {
        out.push_str(r#"<div class="sub-title">Zones PPF</div>"#);
        out.push_str(r#"<table class="data"><thead><tr>"#);
        out.push_str("<th>Zone</th><th>Score qualité</th><th>Statut</th>");
        out.push_str("</tr></thead><tbody>");
        for z in &step.zones {
            out.push_str("<tr>");
            let name = if z.name.is_empty() { &z.id } else { &z.name };
            td(out, &esc(name));
            td(
                out,
                &z.quality_score
                    .map(|s| format!("{:.1} / 10", s))
                    .unwrap_or_default(),
            );
            td(out, &esc(&z.status));
            out.push_str("</tr>");
        }
        out.push_str("</tbody></table>\n");
    }

    // Environment kv
    if !step.environment.is_empty() {
        out.push_str(r#"<div class="sub-title">Environnement</div>"#);
        out.push_str(r#"<div class="card"><table class="kv">"#);
        for kv in &step.environment {
            kv_row(out, &esc(&kv.key), &esc(&kv.value));
        }
        out.push_str("</table></div>\n");
    }

    // Observations
    if !step.observations.is_empty() {
        out.push_str(r#"<div class="sub-title">Observations</div><ul style="padding-left:18px;font-size:12px">"#);
        for obs in &step.observations {
            out.push_str(&format!("<li>{}</li>", esc(obs)));
        }
        out.push_str("</ul>\n");
    }

    // Approval
    if step.approval_data.approved_by != placeholder_ns
        && !step.approval_data.approved_by.is_empty()
    {
        out.push_str(&format!(
            r#"<p style="font-size:11px;color:#666;margin-top:6px">✔ Validé par <strong>{}</strong> le {}</p>"#,
            esc(&step.approval_data.approved_by),
            esc(&step.approval_data.approved_at)
        ));
    }
    if !step.approval_data.rejection_reason.is_empty() {
        out.push_str(&format!(
            r#"<p style="font-size:11px;color:#dc2626;margin-top:4px">✖ Motif rejet : {}</p>"#,
            esc(&step.approval_data.rejection_reason)
        ));
    }

    out.push_str("</div>\n"); // close step wrapper
}

fn push_quality(out: &mut String, vm: &ReportViewModel) {
    section_open(out, "Contrôle qualité");
    out.push_str(r#"<div class="card"><table class="kv">"#);
    kv_row(out, "Score global", &esc(&vm.quality.global_quality_score));
    out.push_str("</table></div>\n");

    if !vm.quality.checkpoints.is_empty() {
        out.push_str(r#"<table class="data"><thead><tr><th>Étape</th><th>Statut</th><th>Score</th></tr></thead><tbody>"#);
        for cp in &vm.quality.checkpoints {
            out.push_str("<tr>");
            td(out, &esc(&cp.step_name));
            td(out, &esc(&cp.step_status));
            td(out, &esc(&cp.score));
            out.push_str("</tr>");
        }
        out.push_str("</tbody></table>\n");
    }

    if !vm.quality.final_observations.is_empty() {
        out.push_str(r#"<div class="sub-title">Observations finales</div><ul style="padding-left:18px;font-size:12px">"#);
        for obs in &vm.quality.final_observations {
            out.push_str(&format!("<li>{}</li>", esc(obs)));
        }
        out.push_str("</ul>\n");
    }
    section_close(out);
}

fn push_customer_validation(out: &mut String, vm: &ReportViewModel) {
    section_open(out, "Validation client");
    out.push_str(r#"<div class="card"><table class="kv">"#);
    let sig = if vm.customer_validation.signature_present {
        "✅ Signée électroniquement"
    } else {
        "Non signée"
    };
    kv_row(
        out,
        "Satisfaction",
        &esc(&vm.customer_validation.satisfaction),
    );
    kv_row(out, "Signature", sig);
    kv_row(out, "Commentaires", &esc(&vm.customer_validation.comments));
    out.push_str("</table></div>\n");
    section_close(out);
}

fn push_footer(out: &mut String, vm: &ReportViewModel) {
    out.push_str(r#"<div class="footer">"#);
    out.push_str(&format!(
        "Généré le {} &nbsp;·&nbsp; Intervention {} &nbsp;·&nbsp; RPMA Application",
        esc(&vm.meta.generated_at),
        esc(&vm.meta.intervention_id)
    ));
    out.push_str("</div>\n");
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

fn section_open(out: &mut String, title: &str) {
    out.push_str(r#"<div class="section">"#);
    out.push_str(&format!(r#"<div class="section-title">{}</div>"#, title));
}

fn section_close(out: &mut String) {
    out.push_str("</div>\n");
}

fn kv_row(out: &mut String, key: &str, value: &str) {
    out.push_str(&format!("<tr><td>{}</td><td>{}</td></tr>", key, value));
}

fn td(out: &mut String, value: &str) {
    out.push_str(&format!("<td>{}</td>", value));
}

/// Map a genpdf-style status badge (`[OK]`, `[..]`, etc.) to an HTML badge.
fn badge_from_raw(badge: &str) -> String {
    match badge {
        "[OK]" => badge_html("Terminé", "completed"),
        "[>>]" => badge_html("En cours", "in_progress"),
        "[..]" => badge_html("En attente", "pending"),
        "[!!]" => badge_html("Rejeté", "rejected"),
        other if other.is_empty() => String::new(),
        other => badge_html(other, "pending"),
    }
}

/// Map summary status badge to HTML.
fn badge_status(badge: &str) -> String {
    badge_from_raw(badge)
}

fn badge_html(label: &str, css_type: &str) -> String {
    format!(r#"<span class="badge badge-{}">{}</span>"#, css_type, label)
}

#[allow(dead_code)]
fn legacy_severity_badge(severity: &str) -> String {
    let label = match severity {
        "high" => "🔴 HIGH",
        "medium" => "🟡 MEDIUM",
        "low" => "🟢 LOW",
        other if other.is_empty() => return String::new(),
        other => other,
    };
    let cls = match severity {
        "high" => "severity-high",
        "medium" => "severity-medium",
        "low" => "severity-low",
        _ => "",
    };
    format!(r#"<span class="badge {}">{}</span>"#, cls, label)
}

fn severity_badge(severity: &str) -> String {
    let trimmed = severity.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let normalized = trimmed.to_lowercase();
    let label = match normalized.as_str() {
        "high" => "🔴 Élevé".to_string(),
        "medium" => "🟡 Moyen".to_string(),
        "low" => "🟢 Faible".to_string(),
        _ => severity_label(trimmed),
    };
    let cls = match normalized.as_str() {
        "high" | "élevé" => "severity-high",
        "medium" | "moyen" => "severity-medium",
        "low" | "faible" => "severity-low",
        _ => "",
    };
    format!(r#"<span class="badge {}">{}</span>"#, cls, label)
}

/// HTML-escape a string to prevent injection in the generated document.
fn esc(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::documents::report_view_model::{
        ReportApproval, ReportChecklistItem, ReportClient, ReportCustomerValidation, ReportDefect,
        ReportDisplay, ReportKeyValue, ReportMaterials, ReportMeta, ReportPhotos, ReportQuality,
        ReportSummary, ReportVehicle, ReportViewModel, ReportWorkConditions, ReportZone,
    };
    use crate::shared::services::cross_domain::{InterventionStatus, InterventionType};

    fn minimal_vm() -> ReportViewModel {
        ReportViewModel {
            meta: ReportMeta {
                report_title: "Test".to_string(),
                generated_at: "01/01/2026 10:00".to_string(),
                intervention_id: "int-001".to_string(),
                task_number: "T-001".to_string(),
            },
            summary: ReportSummary {
                status: "Terminee".to_string(),
                status_badge: "[OK]".to_string(),
                technician_name: "Jean Dupont".to_string(),
                estimated_duration: "120 min".to_string(),
                actual_duration: "95 min".to_string(),
                completion_percentage: 100.0,
                intervention_type: "PPF".to_string(),
            },
            client: ReportClient {
                name: "Client Test".to_string(),
                email: "client@test.com".to_string(),
                phone: "+33600000000".to_string(),
            },
            vehicle: ReportVehicle {
                plate: "AB-123-CD".to_string(),
                make: "Tesla".to_string(),
                model: "Model S".to_string(),
                year: "2024".to_string(),
                color: "Noir".to_string(),
                vin: "VIN123".to_string(),
            },
            work_conditions: ReportWorkConditions {
                weather: "Ensoleille".to_string(),
                lighting: "Naturel".to_string(),
                location: "Interieur".to_string(),
                temperature: "20.0 C".to_string(),
                humidity: "45.0%".to_string(),
            },
            materials: ReportMaterials {
                film_type: "Premium".to_string(),
                film_brand: "XPEL".to_string(),
                film_model: "Ultimate".to_string(),
                consumptions: vec![],
            },
            steps: vec![],
            quality: ReportQuality {
                global_quality_score: "90/100".to_string(),
                checkpoints: vec![],
                final_observations: vec![],
            },
            customer_validation: ReportCustomerValidation {
                satisfaction: "9/10".to_string(),
                signature_present: true,
                comments: "Tres satisfait".to_string(),
            },
            photos: ReportPhotos {
                total_count: 0,
                grouped_by_step: vec![],
                grouped_by_category: vec![],
            },
            display: ReportDisplay {
                placeholder_not_specified: "Non renseigne".to_string(),
                placeholder_no_observation: "Aucune observation".to_string(),
                placeholder_not_evaluated: "Non evalue".to_string(),
                placeholder_no_data: "Aucune donnee".to_string(),
            },
        }
    }

    #[test]
    fn test_render_html_contains_header() {
        let vm = minimal_vm();
        let html = render_report_html(&vm);
        assert!(
            html.contains("RAPPORT D'INTERVENTION PPF"),
            "missing report title"
        );
        assert!(html.contains("RPMA"), "missing logo");
        assert!(html.contains("int-001"), "missing intervention id");
        assert!(html.contains("T-001"), "missing task number");
    }

    #[test]
    fn test_render_html_contains_technician() {
        let vm = minimal_vm();
        let html = render_report_html(&vm);
        assert!(html.contains("Jean Dupont"), "missing technician name");
    }

    #[test]
    fn test_render_html_contains_completion() {
        let vm = minimal_vm();
        let html = render_report_html(&vm);
        assert!(html.contains("100.0%"), "missing completion percentage");
    }

    #[test]
    fn test_render_html_defects_table() {
        let mut vm = minimal_vm();
        vm.steps = vec![ReportStep {
            id: "s1".to_string(),
            title: "Inspection".to_string(),
            number: 1,
            status: "Terminee".to_string(),
            status_badge: "[OK]".to_string(),
            started_at: String::new(),
            completed_at: String::new(),
            duration: String::new(),
            photo_count: 0,
            notes: String::new(),
            checklist: vec![],
            defects: vec![ReportDefect {
                zone: "Coffre".to_string(),
                defect_type: "Rayure".to_string(),
                severity: "Élevé".to_string(),
                notes: "deep scratch".to_string(),
            }],
            observations: vec![],
            measurements: vec![],
            environment: vec![],
            zones: vec![],
            quality_score: String::new(),
            validation_data: vec![],
            approval_data: ReportApproval {
                approved_by: String::new(),
                approved_at: String::new(),
                rejection_reason: String::new(),
            },
        }];
        let html = render_report_html(&vm);
        assert!(html.contains("Coffre"), "zone missing");
        assert!(html.contains("Rayure"), "type missing");
        assert!(html.contains("Élevé"), "severity missing");
        assert!(!html.contains(">HIGH<"), "raw english severity leaked");
        assert!(!html.contains(">scratch<"), "raw english defect type leaked");
        assert!(html.contains("deep scratch"), "notes missing");
    }

    #[test]
    fn test_render_html_uses_french_checklist_title() {
        let mut vm = minimal_vm();
        vm.steps = vec![ReportStep {
            id: "s1".to_string(),
            title: "Inspection".to_string(),
            number: 1,
            status: "Terminée".to_string(),
            status_badge: "[OK]".to_string(),
            started_at: String::new(),
            completed_at: String::new(),
            duration: String::new(),
            photo_count: 0,
            notes: String::new(),
            checklist: vec![ReportChecklistItem {
                label: "Surface propre et sèche".to_string(),
                checked: true,
            }],
            defects: vec![],
            observations: vec![],
            measurements: vec![],
            environment: vec![],
            zones: vec![],
            quality_score: String::new(),
            validation_data: vec![],
            approval_data: ReportApproval {
                approved_by: String::new(),
                approved_at: String::new(),
                rejection_reason: String::new(),
            },
        }];
        let html = render_report_html(&vm);
        assert!(html.contains("Liste de contrôle"), "localized checklist title missing");
        assert!(!html.contains(">Checklist<"), "raw english checklist title leaked");
    }

    #[test]
    fn test_render_html_zones_table() {
        let mut vm = minimal_vm();
        vm.steps = vec![ReportStep {
            id: "s2".to_string(),
            title: "Installation".to_string(),
            number: 2,
            status: "Terminee".to_string(),
            status_badge: "[OK]".to_string(),
            started_at: String::new(),
            completed_at: String::new(),
            duration: String::new(),
            photo_count: 0,
            notes: String::new(),
            checklist: vec![],
            defects: vec![],
            observations: vec![],
            measurements: vec![],
            environment: vec![],
            zones: vec![ReportZone {
                id: "capot".to_string(),
                name: "Capot avant".to_string(),
                quality_score: Some(9.5),
                status: "Terminé".to_string(),
            }],
            quality_score: String::new(),
            validation_data: vec![],
            approval_data: ReportApproval {
                approved_by: String::new(),
                approved_at: String::new(),
                rejection_reason: String::new(),
            },
        }];
        let html = render_report_html(&vm);
        assert!(html.contains("Capot avant"), "zone name missing");
        assert!(html.contains("9.5"), "quality score missing");
        assert!(html.contains("Terminé"), "localized zone status missing");
        assert!(!html.contains(">completed<"), "raw english zone status leaked");
    }

    // --- BUG-1 regression: status must not appear twice ---
    #[test]
    fn test_status_not_duplicated_in_html() {
        let vm = minimal_vm(); // status="Terminee", status_badge="[OK]"
        let html = render_report_html(&vm);
        // The badge already contains "Terminé"; the raw label "Terminee" must not follow it
        assert!(
            !html.contains("Terminé</span> Terminee"),
            "status rendered twice: badge label + raw status"
        );
        assert!(html.contains("badge-completed"), "status badge missing");
    }

    // --- BUG-2 regression: make/model must not be doubled when both are placeholder ---
    #[test]
    fn test_make_model_not_doubled_when_both_unspecified() {
        let mut vm = minimal_vm();
        vm.vehicle.make = "Non renseigne".to_string();
        vm.vehicle.model = "Non renseigne".to_string();
        let html = render_report_html(&vm);
        assert!(
            !html.contains("Non renseigne Non renseigne"),
            "make+model placeholder doubled"
        );
        assert!(
            html.contains("Non renseigne"),
            "placeholder should appear once"
        );
    }

    #[test]
    fn test_make_model_concatenated_when_both_present() {
        let mut vm = minimal_vm();
        vm.vehicle.make = "Tesla".to_string();
        vm.vehicle.model = "Model 3".to_string();
        let html = render_report_html(&vm);
        assert!(
            html.contains("Tesla Model 3"),
            "make and model not concatenated"
        );
    }

    #[test]
    fn test_make_model_shows_only_make_when_model_missing() {
        let mut vm = minimal_vm();
        vm.vehicle.make = "Tesla".to_string();
        vm.vehicle.model = "Non renseigne".to_string();
        let html = render_report_html(&vm);
        assert!(html.contains("Tesla"), "make missing");
        assert!(!html.contains("Tesla Non renseigne"), "placeholder leaked");
    }

    #[test]
    fn test_esc_html_characters() {
        assert_eq!(
            esc("<script>alert('xss')</script>"),
            "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
        );
        assert_eq!(esc("AT&T"), "AT&amp;T");
    }
}
