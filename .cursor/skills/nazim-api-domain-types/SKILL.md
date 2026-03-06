---
name: nazim-api-domain-types
description: Enforces API vs Domain type separation for Nazim frontend. Use when creating new resources, hooks, mappers, or components. Covers snake_case API types, camelCase domain types, mapper layer, and component usage.
---

# Nazim API vs Domain Type Separation

All modules MUST follow the API/Domain type separation pattern for maintainability and type safety.

## File Structure

```
frontend/src/
├── types/api/{resource}.ts      # snake_case, matches Laravel API
├── types/domain/{resource}.ts   # camelCase, nested UI model
├── mappers/{resource}Mapper.ts   # API ↔ Domain conversion
├── hooks/use{Resource}.tsx      # Returns domain models
└── pages/{Resource}.tsx         # Uses domain types only
```

## API Types (`types/api/{resource}.ts`)

- Match Laravel API response exactly (snake_case)
- Use `string` for dates (ISO strings)
- Export: `Resource`, `ResourceInsert`, `ResourceUpdate`
- No "Api" suffix in type names

```typescript
export interface Student {
  id: string;
  organization_id: string;
  school_id: string | null;
  admission_no: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}
export interface StudentInsert { /* ... */ }
export type StudentUpdate = Partial<StudentInsert>;
```

## Domain Types (`types/domain/{resource}.ts`)

- camelCase for all fields
- Nested structures (Address, Guardian[], etc.)
- `Date` objects for dates (not strings)
- Business logic types (Status enums)

```typescript
export interface Student {
  id: string;
  organizationId: string;
  schoolId: string | null;
  admissionNumber: string;
  fullName: string;
  address: Address;
  guardians: Guardian[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Mapper (`mappers/{resource}Mapper.ts`)

- `mapResourceApiToDomain(api: Api.Student): Student`
- `mapResourceDomainToInsert(domain: Partial<Student>): StudentInsert`
- `mapResourceDomainToUpdate(domain: Partial<Student>): StudentUpdate`
- Handle nested: flatten for API, nest for Domain
- Convert dates: string ↔ Date

```typescript
import type * as StudentApi from '@/types/api/student';
import type { Student } from '@/types/domain/student';

export function mapStudentApiToDomain(api: StudentApi.Student): Student { /* ... */ }
export function mapStudentDomainToInsert(domain: Partial<Student>): StudentApi.StudentInsert { /* ... */ }
```

## Hooks

- Import API types: `import type * as ResourceApi from '@/types/api/resource'`
- Import Domain: `import type { Resource } from '@/types/domain/resource'`
- In queryFn: map API → Domain with `mapResourceApiToDomain`
- In mutations: map Domain → API with `mapResourceDomainToInsert`
- Re-export domain types: `export type { Resource } from '@/types/domain/resource'`

## Components

- Use domain types only; never import API types
- Use camelCase properties: `student.fullName`, `student.address.city`
- Use `Date` objects for dates

## New Module Checklist

1. Create `types/api/{resource}.ts` (snake_case, match Laravel)
2. Create `types/domain/{resource}.ts` (camelCase, nested)
3. Create `mappers/{resource}Mapper.ts` (bidirectional conversion)
4. Create hooks: map in queryFn, map in mutations, re-export domain
5. Components: import domain types only

## Additional Resources

- Full mapper, hook, and component examples: [examples.md](examples.md)
