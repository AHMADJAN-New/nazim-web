# Account & Profile

The Account & Profile page lets you view and edit your own user profile in the Nazim School Management System. You can update your display name, phone number, and avatar. Your email and role are managed by your administrator and cannot be changed here.

---

## Page Overview

When you open the profile page (via **Profile** in the user menu or **Settings → Profile**), you will see:

### Profile Card

- A single card titled **"My Profile"** with the description **"View and edit your profile information"**.
- An **Edit Profile** button at the top right when you are not editing.

### Read-Only Information

- **Email** — Your login email. It cannot be changed from this page.
- **Role** — Your assigned role (e.g. admin, staff, teacher). It cannot be changed from this page.

---

## Viewing Your Profile

1. Click your **user menu** (your name or avatar) in the header.
2. Select **Profile** (or go to **Settings** and then **Profile** if that is how your menu is set up).
3. The profile page opens with your current information:
   - **Avatar** — Your profile picture (or initials if no picture is set).
   - **Full Name** — Your display name.
   - **Email** — Read-only.
   - **Phone** — Your phone number (if set).
   - **Role** — Read-only.

---

## Editing Your Profile

To change your name, phone, or avatar:

1. On the profile page, click **"Edit Profile"**.
2. The form becomes editable. You can change:
   - **Full Name *** — Required. Enter your full name (max 255 characters).
   - **Phone** — Optional. Enter your phone number (max 50 characters).
   - **Avatar URL** — Optional. Enter a valid image URL (e.g. `https://example.com/avatar.jpg`) to set your profile picture.
3. Click **"Save Changes"** to save. You will see a success message and the form will switch back to view mode.
4. To discard changes, click **"Cancel"**. The form will revert to the last saved values.

### What Happens After Saving

- Your profile is updated on the server.
- The application refreshes your profile data so your name and avatar appear correctly in the header and elsewhere.
- If you see an error message, check that Full Name is not empty and that Avatar URL (if filled) is a valid URL.

---

## Form Fields Summary

| Field       | Type   | Required | Description                                        |
|------------|--------|----------|----------------------------------------------------|
| Full Name  | Text   | Yes      | Your display name. Max 255 characters.             |
| Email      | Text   | —        | Read-only. Your login email.                       |
| Phone      | Text   | No       | Your phone number. Max 50 characters.              |
| Avatar URL | Text   | No       | URL of your profile image. Must be a valid URL.    |
| Role       | Text   | —        | Read-only. Set by your administrator.              |

---

## Tips & Best Practices

- **Keep your full name up to date** so others in the school can identify you in reports and activity logs.
- **Add a phone number** if your school uses it for contact or notifications.
- **Use a direct image URL** for the avatar (e.g. from a trusted image host). Invalid URLs will cause validation errors.
- **Contact your administrator** if you need to change your email or role; those cannot be edited on this page.

---

## Related Pages

- [Getting Started](/help-center/s/general/getting-started) — Logging in and first steps
- [Dashboard](/help-center/s/general/dashboard) — Main dashboard overview
- [General Questions](/help-center/s/general/general-questions) — Frequently asked questions

---

*Category: `general` | Language: `en`*
