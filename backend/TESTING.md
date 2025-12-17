# Backend Testing Guide

This document explains how to run and write tests for the Nazim backend API.

## Table of Contents

- [Overview](#overview)
- [Test Setup](#test-setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

---

## Overview

The Nazim backend uses **PHPUnit** for testing with:

- **Database**: PostgreSQL test database (`nazim_web_test`)
- **Traits**: `RefreshDatabase` for automatic database reset between tests
- **Factories**: Model factories for creating test data
- **Helpers**: Custom test helpers in `TestCase.php`

### Test Structure

```
backend/tests/
├── Feature/               # API endpoint tests
│   ├── AuthenticationTest.php
│   ├── OrganizationMultiTenancyTest.php
│   ├── StudentManagementTest.php
│   ├── StaffManagementTest.php
│   ├── ExamSystemTest.php
│   └── FinanceModuleTest.php
├── Unit/                  # Unit tests for individual classes
│   └── ExampleTest.php
└── TestCase.php          # Base test class with helpers
```

---

## Test Setup

### 1. Database Configuration

Create a test database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE nazim_web_test;
```

### 2. Environment Configuration

Tests use `phpunit.xml` configuration which sets:

- `DB_CONNECTION=pgsql`
- `DB_DATABASE=nazim_web_test`
- `DB_USERNAME=postgres`
- `DB_PASSWORD=root`

You can override these in `backend/.env.testing` if needed.

### 3. Install Dependencies

```bash
cd backend
composer install
```

---

## Running Tests

### Run All Tests

```bash
cd backend
php artisan test
```

### Run Specific Test Suite

```bash
# Feature tests only
php artisan test --testsuite=Feature

# Unit tests only
php artisan test --testsuite=Unit
```

### Run Specific Test File

```bash
php artisan test tests/Feature/AuthenticationTest.php
```

### Run Specific Test Method

```bash
php artisan test --filter user_can_login_with_valid_credentials
```

### Run Tests with Coverage (requires Xdebug)

```bash
php artisan test --coverage
```

### Verbose Output

```bash
php artisan test --verbose
```

---

## Writing Tests

### Basic Test Structure

```php
<?php

namespace Tests\Feature;

use App\Models\Student;
use Tests\TestCase;

class StudentTest extends TestCase
{
    /** @test */
    public function user_can_create_student()
    {
        // Arrange: Create authenticated user
        $user = $this->authenticate();

        // Act: Make API request
        $response = $this->jsonAs($user, 'POST', '/api/students', [
            'full_name' => 'Test Student',
            'father_name' => 'Test Father',
            'gender' => 'male',
            // ... other fields
        ]);

        // Assert: Check response and database
        $response->assertStatus(201);
        $this->assertDatabaseHas('students', [
            'full_name' => 'Test Student',
        ]);
    }
}
```

### Using Test Helpers

The `TestCase` class provides helpful methods:

#### 1. Create and Authenticate User

```php
// Create and authenticate a user
$user = $this->authenticate();

// Create user without authenticating
$user = $this->createUser();

// Create user with specific organization
$org = Organization::factory()->create();
$user = $this->authenticate([], ['organization_id' => $org->id], $org);
```

#### 2. Make Authenticated API Requests

```php
// GET request
$response = $this->jsonAs($user, 'GET', '/api/students');

// POST request
$response = $this->jsonAs($user, 'POST', '/api/students', $data);

// PUT request
$response = $this->jsonAs($user, 'PUT', "/api/students/{$id}", $data);

// DELETE request
$response = $this->jsonAs($user, 'DELETE', "/api/students/{$id}");
```

#### 3. Get User's Organization

```php
$organization = $this->getUserOrganization($user);
```

#### 4. Assert Validation Errors

```php
$this->assertHasValidationErrors($response, ['email', 'password']);
```

### Using Factories

Create test data using factories:

```php
// Create a single student
$student = Student::factory()->create([
    'organization_id' => $organization->id,
]);

// Create multiple students
$students = Student::factory()->count(5)->create([
    'organization_id' => $organization->id,
]);

// Use factory states
$orphan = Student::factory()->orphan()->create();
$inactive = Student::factory()->inactive()->create();
```

### Available Factories

- `User::factory()`
- `Organization::factory()`
- `Profile::factory()`
- `Student::factory()` - States: `orphan()`, `inactive()`, `graduated()`
- `Staff::factory()` - States: `teacher()`, `inactive()`
- `Exam::factory()` - States: `ongoing()`, `completed()`
- `AcademicYear::factory()` - States: `current()`
- `FinanceAccount::factory()` - States: `inactive()`
- `ClassModel::factory()`

---

## Test Coverage

### Current Test Coverage

| Module | Tests | Coverage |
|--------|-------|----------|
| Authentication | 10 tests | ✅ Comprehensive |
| Multi-tenancy | 8 tests | ✅ Comprehensive |
| Students | 12 tests | ✅ Comprehensive |
| Staff | 7 tests | ✅ Good |
| Exams | 7 tests | ✅ Good |
| Finance | 8 tests | ✅ Good |

### What's Tested

✅ **Authentication**
- Login/logout
- Password change
- Profile updates
- Organization auto-assignment

✅ **Organization Multi-tenancy**
- Data isolation
- Organization-scoped queries
- Cross-organization access prevention
- Super admin privileges

✅ **Student Management**
- CRUD operations
- Filtering (status, gender)
- Search functionality
- Student code generation
- Orphan tracking

✅ **Staff Management**
- CRUD operations
- Staff code generation
- Employment status filtering
- Organization scoping

✅ **Exam System**
- CRUD operations
- Status and type filtering
- Date validation
- Organization scoping

✅ **Finance Module**
- Finance account management
- Multi-currency support
- Balance validation
- Organization scoping

### What Needs More Testing

⚠️ **Needs Addition:**
- Exam enrollment tests
- Exam results/marks tests
- DMS (Document Management) tests
- Attendance system tests
- Report generation tests
- Permission/authorization tests
- File upload tests

---

## CI/CD Integration

Tests run automatically on GitHub Actions for:

- **Every push** to any branch
- **Every pull request**

### CI Workflow

The CI pipeline runs:

1. **Frontend Tests** (npm test)
2. **Backend Tests** (php artisan test) with PostgreSQL

See `.github/workflows/test.yml` for configuration.

### Required for PR Merge

- ✅ All tests must pass
- ✅ No new test failures introduced
- ✅ Code follows Laravel standards

---

## Best Practices

### 1. Test Naming

Use descriptive test names with underscores:

```php
/** @test */
public function user_can_create_student_with_valid_data()

/** @test */
public function user_cannot_access_student_from_different_organization()
```

### 2. AAA Pattern

Follow Arrange-Act-Assert pattern:

```php
public function test_example()
{
    // Arrange: Set up test data
    $user = $this->authenticate();
    $student = Student::factory()->create();

    // Act: Perform the action
    $response = $this->jsonAs($user, 'GET', "/api/students/{$student->id}");

    // Assert: Verify the result
    $response->assertStatus(200);
    $response->assertJson(['id' => $student->id]);
}
```

### 3. Database Isolation

Always use `RefreshDatabase` trait:

```php
use Illuminate\Foundation\Testing\RefreshDatabase;

class MyTest extends TestCase
{
    use RefreshDatabase;
}
```

### 4. Organization Scoping

Always test organization isolation:

```php
public function user_cannot_access_data_from_other_organization()
{
    $org1 = Organization::factory()->create();
    $org2 = Organization::factory()->create();

    $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1);
    $resourceOrg2 = Model::factory()->create(['organization_id' => $org2->id]);

    $response = $this->jsonAs($user1, 'GET', "/api/resource/{$resourceOrg2->id}");

    $this->assertContains($response->status(), [403, 404]);
}
```

### 5. Test Data Factory Usage

Create realistic test data:

```php
// Good: Specific to test
$student = Student::factory()->create([
    'full_name' => 'Ahmad Khan',
    'gender' => 'male',
]);

// Better: Use factory defaults
$student = Student::factory()->male()->create();
```

### 6. Assertion Best Practices

```php
// Assert status
$response->assertStatus(200);

// Assert JSON structure
$response->assertJsonStructure(['id', 'name']);

// Assert JSON fragment
$response->assertJsonFragment(['status' => 'active']);

// Assert database
$this->assertDatabaseHas('students', ['full_name' => 'Ahmad']);

// Assert soft delete
$this->assertSoftDeleted('students', ['id' => $student->id]);
```

### 7. Testing Validation

```php
public function test_validation_errors()
{
    $user = $this->authenticate();

    $response = $this->jsonAs($user, 'POST', '/api/students', []);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['full_name', 'gender']);
}
```

---

## Troubleshooting

### Common Issues

**1. Database connection error**

```bash
# Ensure test database exists
psql -U postgres -c "CREATE DATABASE nazim_web_test;"
```

**2. Migration errors**

```bash
# Fresh migration
php artisan migrate:fresh --env=testing
```

**3. Factory not found**

Ensure factory exists in `database/factories/` and matches model name.

**4. Authentication issues**

Use `$this->authenticate()` instead of manually creating tokens.

---

## Additional Resources

- [Laravel Testing Documentation](https://laravel.com/docs/testing)
- [PHPUnit Documentation](https://phpunit.de/documentation.html)
- [Laravel Factories](https://laravel.com/docs/eloquent-factories)
- [HTTP Tests](https://laravel.com/docs/http-tests)

---

## Contributing

When adding new features:

1. ✅ Write tests for new API endpoints
2. ✅ Test organization scoping
3. ✅ Test validation rules
4. ✅ Test permission requirements
5. ✅ Ensure all tests pass before committing

**Minimum coverage target: 70%**

---

For questions or issues, please contact the development team or create an issue on GitHub.
