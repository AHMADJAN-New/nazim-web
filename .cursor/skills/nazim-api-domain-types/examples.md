# API/Domain Type Examples

## Full Mapper Example

```typescript
// mappers/studentMapper.ts
import type * as StudentApi from '@/types/api/student';
import type { Student, Address } from '@/types/domain/student';

export function mapStudentApiToDomain(api: StudentApi.Student): Student {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    admissionNumber: api.admission_no,
    fullName: api.full_name,
    fatherName: api.father_name,
    address: {
      street: api.home_address || '',
      city: api.curr_district || '',
      state: '',
      country: '',
      postalCode: '',
    },
    guardians: api.guardian_name ? [{
      id: `guardian-${api.id}`,
      firstName: api.guardian_name.split(' ')[0] || '',
      lastName: api.guardian_name.split(' ').slice(1).join(' ') || '',
    }] : [],
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
  };
}

export function mapStudentDomainToInsert(domain: Partial<Student>): StudentApi.StudentInsert {
  return {
    admission_no: domain.admissionNumber || '',
    full_name: domain.fullName || '',
    father_name: domain.fatherName || '',
    organization_id: domain.organizationId || null,
    school_id: domain.schoolId || null,
    home_address: domain.address ? `${domain.address.street}, ${domain.address.city}` : null,
    guardian_name: domain.guardians?.[0]
      ? `${domain.guardians[0].firstName} ${domain.guardians[0].lastName}`
      : null,
    birth_date: domain.dateOfBirth?.toISOString().slice(0, 10) || null,
  };
}

export function mapStudentDomainToUpdate(domain: Partial<Student>): StudentApi.StudentUpdate {
  return mapStudentDomainToInsert(domain);
}
```

## Hook Usage

```typescript
// In useStudents.tsx
const apiStudents = await studentsApi.list({ organization_id: profile.organization_id });
return (apiStudents as StudentApi.Student[]).map(mapStudentApiToDomain);

// In useCreateStudent mutation
const insertData = mapStudentDomainToInsert({ ...payload, organizationId: profile?.organization_id });
const apiStudent = await studentsApi.create(insertData);
return mapStudentApiToDomain(apiStudent as StudentApi.Student);
```

## Component Usage

```typescript
// In Students.tsx - only domain types
import type { Student } from '@/types/domain/student';

{students?.map(student => (
  <div key={student.id}>
    <h2>{student.fullName}</h2>
    <p>{student.admissionNumber}</p>
    <p>{student.address.city}</p>
  </div>
))}
```
