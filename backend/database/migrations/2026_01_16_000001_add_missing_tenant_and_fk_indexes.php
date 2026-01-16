<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const SCHEMA = 'public';

    public function up(): void
    {
        // Ensure tenant-scoped lookup performance across the schema.
        // - Always index organization_id and school_id when present.
        // - Index foreign key columns when they are not already indexed (FKs are not auto-indexed in Postgres).

        $tables = $this->listPublicTables();
        $foreignKeyColumnsByTable = $this->listForeignKeyColumnsByTable();

        foreach ($tables as $table) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            $hasOrganizationId = Schema::hasColumn($table, 'organization_id');
            $hasSchoolId = Schema::hasColumn($table, 'school_id');

            // Only enforce indexes for tenant-scoped tables.
            // This keeps the migration focused and avoids indexing global/framework tables unnecessarily.
            if (!$hasOrganizationId && !$hasSchoolId) {
                continue;
            }

            if ($hasOrganizationId) {
                $this->ensureIndexPrefix($table, ['organization_id'], 'org');
            }

            if ($hasSchoolId) {
                $this->ensureIndexPrefix($table, ['school_id'], 'school');
            }

            foreach (($foreignKeyColumnsByTable[$table] ?? []) as $column) {
                if (!Schema::hasColumn($table, $column)) {
                    continue;
                }

                // Avoid redundant work: org/school already handled above.
                if ($column === 'organization_id' || $column === 'school_id') {
                    continue;
                }

                $this->ensureIndexPrefix($table, [$column], 'fk_' . $column);
            }
        }
    }

    public function down(): void
    {
        $tables = $this->listPublicTables();
        $foreignKeyColumnsByTable = $this->listForeignKeyColumnsByTable();

        foreach ($tables as $table) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            $hasOrganizationId = Schema::hasColumn($table, 'organization_id');
            $hasSchoolId = Schema::hasColumn($table, 'school_id');

            if (!$hasOrganizationId && !$hasSchoolId) {
                continue;
            }

            if ($hasOrganizationId) {
                $this->dropIndexIfExists($table, 'org');
            }

            if ($hasSchoolId) {
                $this->dropIndexIfExists($table, 'school');
            }

            foreach (($foreignKeyColumnsByTable[$table] ?? []) as $column) {
                if (!Schema::hasColumn($table, $column)) {
                    continue;
                }

                if ($column === 'organization_id' || $column === 'school_id') {
                    continue;
                }

                $this->dropIndexIfExists($table, 'fk_' . $column);
            }
        }
    }

    /**
     * @return list<string>
     */
    private function listPublicTables(): array
    {
        $rows = DB::select(
            "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = ? ORDER BY tablename",
            [self::SCHEMA]
        );

        return array_values(array_map(static fn ($row) => (string) $row->tablename, $rows));
    }

    /**
     * @return array<string, list<string>>
     */
    private function listForeignKeyColumnsByTable(): array
    {
        $rows = DB::select(
            "SELECT kcu.table_name, kcu.column_name\n" .
                "FROM information_schema.table_constraints tc\n" .
                "JOIN information_schema.key_column_usage kcu\n" .
                "  ON tc.constraint_name = kcu.constraint_name\n" .
                " AND tc.table_schema = kcu.table_schema\n" .
                "WHERE tc.constraint_type = 'FOREIGN KEY'\n" .
                "  AND tc.table_schema = ?",
            [self::SCHEMA]
        );

        $result = [];
        foreach ($rows as $row) {
            $table = (string) $row->table_name;
            $column = (string) $row->column_name;

            $result[$table] ??= [];
            if (!in_array($column, $result[$table], true)) {
                $result[$table][] = $column;
            }
        }

        return $result;
    }

    /**
     * Ensure there is an index whose leading columns match $columns.
     *
     * @param list<string> $columns
     */
    private function ensureIndexPrefix(string $table, array $columns, string $suffix): void
    {
        if ($this->hasIndexPrefix($table, $columns)) {
            return;
        }

        $indexName = $this->makeIndexName($table, $suffix);
        $colsSql = implode(', ', array_map([$this, 'quoteIdent'], $columns));

        DB::statement(
            sprintf(
                'CREATE INDEX IF NOT EXISTS %s ON %s.%s (%s)',
                $this->quoteIdent($indexName),
                self::SCHEMA,
                $this->quoteIdent($table),
                $colsSql
            )
        );
    }

    /**
     * @param list<string> $columns
     */
    private function hasIndexPrefix(string $table, array $columns): bool
    {
        // Detect existing indexes by column list (not index name), to avoid creating duplicates.
        // Only considers the index *key* columns, in order.
        $rows = DB::select(
            "SELECT i.relname AS index_name,\n" .
                "       json_agg(a.attname ORDER BY x.n) AS columns\n" .
                "FROM pg_index ix\n" .
                "JOIN pg_class t ON t.oid = ix.indrelid\n" .
                "JOIN pg_namespace ns ON ns.oid = t.relnamespace\n" .
                "JOIN pg_class i ON i.oid = ix.indexrelid\n" .
                "JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS x(attnum, n) ON true\n" .
                "JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.attnum\n" .
                "WHERE ns.nspname = ?\n" .
                "  AND t.relname = ?\n" .
                "  AND ix.indisvalid = true\n" .
                "  AND ix.indisready = true\n" .
                "GROUP BY i.relname",
            [self::SCHEMA, $table]
        );

        foreach ($rows as $row) {
            $decoded = json_decode((string) $row->columns, true);
            if (!is_array($decoded)) {
                continue;
            }

            $prefix = array_slice($decoded, 0, count($columns));
            if ($prefix === $columns) {
                return true;
            }
        }

        return false;
    }

    private function dropIndexIfExists(string $table, string $suffix): void
    {
        $indexName = $this->makeIndexName($table, $suffix);

        DB::statement(
            sprintf(
                'DROP INDEX IF EXISTS %s.%s',
                self::SCHEMA,
                $this->quoteIdent($indexName)
            )
        );
    }

    private function quoteIdent(string $identifier): string
    {
        return '"' . str_replace('"', '""', $identifier) . '"';
    }

    private function makeIndexName(string $table, string $suffix): string
    {
        $base = 'idx_mt_' . $table . '_' . $suffix;
        if (strlen($base) <= 63) {
            return $base;
        }

        $hash = substr(md5($base), 0, 8);
        $tablePart = substr($table, 0, 24);
        $suffixPart = substr($suffix, 0, 16);

        $candidate = 'idx_mt_' . $tablePart . '_' . $suffixPart . '_' . $hash;
        return substr($candidate, 0, 63);
    }
};
