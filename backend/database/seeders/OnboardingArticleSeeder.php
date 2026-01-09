<?php

namespace Database\Seeders;

use App\Models\HelpCenterArticle;
use App\Models\HelpCenterCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class OnboardingArticleSeeder extends Seeder
{
    /**
     * Seed the onboarding article in the help center.
     * 
     * Creates a global onboarding article visible only to admin and organization_admin roles.
     */
    public function run(): void
    {
        $this->command->info('Seeding onboarding article...');

        // Step 1: Find or create "Getting Started" global category
        $category = HelpCenterCategory::whereNull('organization_id')
            ->where('slug', 'getting-started')
            ->whereNull('deleted_at')
            ->first();

        if (!$category) {
            $this->command->info('  Creating "Getting Started" category...');
            $category = HelpCenterCategory::create([
                'organization_id' => null, // Global category
                'name' => 'Getting Started',
                'slug' => 'getting-started',
                'description' => 'Learn the basics of using Nazim School Management System',
                'icon' => 'book-open',
                'color' => 'blue',
                'order' => 1,
                'is_active' => true,
                'parent_id' => null,
                'article_count' => 0,
            ]);
            $this->command->info('  ✓ Created "Getting Started" category');
        } else {
            $this->command->info('  ✓ "Getting Started" category already exists');
        }

        // Step 2: Check if onboarding article already exists
        $existingArticle = HelpCenterArticle::whereNull('organization_id')
            ->where('slug', 'welcome-getting-started-guide')
            ->whereNull('deleted_at')
            ->first();

        if ($existingArticle) {
            $this->command->info('  ✓ Onboarding article already exists, skipping...');
            return;
        }

        // Step 3: Create onboarding article
        $this->command->info('  Creating onboarding article...');
        
        $onboardingContent = <<<'MARKDOWN'
# Welcome to Nazim - Getting Started Guide

Welcome to Nazim School Management System! This guide will help you get started with managing your school efficiently.

## Overview

Nazim is a comprehensive school management system designed to help you manage all aspects of your educational institution, from student enrollment to financial management.

## Getting Started

### 1. Dashboard Overview

Your dashboard provides a quick overview of key metrics and activities:
- **Total Students**: View the number of enrolled students
- **Total Staff**: See your staff count
- **Recent Activities**: Track recent system activities
- **Quick Actions**: Access common tasks quickly

### 2. User Management

As an administrator, you can:
- **Create Users**: Add new staff members, teachers, and administrators
- **Manage Permissions**: Assign specific permissions to users based on their roles
- **User Roles**: Organize users by roles (admin, teacher, staff, etc.)

### 3. School Management

Set up your school infrastructure:
- **Schools**: Manage multiple schools if you have a multi-school setup
- **Buildings**: Organize your school buildings
- **Rooms**: Assign rooms to classes and activities

### 4. Academic Settings

Configure your academic structure:
- **Academic Years**: Create and manage academic years
- **Classes**: Set up classes for each academic year
- **Subjects**: Define subjects and assign them to classes
- **Timetables**: Create class schedules

### 5. Student Management

Manage student information:
- **Student Registration**: Register new students
- **Student Admissions**: Admit students to classes
- **Student Profiles**: View and update student information
- **Student Documents**: Manage student documents and records

### 6. Staff Management

Manage your staff:
- **Staff Registration**: Add new staff members
- **Teacher Assignments**: Assign teachers to classes and subjects
- **Staff Profiles**: View and update staff information

### 7. Settings & Configuration

Customize your organization:
- **Organization Settings**: Configure organization details
- **School Branding**: Customize logos, colors, and branding
- **User Permissions**: Manage roles and permissions
- **System Preferences**: Configure system-wide settings

### 8. Subscription Management

Monitor your subscription:
- **Subscription Status**: View your current plan and status
- **Usage Statistics**: Track your usage of system features
- **Upgrade Options**: Explore plan upgrades if needed

## Next Steps

1. **Complete the App Tour**: Take the interactive tour to familiarize yourself with the system
2. **Set Up Your School**: Configure schools, buildings, and rooms
3. **Create Academic Structure**: Set up academic years, classes, and subjects
4. **Add Staff**: Register your staff members and assign roles
5. **Register Students**: Start enrolling students into your system

## Need Help?

- **Help Center**: Browse articles in the Help Center for detailed guides
- **Contextual Help**: Look for help icons throughout the system
- **Support**: Contact support if you need additional assistance

## Tips

- Use the sidebar navigation to quickly access different sections
- Check your dashboard regularly for important updates
- Set up notifications to stay informed about system activities
- Customize your profile and preferences in Settings

Welcome aboard, and happy managing!
MARKDOWN;

        try {
            $article = HelpCenterArticle::create([
                'organization_id' => null, // Global article
                'category_id' => $category->id,
                'title' => 'Welcome to Nazim - Getting Started Guide',
                'slug' => 'welcome-getting-started-guide',
                'excerpt' => 'A comprehensive guide to help you get started with Nazim School Management System. Learn about key features, setup steps, and best practices.',
                'content' => $onboardingContent,
                'content_type' => 'markdown',
                'featured_image_url' => null,
                'is_published' => true,
                'is_featured' => true,
                'is_pinned' => true,
                'status' => 'published',
                'visibility' => 'org_users',
                'context_key' => 'onboarding.read', // Special context key for onboarding
                'route_pattern' => null,
                'meta_title' => 'Welcome to Nazim - Getting Started Guide',
                'meta_description' => 'A comprehensive guide to help you get started with Nazim School Management System',
                'tags' => ['onboarding', 'getting-started', 'guide', 'welcome'],
                'view_count' => 0,
                'helpful_count' => 0,
                'not_helpful_count' => 0,
                'order' => 0,
                'author_id' => null,
                'created_by' => null,
                'updated_by' => null,
                'related_article_ids' => [],
                'published_at' => now(),
            ]);

            $this->command->info('  ✓ Created onboarding article successfully!');
            $this->command->info("    Article ID: {$article->id}");
            $this->command->info("    Slug: {$article->slug}");
        } catch (\Exception $e) {
            $this->command->error("  ✗ Failed to create onboarding article: {$e->getMessage()}");
            throw $e;
        }

        $this->command->info('✅ Onboarding article seeded successfully!');
    }
}


