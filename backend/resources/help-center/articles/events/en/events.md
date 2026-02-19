# Events

The Events page is where you create and manage school events such as graduation ceremonies, parent meetings, open days, and guest lists. School administrators and staff use this page to create events, set dates and venues, manage guest lists, run check-in (including QR-based check-in), and export event data. Each event can have a status (Draft, Published, Completed, or Cancelled) and shows how many guests are invited and how many have arrived.

---

## Page Overview

When you open the Events page, you will see:

### Summary Cards

This page does not have summary cards at the top. Events are shown as a grid of cards.

### Filters & Search

- **Search** — Search events by title or other text. Type in the search box to filter the list.
- **Status** — Filter by event status: **All statuses**, **Draft**, **Published**, **Completed**, or **Cancelled**.

When there is at least one event, **Export** buttons (PDF and Excel) appear next to the filters. The export uses the current search and status filter and includes the same columns as the event cards (title, event type, status, start date, venue, total invited, total arrived, capacity).

---

## Data Table (Event Cards)

Events are displayed as cards in a grid (not a table). Each card shows:

| Card element | Description |
|---|---|
| Title | Event title at the top of the card. |
| Event type | Event type name below the title (if the event has a type). |
| Status badge | Draft (gray), Published (green), Completed (blue), or Cancelled (red). |
| Start date & time | When the event starts (date and time). |
| Venue | Location of the event (if set). |
| Guests | "X / Y guests" — arrived count / invited count; optional "(capacity: N)" if capacity is set. |
| Add Guest | Button to go to the add-guest page for this event. |
| Check-in | Button to open the check-in page (only if you have check-in permission). |

### Row Actions (Card Menu)

When you click the actions menu (⋮) on an event card, you can:

- **View** — Opens the event detail page for this event.
- **Guests** — Opens the guests list page for this event (add, edit, view guests).
- **Check-in** — Opens the check-in page for QR or code-based check-in (only if you have check-in permission).
- **Event Users** — Opens the page to manage which users can check in guests for this event (only if you have events.update permission).
- **Publish** — Changes status to Published (only when status is not already Published, and only if you have events.update permission).
- **Mark as Completed** — Changes status to Completed (only if you have events.update permission).
- **Cancel Event** — Changes status to Cancelled (only if you have events.update permission).
- **Mark as Draft** — Changes status to Draft (only if you have events.update permission).
- **Edit** — Opens the edit event form with current data (only if you have events.update permission).
- **Delete** — Opens a confirmation dialog. Confirming permanently deletes the event and all its guests and check-in data.

### Bulk Actions

No bulk actions are available on this page. Actions are per event via the card menu.

---

## Creating a New Event

To create a new event, click the **"Create Event"** button at the top of the page. A dialog will open with the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| Title | Text | Yes | Event title (e.g., "Annual Graduation Ceremony 2024"). |
| School | Dropdown | Yes | Select the school this event belongs to. |
| Start Date & Time | Date picker + time | Yes | Date and time when the event starts. Default time is 09:00. |
| End Date & Time | Date picker + time | No | Date and time when the event ends. End must be after start. |
| Venue | Text | No | Location (e.g., "Main Auditorium"). |
| Capacity | Number | No | Maximum number of guests. |
| Status | Dropdown | No (default: Draft) | Draft, Published, Completed, or Cancelled. Shown only if you have events.update permission. |

Click **"Create"** to save. The dialog closes, a success message appears, and the event list refreshes with the new event.

### What Happens After Submission

- The event is created with the chosen school and status (default Draft).
- You are returned to the event list; the new event appears in the grid.
- You can then open **Guests** to add guests, or **Check-in** to run check-in for the event.

---

## Editing an Event

To edit an existing event:

1. Find the event in the grid.
2. Click the actions menu (⋮) → **Edit** (you need events.update permission).
3. The edit dialog opens with the current title, school, start/end date and time, venue, capacity, and status.
4. Change any fields as needed.
5. Click **"Update"**.
6. A success message appears, the dialog closes, and the event list refreshes.

---

## Deleting an Event

To delete an event:

1. Click the actions menu (⋮) on the event card → **Delete**.
2. A confirmation dialog appears: "Are you sure you want to delete \"[event title]\"? This action cannot be undone. All guests and check-in data will be permanently deleted."
3. Click **"Confirm"** to permanently remove the event, or **"Cancel"** to keep it.
4. Deleting an event removes the event and all associated guests and check-in records.

---

## Additional Features

### View Event Details

- From the card menu, choose **View** to open the event detail page. There you can see full event information and quick actions (e.g., Publish, Mark as Completed, Cancel, Edit).

### Guests

- Use **Guests** from the card menu (or the **Add Guest** button on the card) to open the guests list for that event. You can add, edit, and manage guests and use the event type’s custom registration fields if configured.

### Check-in

- If you have check-in permission, use **Check-in** to open the check-in screen where you can check in guests by QR code or guest code.

### Event Users

- If you have events.update permission, **Event Users** lets you control which users are allowed to perform check-in for this event.

### Export (PDF / Excel)

- When at least one event is listed, PDF and Excel export buttons appear in the filter area. The export respects the current **Search** and **Status** filters. Exported columns include: Title, Event Type, Status, Start Date, Venue, Total Invited, Total Arrived, Capacity.

---

## Export Options

- **PDF** — Generates a report of events matching the current filters, with school branding and layout options.
- **Excel** — Exports the same filtered events to a spreadsheet with columns: Title, Event Type, Status, Start Date, Venue, Total Invited, Total Arrived, Capacity.

Both exports use the active search and status filter and include a filter summary when applicable.

---

## Tips & Best Practices

- **Use Draft first** — Create events as Draft, add guests and review details, then **Publish** when ready so only published events are visible to check-in and guests as intended.
- **Set end date and capacity** — Entering end date/time and capacity helps with planning and prevents overbooking.
- **Define event types** — Use Event Types to standardize kinds of events (e.g., Graduation, Parent Meeting) and to design custom guest registration fields per type.
- **Check permissions** — Status changes (Publish, Complete, Cancel, Draft) and Edit/Event Users are only available to users with events.update permission; check-in requires event_checkins.create.

---

## Related Pages

- [Event Types](/help-center/s/events/events-types) — Define event types and design custom guest registration fields for each type.

---

*Category: `events` | Language: `en`*
