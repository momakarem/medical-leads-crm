# Space Kit — CRM Analytics Dashboard Design Brief

> **Document purpose:** This README is the single source of truth for designing the Space Kit user interface. It is intended to be given directly to Claude Design (or another product designer) to produce a polished, implementation-ready design for a WordPress-based CRM and lead-management dashboard.
>
> **Current project status:** The repository does not yet contain the application implementation or existing UI screens. The requirements below are therefore a product and design specification based on the required CRM workflows. Any item marked **Assumption** must be confirmed before development if the final product requirements differ.

---

## 1. Product Summary

Space Kit is a CRM analytics and operations dashboard for teams that receive leads, assign them to sales agents, track lead progress, schedule bookings, and measure performance.

The main product promise is simple:

- Management can understand business performance at a glance.
- Every dashboard number can be traced back to the exact records that produced it.
- Agents can quickly find and act on their assigned leads.
- Date ranges and filters behave consistently across every card, chart, table, and detail view.
- Lead-source and agent distributions always use the same filtered dataset as the headline metrics.

The design must feel premium, modern, trustworthy, and ready for a commercial release. It must not look like a generic admin template.

---

## 2. Primary Users

### Administrator / Owner

Needs a complete view of the business, all agents, all lead sources, bookings, conversion rates, and recent activity. Can manage settings and access all records.

### Sales Manager

Needs to compare agents, monitor the funnel, detect unassigned or neglected leads, and open the records behind every metric.

### Sales Agent

Needs a focused view of assigned leads, upcoming bookings, overdue follow-ups, and personal performance. An agent should not see data outside their permissions.

### Viewer / Analyst — optional role

Can inspect dashboards and reports without editing operational data.

---

## 3. Product Principles

1. **One filter context:** every visible metric and visualization must use the same active date range and filters unless a component explicitly says otherwise.
2. **Numbers are actionable:** clicking a KPI, chart segment, agent, source, or funnel stage opens the exact filtered records behind that number.
3. **No unexplained percentages:** always expose the numerator, denominator, metric definition, and active period through labels or tooltips.
4. **Operational clarity:** overdue, unassigned, high-priority, and newly received leads must be easy to identify.
5. **Progressive detail:** start with a calm overview, then allow drill-down without overwhelming the user.
6. **Real application states:** design loading, empty, partial-data, error, permission-restricted, and no-results states—not only the ideal populated screen.

---

## 4. Information Architecture

Design the following primary navigation:

1. **Dashboard**
2. **Leads**
3. **Bookings**
4. **Agents / Team**
5. **Lead Sources**
6. **Reports**
7. **Activity Log**
8. **Settings**

The sidebar may collapse to icons on medium screens and become a drawer on mobile. The active section must be unmistakable. Include a product logo/wordmark area, account/workspace switcher if relevant, notifications, help, and the current user menu.

---

## 5. Global Application Shell

### Header

Include:

- Page title and optional breadcrumb.
- Global search for lead name, phone, email, booking reference, or agent.
- Notification center.
- Current user avatar and role.
- Optional quick-create button for a new lead or booking.

### Global filter bar

The filter bar is critical and should remain visible or easy to reopen. It includes:

- Date-range picker.
- Quick ranges: Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, This Quarter, This Year, and Custom.
- Agent selector.
- Lead-source selector.
- Lead-status selector.
- Booking-status selector where applicable.
- Campaign/project selector if enabled.
- Clear-all action.
- Apply action if filters are not applied instantly.

Display active filters as removable chips. The selected date range must appear in a human-readable form, for example `01 Aug 2026 – 20 Aug 2026`.

**Important behavior:** navigating from a dashboard metric to a list must preserve the date range and all relevant filters. A clear “Back to dashboard” action should restore the previous dashboard state.

### Time and timezone

- Use the workspace timezone for all reporting and date boundaries.
- **Default assumption:** `Africa/Cairo`.
- Show timezone information in the date picker or reporting settings.
- Date ranges are inclusive of the start and end dates.
- Avoid ambiguous dates such as `08/09/26`; use localized, readable formats.

---

## 6. Dashboard

The dashboard should answer four questions in order:

1. What happened in the selected period?
2. Where did the leads come from?
3. Who is handling them and how are agents performing?
4. Which records need attention now?

### 6.1 Dashboard heading and controls

Show:

- “Dashboard” title.
- A short period summary.
- Last refreshed time.
- Manual refresh action.
- Export action.
- Global filter bar.

### 6.2 KPI cards

Create a clean responsive grid of KPI cards. Recommended cards:

1. **New Leads** — leads created within the active date range.
2. **Total Leads** — all leads matching the active filter context; clearly label the definition if it differs from New Leads.
3. **Bookings** — bookings created in the active date range by default.
4. **Confirmed Bookings** — bookings with confirmed status.
5. **Converted Leads** — leads that reached the configured converted/won state during the range.
6. **Conversion Rate** — converted leads divided by eligible leads in the same filtered cohort.
7. **Unassigned Leads** — matching leads with no current agent.
8. **Overdue Follow-ups** — open leads whose next follow-up time is before now.

Each card should support:

- Primary value.
- Clear title.
- Short definition via tooltip.
- Comparison with the immediately previous equivalent period when comparison is enabled.
- Direction indicator, but never rely on color alone.
- Small contextual trend where useful.
- Click/tap drill-down to the matching list.

Do not show a positive green indicator merely because a number increased. For example, an increase in overdue leads may be negative. Metric semantics must control the visual meaning.

### 6.3 Leads over time

Use a line or area chart showing leads created over time. Optional comparison series may show bookings or converted leads.

- Day granularity for short ranges.
- Week granularity for medium ranges.
- Month granularity for long ranges.
- Tooltips show the exact bucket dates and values.
- Clicking a data point opens the corresponding records.
- Missing periods display as zero only when the system has complete data; otherwise indicate unavailable data.

### 6.4 Lead funnel

Show the count and conversion between configured funnel stages, for example:

`New → Contacted → Qualified → Booking → Won`

Requirements:

- Counts and percentages must both be visible.
- The denominator must be explicit.
- Funnel stages must follow the configured workflow order, not alphabetical order.
- Clicking a stage opens its records with the dashboard filters preserved.
- Lost/disqualified leads may appear as a secondary branch rather than a normal forward stage.

### 6.5 Lead-source distribution

Display the contribution of sources such as Facebook, Instagram, Google Ads, Website, Referral, Phone, Walk-in, Import, and Unknown.

Recommended treatment:

- Donut chart only when the number of categories is small.
- Ranked horizontal bar chart for many sources.
- Show source name, lead count, percentage, and optional conversion rate.
- Group very small categories under “Other” only if the full breakdown remains accessible.
- Keep “Unknown / Not set” visible rather than silently excluding it.
- Clicking a source opens matching lead records.

Percentage rule:

`Source share = leads attributed to the source ÷ all filtered leads included in the source breakdown × 100`

The displayed source counts must add up to the displayed denominator. Rounding may cause the visible percentages to differ from exactly 100% by a small amount; use a consistent largest-remainder or equivalent display strategy if the UI must show exactly 100%.

### 6.6 Agent performance

Use a sortable table or horizontal comparison view with:

- Agent identity and availability/status.
- Assigned leads.
- New leads in the selected range.
- Contacted leads.
- Bookings.
- Converted/won leads.
- Conversion rate.
- Average first-response time if available.
- Overdue follow-ups.

Never compare agents using percentages alone. Show the underlying volume because `1/1 = 100%` is not equivalent to `100/100 = 100%` operationally.

Include an explicit “Unassigned” row where applicable. Clicking an agent opens their filtered lead list or agent detail page.

### 6.7 Booking overview

Include:

- Booking status distribution: Pending, Confirmed, Completed, Cancelled, and No-show.
- Upcoming bookings list.
- Calendar preview or daily schedule.
- Capacity/utilization only if capacity data exists.
- Click-through to booking details.

### 6.8 Attention queue

Provide a compact list of urgent items:

- Unassigned new leads.
- Leads without first contact.
- Overdue follow-ups.
- Bookings awaiting confirmation.
- Upcoming bookings with missing information.

Each item must have a clear reason, age/due time, owner, and primary action.

### 6.9 Recent activity

Show important events such as:

- Lead created.
- Agent assigned or changed.
- Status changed.
- Note added.
- Call/email/WhatsApp interaction recorded.
- Booking created, confirmed, rescheduled, completed, or cancelled.

Every event should show actor, action, target record, and localized timestamp.

---

## 7. Leads List

The leads page is the operational center of the product.

### 7.1 Toolbar

Include:

- Search.
- Date range.
- Status, agent, source, campaign, priority, and tag filters.
- Saved views.
- Columns control.
- Export.
- New-lead action.
- Bulk actions after selecting rows.

### 7.2 Table columns

Recommended default columns:

- Selection checkbox.
- Lead name.
- Phone/email summary.
- Current status.
- Assigned agent.
- Lead source.
- Created date.
- Last activity.
- Next follow-up.
- Booking status/date.
- Priority.
- Quick actions.

The table should support sorting, pagination or cursor-based loading, sticky headers, and horizontal scrolling on smaller desktop widths. Users must be able to distinguish “not available,” “not assigned,” and genuine zero values.

### 7.3 Bulk actions

Possible actions:

- Assign or reassign agent.
- Change status.
- Add/remove tag.
- Export selected records.
- Archive where permissions allow.

Bulk actions require a confirmation pattern that clearly states the number of affected records.

### 7.4 Drill-down consistency

When opened from any dashboard number, show a contextual banner such as:

> Showing 42 New Leads created from 01 Aug to 20 Aug 2026, source: Facebook, agent: Ahmed.

The list count must match the originating dashboard number. Removing a filter should update the count and make the changed context obvious.

---

## 8. Lead Detail

Use a full page or wide drawer depending on context. A full page is preferred for deep workflows; a drawer is suitable for quick review from a table.

### Header

- Lead name and ID.
- Status selector.
- Priority.
- Assigned agent.
- Source.
- Created time.
- Primary communication actions: call, email, WhatsApp where integrations exist.
- Edit and overflow actions.

### Main content

Organize into clear sections or tabs:

1. **Overview** — contact and qualification fields.
2. **Timeline** — complete chronological activity.
3. **Notes** — internal notes and mentions.
4. **Tasks / Follow-ups** — upcoming and completed actions.
5. **Bookings** — linked bookings and their status history.
6. **Files** — attachments if enabled.
7. **Audit history** — sensitive field changes where permissions allow.

### Data relationships

The design must visually clarify that:

- A lead has one current status and may have a full status history.
- A lead may have one current assigned agent and multiple past assignments.
- A lead has one normalized source plus optional campaign/UTM metadata.
- A lead can have zero, one, or multiple bookings.
- Activities and notes belong to the lead and identify their author.

### Actions and validation

- Prevent accidental loss of unsaved changes.
- Explain missing required data inline.
- Show success feedback after saves.
- Destructive actions require confirmation and appropriate permissions.

---

## 9. Bookings

Provide both list and calendar views.

### List view

Fields include:

- Booking ID/reference.
- Linked lead.
- Assigned agent.
- Booking date and time.
- Service/project if applicable.
- Status.
- Created date.
- Last update.
- Quick actions.

### Calendar view

- Month, week, and day views.
- Clear current-time and today indicators.
- Status legend.
- Agent filter.
- Conflict visibility if conflicts are meaningful.
- Mobile-friendly agenda view.

### Booking detail

Display the linked lead prominently. Include status history, date changes, notes, owner, and related activity. Rescheduling and cancellation should capture a reason when configured.

### Reporting-date clarity

A booking has at least two important dates:

- `created_at`: when the booking record was created.
- `scheduled_at`: when the appointment will occur.

Any booking metric or filter must clearly state which date it uses. The default dashboard “Bookings” KPI should use `created_at` unless the product owner chooses another definition. Upcoming-booking widgets use `scheduled_at`.

---

## 10. Agents / Team

### Team list

Show:

- Agent identity.
- Role and status.
- Assigned/open lead count.
- Leads received during the selected period.
- Bookings and conversions.
- Conversion rate with numerator/denominator.
- Overdue follow-ups.
- Last active time if permitted.

### Agent detail

Include:

- Profile summary.
- Current workload.
- Performance trends.
- Funnel breakdown.
- Source mix.
- Assigned leads.
- Upcoming tasks and bookings.
- Recent activity.

All agent metrics must respect the same date and lead-cohort definitions used by the dashboard.

---

## 11. Lead Sources

### Source overview

Use a ranked table with:

- Source name and icon/color.
- Leads.
- Share of filtered leads.
- Bookings.
- Converted leads.
- Conversion rate.
- Optional cost, cost per lead, and return metrics only when ad-spend data exists.

### Source detail

Include:

- Trend over time.
- Status funnel.
- Agent distribution.
- Campaign and UTM breakdown where available.
- Matching leads.

Source labels must be normalized. For example, `Facebook`, `facebook`, and `FB` should not appear as three sources once data normalization is configured. Keep a visible “Unknown” category for missing values.

---

## 12. Reports

Reports should reuse the same metric definitions as the dashboard. Suggested reports:

- Lead acquisition over time.
- Funnel and conversion.
- Agent performance.
- Lead-source performance.
- Booking outcomes.
- Response and follow-up performance.

Report controls:

- Date range and comparison period.
- Filters shared with the dashboard.
- Table/chart switch where helpful.
- Export to CSV/XLSX/PDF only if supported by implementation.
- Saved report configuration.

Exports must include the active filters, timezone, generation time, and metric definitions or a link to them.

---

## 13. Activity Log

Create a searchable, filterable audit-oriented view showing:

- Timestamp.
- User/actor.
- Action type.
- Record type and identifier.
- Human-readable description.
- Before/after values for supported changes.

Use permissions to hide sensitive data. The log should be readable by humans and suitable for troubleshooting data discrepancies.

---

## 14. Settings

Group settings into logical pages:

- Workspace/profile.
- Users, roles, and permissions.
- Lead statuses and funnel order.
- Lead sources and source normalization.
- Booking statuses and rules.
- Assignment rules.
- Custom fields.
- Notifications.
- Integrations.
- Timezone, language, and date format.
- Data import/export.
- Metric definitions if configurable.

Settings forms require clear save states, validation, unsaved-change warnings, and confirmation for high-impact changes.

---

## 15. Metric and Data-Consistency Specification

This section is mandatory. The visual design must help users understand and verify numbers.

### 15.1 Canonical filter context

All dashboard components receive one filter context:

```text
date_from
date_to
timezone
agent_ids[]
source_ids[]
lead_status_ids[]
booking_status_ids[]
campaign_ids[]
```

Filters irrelevant to a component may be ignored only when the UI explicitly communicates that behavior.

### 15.2 Recommended definitions

| Metric | Definition |
|---|---|
| New Leads | Distinct lead IDs whose `created_at` falls within the selected inclusive date range and other lead filters |
| Total Leads | Distinct lead IDs matching the current filter context; if this is an all-time stock metric, label it explicitly as “All-time Leads” |
| Bookings | Distinct booking IDs whose `created_at` falls within the range unless the UI explicitly selects scheduled date |
| Confirmed Bookings | Bookings in the filtered booking cohort whose current status is Confirmed |
| Converted Leads | Distinct eligible leads that reached the configured converted/won state according to the selected cohort rule |
| Conversion Rate | `Converted eligible leads ÷ all eligible leads × 100` |
| Source Share | `Leads attributed to source ÷ all leads included in source distribution × 100` |
| Agent Conversion Rate | `Converted eligible leads assigned/credited to agent ÷ eligible leads assigned/credited to agent × 100` |
| Unassigned Leads | Matching leads whose current agent is null/unassigned |
| Overdue Follow-ups | Open matching leads with an incomplete follow-up due before the current workspace time |

The product owner must choose one converted-lead cohort rule and use it everywhere:

- **Created-cohort rule:** leads created in the selected range that are currently or eventually converted.
- **Event-date rule:** leads whose conversion event occurred in the selected range.

Do not mix these rules between dashboard cards, charts, agent pages, and reports.

### 15.3 Count rules

- Count distinct primary record IDs to avoid duplication from joins with notes, activities, tags, or bookings.
- A lead with multiple bookings remains one lead in lead metrics.
- Booking metrics count distinct booking IDs.
- Deleted/spam/test records follow one documented inclusion rule.
- Permission restrictions may reduce visible drill-down records; if so, explain why rather than showing an unexplained mismatch.

### 15.4 Required reconciliation rules

- Source counts plus Unknown must equal the filtered lead denominator.
- Agent counts plus Unassigned must equal the filtered lead denominator when the view represents current ownership.
- Funnel stage counts must reconcile according to the selected funnel model.
- Clicking a KPI must produce a list whose total equals the KPI value.
- Booking-status counts must equal the total bookings in the same cohort.
- The same saved filter state must return the same totals across Dashboard, Leads, Agents, Sources, and Reports.

### 15.5 Percentage display

- Store/calculate using full precision.
- Round only for display.
- Default to one decimal place where useful.
- Show `0%` when the denominator is positive and the numerator is zero.
- Show `—` rather than `0%` when the denominator is zero.
- Tooltip example: `12 converted out of 80 eligible leads = 15.0%`.

### 15.6 Comparison periods

If the current selected range contains `N` days, compare with the immediately preceding `N`-day range. Clearly display both ranges in the tooltip. Avoid misleading percentage change when the previous value is zero; use “New” or an explanatory label instead of infinity.

---

## 16. Visual Direction

### Brand personality

The interface should feel:

- Premium but practical.
- Calm and data-confident.
- Modern, spacious, and fast.
- Friendly enough for daily use.
- Appropriate for a commercial WordPress product.

Avoid:

- Excessive gradients or glow effects.
- Oversized cards with very little information.
- Decorative charts that reduce readability.
- Too many saturated colors.
- Generic “template dashboard” styling.
- Glassmorphism that harms contrast.

### Color

Use a restrained neutral foundation with one primary brand color and a small semantic palette:

- Primary/action.
- Success/positive.
- Warning/attention.
- Danger/overdue/error.
- Informational.
- Neutral/unknown.

Every semantic color must work on light and dark surfaces if dark mode is proposed. Do not use color as the only signal; pair it with text, iconography, shape, or pattern.

### Typography

- Use a highly legible UI typeface with strong Arabic and Latin support if the product will be bilingual.
- Recommended direction: `IBM Plex Sans Arabic`, `Noto Sans Arabic`, or another production-safe family.
- Use tabular numerals for KPI and table values where available.
- Keep the hierarchy compact and consistent.

### Spacing and shape

- Use a consistent 4px or 8px spacing system.
- Prefer moderate corner radii rather than fully rounded containers everywhere.
- Use borders and subtle elevation to define hierarchy.
- Keep dense tables readable without making the entire interface oversized.

### Icons and charts

- Use one consistent icon family.
- Icons must support labels/tooltips when their meaning is not universal.
- Chart colors must remain consistent for the same entities and statuses throughout the product.
- Prioritize labels and direct values over decorative legends.

---

## 17. Responsive Behavior

Design at minimum for:

- Large desktop: `1440px`.
- Standard desktop/laptop: `1280px`.
- Tablet: `768px`.
- Mobile: `390px`.

### Desktop

- Persistent or collapsible sidebar.
- Multi-column dashboard.
- Full data tables.
- Filters visible inline where space permits.

### Tablet

- Collapsible sidebar/drawer.
- Two-column cards where practical.
- Filter drawer or compact filter bar.
- Tables may scroll horizontally or switch to structured rows.

### Mobile

- Single-column hierarchy.
- Bottom sheet or full-screen filters.
- KPI cards may use a two-column compact grid when readable.
- Charts must remain interpretable without hover.
- Lead and booking tables should become purposeful cards or a priority-column list, not a squeezed desktop table.
- Primary actions must remain reachable and safe from accidental taps.

---

## 18. RTL and Localization

The final product may support Arabic and English.

- Create both RTL and LTR behavior rules.
- Mirror navigation, directional icons, breadcrumbs, and layout appropriately in RTL.
- Do not mirror universally recognized media or chart semantics unnecessarily.
- Allow labels to expand without breaking containers.
- Localize dates, numbers, pluralization, and empty-state text.
- Phone numbers and IDs may need LTR isolation inside Arabic text.
- Do not embed text inside images.

Claude Design should ideally provide at least one principal desktop screen and one mobile screen in Arabic RTL, in addition to the core English/LTR design, to prove the layout supports both directions.

---

## 19. Accessibility Requirements

Target WCAG 2.2 AA behavior.

- Text and essential UI controls must meet contrast requirements.
- All interactive elements require visible keyboard focus.
- Minimum practical target size is approximately 44×44px for touch controls.
- Tables, filters, dialogs, menus, charts, and date pickers must be keyboard usable.
- Charts require textual equivalents or accessible data tables.
- Status must not be communicated by color alone.
- Form inputs need persistent labels, help text, and clear errors.
- Loading announcements and asynchronous updates should work with assistive technology.
- Respect reduced-motion preferences.

---

## 20. System States to Design

For every major page or component, account for:

- Initial loading/skeleton.
- Refreshing while existing data remains visible.
- Empty workspace/no data yet.
- No results for selected filters.
- Partial data or unavailable metric.
- Network/server error with retry.
- Permission-restricted content.
- Very large values and long names.
- Unknown/deleted agent or source.
- Zero denominator for a percentage.
- Stale data warning.
- Successful create/update.
- Validation failure.
- Unsaved changes.

Do not use `0` to represent a loading, unknown, or failed value.

---

## 21. Interaction and Motion

- Use subtle transitions to communicate state changes, not as decoration.
- Preserve scroll position and filter context when returning from details.
- Show immediate feedback for filter changes and saving actions.
- Use optimistic updates only when failures can be safely reversed and clearly communicated.
- Tooltips should not contain essential information that is inaccessible on touch devices.
- Confirm irreversible or high-impact actions.

---

## 22. WordPress Implementation Constraints

The UI will ultimately be implemented inside a WordPress environment.

The design must:

- Avoid relying on browser-only novelty features without practical fallbacks.
- Use reusable components and design tokens rather than page-specific styling.
- Coexist with WordPress admin styles without accidental CSS collisions.
- Define scoped component states and consistent form controls.
- Remain performant with large lead and booking datasets.
- Assume server-side pagination/filtering may be required.
- Avoid layouts that require rendering thousands of DOM rows at once.
- Keep export, permissions, nonces/security messaging, and destructive confirmations in mind.

Do not generate a design that can only be implemented as a static image. Every component must have a realistic responsive and interactive behavior.

---

## 23. Reusable Component Inventory

Claude Design should create reusable components and variants for:

- App sidebar and mobile navigation.
- Header and breadcrumbs.
- Global search.
- Date-range picker.
- Filter bar, filter drawer, and filter chips.
- KPI cards and comparison states.
- Chart container, legend, tooltip, empty, and error states.
- Data table, sorting, selection, pagination, and column settings.
- Status, priority, source, and agent badges.
- Avatar and avatar group.
- Buttons, icon buttons, split buttons, and destructive variants.
- Inputs, selects, autocomplete, phone input, textarea, checkbox, radio, and switch.
- Tabs and segmented controls.
- Modal, drawer, popover, tooltip, toast, and confirmation dialog.
- Lead card and booking card for mobile.
- Activity timeline.
- Empty state, skeleton, inline error, and access-denied state.
- Pagination and result-count summary.

Define hover, focus, active, selected, disabled, loading, error, and success variants.

---

## 24. Screens Required from Claude Design

### Priority 1 — release-critical

1. Dashboard — populated desktop.
2. Dashboard — filtered/drill-down state.
3. Dashboard — mobile.
4. Leads list — desktop with active filters.
5. Leads list — mobile.
6. Lead detail — full operational view.
7. Bookings list/calendar.
8. Agent performance list and agent detail.
9. Lead-source performance page.

### Priority 2

10. Reports.
11. Activity log.
12. Settings overview and one detailed settings form.
13. Empty/onboarding state.
14. Error and permission-restricted states.
15. Arabic RTL examples.

---

## 25. Required Design Deliverables

Claude Design should return:

1. A concise visual concept and rationale.
2. Sitemap and key user flows.
3. High-fidelity desktop and mobile screens listed above.
4. Responsive behavior notes.
5. Light theme; dark theme is optional unless requested separately.
6. Design tokens: colors, typography, spacing, radii, borders, elevation, and motion.
7. Reusable component library with states and variants.
8. Chart specifications including tooltip and no-data behavior.
9. RTL/localization behavior.
10. Accessibility annotations.
11. Developer handoff annotations: dimensions, spacing, states, interactions, and data rules.
12. A list of assumptions and unresolved product questions.

If producing code, use semantic, reusable components and realistic mock data. Keep data in a centralized mock layer so the same filtered dataset drives KPI cards, charts, tables, agents, sources, and drill-down views.

---

## 26. Acceptance Criteria

The design is ready for implementation only when:

- All required screens and system states are covered.
- Every dashboard metric has a clear definition and drill-down destination.
- Active filters are always visible and persist between related pages.
- KPI, chart, table, agent, and source numbers can visibly reconcile.
- Booking creation dates and scheduled dates are not confused.
- Percentages show or expose their numerator and denominator.
- Unknown and unassigned records are not silently dropped.
- Desktop, tablet, mobile, LTR, and RTL behavior is defined.
- Components are reusable and documented.
- Accessibility requirements are reflected in the UI.
- The design is realistic for a WordPress implementation.
- The interface feels distinctive, polished, cohesive, and commercially publishable.

---

## 27. Prompt to Give Claude Design

Copy the text below together with this README:

```text
Design a premium, implementation-ready CRM analytics and lead-management interface for “Space Kit” using the attached README as the complete product brief.

Start by summarizing your understanding, assumptions, sitemap, and design direction. Then create the Priority 1 screens, the reusable design system, responsive variants, and key loading/empty/error states. The dashboard must be operationally trustworthy: all KPI cards, charts, agent breakdowns, lead-source percentages, and drill-down lists must be based on one consistent filter context and must visibly reconcile.

Avoid generic admin-template styling and decorative charts. Optimize for clarity, fast daily use, accessibility, Arabic RTL and English LTR support, and realistic implementation inside WordPress. Use realistic but clearly fictional mock data. Do not invent product features that conflict with the README; record any necessary assumption explicitly.

For each screen, annotate interactions, responsive behavior, data definitions, and edge cases. Deliver reusable components and design tokens—not only static page mockups.
```

---

## 28. Product Decisions Still to Confirm

The following decisions should be confirmed before final implementation:

- Final brand logo, primary color, and visual identity.
- Exact lead-status funnel and which statuses count as converted, lost, or open.
- Whether conversion reporting uses created-cohort date or conversion-event date.
- Whether the Bookings KPI uses booking creation date, scheduled date, or a user-selectable mode.
- Required user roles and exact permissions.
- Actual lead sources and normalization rules.
- Whether campaigns, projects, services, ad spend, WhatsApp, calling, or email integrations are included.
- Required languages and whether RTL ships in the first release.
- Required exports and reporting formats.
- Whether dark mode is required.
- The final product name capitalization: `Space Kit`, `SpaceKit`, or another brand form.

Until these are confirmed, the design should keep relevant elements configurable and avoid hard-coding business-specific assumptions.
