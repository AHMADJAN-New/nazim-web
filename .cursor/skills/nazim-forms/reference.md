# Forms Reference

## Validation Utilities (common.ts)

- `uuidSchema`, `optionalUuidSchema` — UUID validation
- `emailSchema`, `optionalEmailSchema` — Email
- `phoneSchema` — Phone number
- `requiredStringLength(max, fieldName)` — Required string with max length
- `optionalStringLength(max, fieldName)` — Optional string with max length

## File Upload

Use `fileSchema` and `validateFile` from `@/lib/validations/fileUpload` for file inputs. Use Controller for the file input and wire to form state.

## Cross-Field Example

```typescript
z.object({
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
}).refine(
  (data) => !data.start_date || !data.end_date || new Date(data.end_date) >= new Date(data.start_date),
  { message: 'End date must be after or equal to start date', path: ['end_date'] }
);
```

## Backend Alignment

Frontend rules should match or be stricter than Laravel Form Request rules. Backend is source of truth for security.
