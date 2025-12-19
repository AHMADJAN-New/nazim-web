<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class GraduationCertificatePermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            // Graduation Batches
            'graduation_batches.read' => 'View graduation batches',
            'graduation_batches.create' => 'Create graduation batches',
            'graduation_batches.generate_students' => 'Generate students for graduation batch',
            'graduation_batches.approve' => 'Approve graduation batches',

            // Certificate Templates
            'certificate_templates.read' => 'View certificate templates',
            'certificate_templates.create' => 'Create certificate templates',
            'certificate_templates.update' => 'Update certificate templates',
            'certificate_templates.delete' => 'Delete certificate templates',

            // Issued Certificates
            'issued_certificates.read' => 'View issued certificates',
            'certificates.issue' => 'Issue certificates to students',
            'certificates.revoke' => 'Revoke issued certificates',
            'certificates.print' => 'Download/print certificates',
        ];

        foreach ($permissions as $name => $description) {
            Permission::firstOrCreate(
                ['name' => $name],
                ['guard_name' => 'web', 'description' => $description]
            );
        }

        $this->command->info('Graduation & Certificate permissions created successfully!');
    }
}
