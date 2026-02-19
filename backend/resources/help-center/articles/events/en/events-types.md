# Event Types

The Event Types page lets you define categories of events (e.g., Graduation Ceremony, Parent Meeting, Open Day) and design the guest registration form for each type. School administrators use event types to keep events consistent and to collect the right information from guests (e.g., phone, email, ID number) via custom fields and groups. You can add, edit, and delete event types and use the Form Designer to add field groups and fields (text, phone, date, select, etc.) for each type.

---

## Page Overview

When you open the Event Types page, you will see:

### Summary Cards

This page does not have summary cards. Event types are shown in a table.

### Filters & Search

There are no filters or search on the Event Types list. All event types for your context are listed in the table.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|---|---|
| Name | Event type name (e.g., Graduation Ceremony, Parent Meeting). |
| Description | Short description of the event type, or "-" if none. |
| Status | **Active** or **Inactive**. Inactive types cannot be used for new events. |
| Actions | Buttons: **Fields** (open Form Designer), **Edit** (pencil), **Delete** (trash). |

### Row Actions

For each event type row:

- **Fields** — Opens the Form Designer for this event type. You can add/edit field groups and fields that will appear on the guest registration form for events of this type.
- **Edit** (pencil icon) — Opens the edit dialog to change name, school, description, and Active status.
- **Delete** (trash icon) — Opens a confirmation dialog. Deleting removes the event type; events that used this type will lose their type association.

### Bulk Actions

No bulk actions are available on this page.

---

## Creating a New Event Type

To create a new event type, click the **"Add Event Type"** button at the top right of the card. A dialog will open with the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| Name | Text | Yes | Name of the event type (e.g., Graduation Ceremony). |
| School | Dropdown | Yes | School this event type belongs to. |
| Description | Textarea | No | Optional description of the event type. |
| Active | Switch | No (default: On) | When On, the type can be used for new events. When Off (Inactive), it cannot be used for new events. |

Click **"Create"** to save. The dialog closes, a success message appears, and the table refreshes. You can then click **Fields** for that type to design the guest registration form.

### What Happens After Submission

- The event type is created and appears in the table.
- You can open **Fields** to add field groups and fields for the guest form.
- Inactive event types do not appear in the event type dropdown when creating or editing events (where that dropdown is available).

---

## Editing an Event Type

To edit an existing event type:

1. Find the event type in the table.
2. Click the **Edit** (pencil) button for that row.
3. The edit dialog opens with the current name, school, description, and Active switch.
4. Change any fields as needed.
5. Click **"Update"**.
6. A success message appears and the dialog closes; the table refreshes.

---

## Deleting an Event Type

To delete an event type:

1. Click the **Delete** (trash) button for that row.
2. A confirmation dialog appears: you are asked to confirm deletion of the event type by name, and warned that the action cannot be undone and that any events using this type will lose their association.
3. Click **"Delete"** to remove the event type, or **"Cancel"** to keep it.

---

## Form Designer (Fields)

The Form Designer configures the guest registration form for one event type. Open it by clicking **Fields** on an event type row. You can also reach it from the Event Types page when you choose to design fields for a type.

### What You Can Do in the Form Designer

- **Add Group** — Create a field group (e.g., "Contact Information") to organize fields. Each group has a title and can contain multiple fields.
- **Add Field** — Add a field either under a group or as an ungrouped field. You choose label, key (auto-generated from label if left blank), field type, group, placeholder, help text, required/enabled, and for select/multiselect you define options.
- **Edit Group** — Change the group title.
- **Edit Field** — Change label, key, field type, group, placeholder, help text, required, enabled, and for select/multiselect the options list.
- **Reorder fields** — Use up/down arrows to change the order of fields within a group or in the ungrouped list.
- **Enable/Disable field** — Toggle a field so it is shown or hidden on the guest form without deleting it.
- **Delete Group** — Remove a group; its fields become "Ungrouped."
- **Delete Field** — Remove a field from the form.
- **Save Changes** — Persist all groups and fields to the server. The button is enabled when there are unsaved changes.

### Field Types Available

- Text, Textarea, Phone, Number, Select, Multiselect, Date, Toggle, Email, ID Number, Address (and optionally Photo, File depending on backend support). Select and Multiselect require you to define options (value and label for each).

### Field Properties (Add/Edit Field)

| Property | Description |
|---|---|
| Label | Display name of the field (e.g., Phone Number). Required. |
| Key | Internal key (lowercase letters, numbers, underscores). Auto-generated from label if left empty. |
| Field Type | One of the types above. |
| Group | Assign the field to a group or "No group." |
| Placeholder | Hint text shown inside the field. |
| Help Text | Extra guidance shown below or near the field. |
| Required | When on, the guest must fill this field to submit. |
| Enabled | When on, the field is shown on the form; when off, it is hidden. |
| Options | For Select and Multiselect, list of value/label pairs. |

After making changes, click **"Save Changes"** in the Form Designer. A success message confirms that the guest form for this event type is updated.

---

## Tips & Best Practices

- **Create event types before events** — Define types (e.g., Graduation, Parent Meeting) first, then design their fields; then create events and assign a type where the UI supports it.
- **Use groups for clarity** — Group related fields (e.g., Contact Information, Address) so the guest form is easier to fill out.
- **Use Active/Inactive** — Set a type to Inactive instead of deleting it if you want to keep it for old events but prevent it from being used for new ones.
- **Required vs optional** — Mark only the fields you really need as Required to avoid discouraging guests from submitting the form.

---

## Related Pages

- [Events](/help-center/s/events/events) — Create and manage events, add guests, and run check-in. Event types define the kind of event and the guest registration form.

---

*Category: `events` | Language: `en`*
