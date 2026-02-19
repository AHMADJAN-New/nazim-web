# Subscription Renew

The Subscription Renew page is where you complete a subscription renewal or upgrade. You select a plan (usually from the Plans page), choose payment currency (AFN or USD), optionally add more schools and a discount code, then submit a renewal request. Your team or the platform administrator verifies payment and activates the subscription. School administrators use this page to renew before or after expiry, or to upgrade to a higher plan.

---

## Page Overview

When you open the Renew page (from **Subscription** → **Renew**, or from **Plans** after selecting a plan, with optional URL params `?plan=...&schools=...`), you will see:

### Header

- **Back** — Arrow button linking to **Subscription Plans**.
- **Title** — "Renew Subscription".
- **Description** — "Complete your subscription renewal".

### Layout

The page is a **form** with two main columns (on desktop):

- **Left column** — Selected plan, currency, additional schools, discount code, notes.
- **Right column** — Price breakdown and submit button.

---

## Form Fields and Sections

### Selected Plan Card

- **Title** — "Selected Plan".
- **Plan name** and **description** (read-only).
- **Slug** badge (e.g. starter, pro) and optional **Default** badge.

### Payment Currency

- **Title** — "Payment Currency".
- **Dropdown** — **AFN (Afghan Afghani)** or **USD (US Dollar)**. Required; default is AFN.

### Additional Schools (if plan allows)

- Shown only when the selected plan supports more than one school (`maxSchools > 1`).
- **Title** — "Additional Schools".
- **Description** — Add more schools (up to plan max).
- **Field** — "Number of Additional Schools" (number input, min 0, max = plan’s max schools).
- **Note** — Per-school price in selected currency (e.g. X AFN or Y USD per school/year).

### Discount Code (optional)

- **Title** — "Discount Code (Optional)".
- **Input** — Text field for the code.
- **Validate** button — Click to validate the code. On success, a green message appears and the price breakdown updates. On failure, an error message is shown.
- Validated discount is applied in the price breakdown.

### Additional Notes (optional)

- **Title** — "Additional Notes (Optional)".
- **Textarea** — For any extra information (e.g. payment reference, special requests).

### Price Breakdown Card

- **Title** — "Price Breakdown" (with calculator icon).
- **Content** (after calculation):
  - **Base Price** — Plan price in selected currency.
  - **Additional Schools** — If any: count and total schools price.
  - **Discount** — If a valid code is applied: discount amount (green, minus).
  - **Total** — Final amount in selected currency.
  - Optional **Discount info** — Code name and type (percentage or fixed value).
- If options are missing or calculation is pending, "Select options to see price" or a loading state is shown.

### Submit and Back

- **Submit Renewal Request** — Primary button. Submits the renewal request; while pending, shows "Submitting...". Disabled when calculation is pending or no price breakdown.
- **Back to Plans** — Outline button linking to Subscription Plans.
- **Note** — "After submitting, our team will verify your payment and activate your subscription."

---

## Step-by-Step: Renewing Your Subscription

1. Go to **Subscription** and click **Renew**, or go to **Subscription Plans**, choose a plan, and click **Select**.
2. On the Renew page, confirm the **Selected Plan**.
3. Choose **Payment Currency** (AFN or USD).
4. If the plan allows, enter **Number of Additional Schools** (0 or more).
5. Optionally enter a **Discount Code** and click **Validate**; wait for the green confirmation and updated price.
6. Optionally fill **Additional Notes**.
7. Check the **Price Breakdown** (base, schools, discount, total).
8. Click **Submit Renewal Request**.
9. After success, you are redirected to the **Subscription** page. Wait for the team to verify payment and activate; you will receive confirmation.

---

## If Plan Not Found

- If the URL has an invalid or missing plan ID, the page shows "Plan not found" and a **Back to Plans** button. Use it to choose a plan again from the Plans page.

---

## Tips & Best Practices

- **Validate the discount code** before submitting so the total reflects the correct amount.
- **Use Additional Notes** to give payment reference or method (e.g. bank transfer, check number) to speed up verification.
- **Choose the correct currency** (AFN or USD) to match how you will pay.
- **Add schools only if needed**; the per-school price is shown so you can see the impact in the breakdown.

---

## Related Pages

- [Subscription](/help-center/s/subscription/subscription) — View status after renewal
- [Subscription Plans](/help-center/s/subscription/subscription-plans) — Choose a plan before renewing
- [Maintenance Fees](/help-center/s/subscription/subscription-maintenance-fees) — Recurring fees after subscription is active
- [License Fees](/help-center/s/subscription/subscription-license-fees) — One-time license fee

---

*Category: `subscription` | Language: `en`*
