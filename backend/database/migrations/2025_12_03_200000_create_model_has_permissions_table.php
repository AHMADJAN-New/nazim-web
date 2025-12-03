<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Note: Direct user permissions are not used in this app, but Spatie queries
     * the model_has_permissions table when checking permissions. Creating an
     * empty table prevents runtime SQL errors even though we do not store
     * records here.
     */
    public function up(): void
    {
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');

        // Bail out if config is missing
        if (empty($tableNames) || empty($columnNames)) {
            throw new \Exception('Error: config/permission.php not found or invalid.');
        }

        // Only create if it doesn't exist (keeps compatibility with earlier runs)
        if (!Schema::hasTable($tableNames['model_has_permissions'])) {
            Schema::create($tableNames['model_has_permissions'], function (Blueprint $table) use ($tableNames, $columnNames) {
                $table->unsignedBigInteger('permission_id');
                $table->string('model_type');
                $table->uuid($columnNames['model_morph_key']);
                $table->uuid('organization_id')->nullable();

                $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_model_id_model_type_index');

                $table->foreign('permission_id')
                    ->references('id')
                    ->on($tableNames['permissions'])
                    ->onDelete('cascade');

                $table->foreign('organization_id')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('cascade');

                $table->primary(['permission_id', $columnNames['model_morph_key'], 'model_type', 'organization_id'], 'model_has_permissions_permission_model_org_primary');
            });
        }

        // Create PostgreSQL triggers to automatically sync permissions
        // These triggers maintain model_has_permissions when roles are assigned/removed
        // or when permissions are added/removed from roles
        if (config('database.default') === 'pgsql') {
            DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION sync_permissions_on_role_grant()
RETURNS trigger AS $$
BEGIN
  INSERT INTO model_has_permissions (permission_id, model_type, model_id, organization_id)
  SELECT rp.permission_id, 'App\\Models\\User', NEW.model_id, NEW.organization_id
  FROM role_has_permissions rp
  WHERE rp.role_id = NEW.role_id
    AND (rp.organization_id = NEW.organization_id OR rp.organization_id IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM model_has_permissions mp
      WHERE mp.permission_id = rp.permission_id
        AND mp.model_type = 'App\\Models\\User'
        AND mp.model_id = NEW.model_id
        AND (mp.organization_id = NEW.organization_id OR mp.organization_id IS NULL)
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_permissions_on_role_revoke()
RETURNS trigger AS $$
BEGIN
  DELETE FROM model_has_permissions mp
  USING role_has_permissions rp
  WHERE mp.permission_id = rp.permission_id
    AND rp.role_id = OLD.role_id
    AND mp.model_type = 'App\\Models\\User'
    AND mp.model_id = OLD.model_id
    AND (mp.organization_id = OLD.organization_id OR mp.organization_id IS NULL)
    AND (rp.organization_id = OLD.organization_id OR rp.organization_id IS NULL);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_permissions_on_role_permission_upsert()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO model_has_permissions (permission_id, model_type, model_id, organization_id)
    SELECT NEW.permission_id, 'App\\Models\\User', mr.model_id, mr.organization_id
    FROM model_has_roles mr
    WHERE mr.role_id = NEW.role_id
      AND (mr.organization_id = NEW.organization_id OR NEW.organization_id IS NULL OR mr.organization_id IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM model_has_permissions mp
        WHERE mp.permission_id = NEW.permission_id
          AND mp.model_type = 'App\\Models\\User'
          AND mp.model_id = mr.model_id
          AND (mp.organization_id = mr.organization_id OR mp.organization_id IS NULL)
      );
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM model_has_permissions mp
    WHERE mp.permission_id = OLD.permission_id
      AND mp.model_type = 'App\\Models\\User'
      AND EXISTS (
        SELECT 1 FROM model_has_roles mr
        WHERE mr.role_id = OLD.role_id
          AND mr.model_id = mp.model_id
          AND (mr.organization_id = mp.organization_id OR mr.organization_id IS NULL)
      );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_perm_role_grant ON model_has_roles;
CREATE TRIGGER trg_sync_perm_role_grant
AFTER INSERT ON model_has_roles
FOR EACH ROW EXECUTE FUNCTION sync_permissions_on_role_grant();

DROP TRIGGER IF EXISTS trg_sync_perm_role_revoke ON model_has_roles;
CREATE TRIGGER trg_sync_perm_role_revoke
AFTER DELETE ON model_has_roles
FOR EACH ROW EXECUTE FUNCTION sync_permissions_on_role_revoke();

DROP TRIGGER IF EXISTS trg_sync_perm_role_perm ON role_has_permissions;
CREATE TRIGGER trg_sync_perm_role_perm
AFTER INSERT OR DELETE ON role_has_permissions
FOR EACH ROW EXECUTE FUNCTION sync_permissions_on_role_permission_upsert();
SQL
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tableNames = config('permission.table_names');

        if (empty($tableNames)) {
            throw new \Exception('Error: config/permission.php not found and defaults could not be merged.');
        }

        // Drop triggers and functions if using PostgreSQL
        if (config('database.default') === 'pgsql') {
            DB::unprepared(<<<'SQL'
DROP TRIGGER IF EXISTS trg_sync_perm_role_grant ON model_has_roles;
DROP TRIGGER IF EXISTS trg_sync_perm_role_revoke ON model_has_roles;
DROP TRIGGER IF EXISTS trg_sync_perm_role_perm ON role_has_permissions;
DROP FUNCTION IF EXISTS sync_permissions_on_role_grant();
DROP FUNCTION IF EXISTS sync_permissions_on_role_revoke();
DROP FUNCTION IF EXISTS sync_permissions_on_role_permission_upsert();
SQL
            );
        }

        Schema::dropIfExists($tableNames['model_has_permissions']);
    }
};
