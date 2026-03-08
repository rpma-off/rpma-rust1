#[cfg(test)]
mod tests {
    #[test]
    fn capabilities_are_exposed() {
        let caps = crate::domains::reports::ReportsFacade::get_capabilities();
        assert_eq!(caps.status, "active");
    }

    #[test]
    fn capabilities_include_intervention_pdf() {
        let caps = crate::domains::reports::ReportsFacade::get_capabilities();
        assert!(caps
            .available_exports
            .contains(&"intervention_pdf".to_string()));
    }
}
