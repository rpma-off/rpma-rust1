---
title: "User Flows and UX"
summary: "Standard user journeys, design system rules, and interaction patterns."
read_when:
  - "Designing new UI screens"
  - "Implementing complex workflows"
  - "Reviewing UX consistency"
---

# 09. USER FLOWS AND UX

This guide defines how users interact with RPMA v2 and the standards for UI/UX.

## Primary User Flows

1. **Scheduling**: Client → Quote → Accepted → Task → Scheduled on Calendar.
2. **Execution**: Technician Dashboard → View Task → Start Intervention → Progress Steps → Record Materials → Finalize.
3. **Reporting**: Finalized Intervention → Generate PDF → Send to Client.
4. **Administration**: Inventory Audit → Adjust Stock → View Consumption Reports.

## Design System Rules

- **Typography**: Strictly follow `shadcn/ui` hierarchy.
- **Colors**: Use Tailwind theme variables (`primary`, `destructive`, `muted`, etc.).
- **Feedback**: Every IPC call must have a loading state (Skeleton or Spinner) and success/error Toasts.
- **Validation**: Real-time feedback via Zod schemas and hook-form.

## Interaction Patterns

### 1. Modals vs. Sheets
- **Modals**: For focused creation/editing (e.g., "Add Client").
- **Sheets**: For context-aware details (e.g., "View Task Details" from calendar).

### 2. Forms
- Group related fields.
- Use `Form` component from `shadcn/ui`.
- Always include a "Cancel" button.

### 3. Navigation
- Sidebar for main domains.
- Breadcrumbs for nested views.
- Deep linking support via Next.js App Router.

## Mobile Considerations
While RPMA is a desktop app, the **Intervention Execution** flow must be usable on tablet devices (touch-friendly buttons, clear progress indicators).

## Accessibility (A11y)
- All interactive elements must have clear hover/focus states.
- Support keyboard navigation for all core flows.
- Maintain a minimum contrast ratio per WCAG standards.
