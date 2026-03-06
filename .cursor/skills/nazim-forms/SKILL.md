---
name: nazim-forms
description: Form validation and React Hook Form patterns for Nazim. Use when adding or editing forms. Requires Zod schemas in /src/lib/validations/, zodResolver, Controller for Select/file, alignment with Laravel Form Request rules.
---

# Nazim Forms

All forms use **React Hook Form** with **Zod** validation. Schemas live in `/src/lib/validations/` and must align with backend Laravel Form Request rules.

## Schema Location and Structure

- **Path:** `frontend/src/lib/validations/yourResource.ts`
- **Export:** schema + type via `z.infer<typeof schema>`
- **Shared:** Use one schema per resource; do not duplicate across components

```typescript
import { z } from 'zod';
import { optionalUuidSchema, requiredStringLength, optionalStringLength } from './common';

export const yourResourceSchema = z.object({
  name: requiredStringLength(255, 'Name'),
  description: optionalStringLength(1000, 'Description'),
  organization_id: optionalUuidSchema,
});

export type YourResourceFormData = z.infer<typeof yourResourceSchema>;
```

## Component Usage

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { yourResourceSchema, type YourResourceFormData } from '@/lib/validations';

const { register, handleSubmit, control, formState: { errors } } = useForm<YourResourceFormData>({
  resolver: zodResolver(yourResourceSchema),
  defaultValues: { ... },
});

<form onSubmit={handleSubmit(onSubmit)}>
  <Input {...register('name')} />
  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
</form>
```

## Controller for Select and File

- **Select:** Use `Controller` with `value` / `onValueChange`; bind to `control` and `name`
- **File:** Use `Controller`; pass file via `onChange`; use `fileSchema` / `validateFile` from `@/lib/validations/fileUpload` when validating uploads
- **Cross-field:** Use `.refine()` on the schema (e.g. end_date >= start_date)

## Common Validation Utilities

From `/src/lib/validations/common.ts`:

- `uuidSchema`, `optionalUuidSchema`
- `emailSchema`, `optionalEmailSchema`
- `phoneSchema`
- `requiredStringLength(max, fieldName)`, `optionalStringLength(max, fieldName)`

## Rules

1. Always use **zodResolver** with React Hook Form
2. Always **show validation errors** to the user
3. **Align** frontend rules with backend Form Request validation
4. **Reset form** when dialogs close
5. Use **Controller** for Select and file inputs
6. Use `.optional().nullable()` where fields are optional

## Checklist

- [ ] Schema in `/src/lib/validations/`; type exported
- [ ] zodResolver(yourResourceSchema) on useForm
- [ ] Errors displayed for each validated field
- [ ] Select and file inputs use Controller
- [ ] Validation matches backend rules
- [ ] Form reset on dialog close where applicable
