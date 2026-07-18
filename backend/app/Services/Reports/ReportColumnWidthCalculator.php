<?php

namespace App\Services\Reports;

/**
 * Content-weighted column widths for PDF reports (percentages).
 * Excel uses its own content-fit logic and should not use these percentages.
 */
class ReportColumnWidthCalculator
{
    /**
     * @param  array<int, mixed>  $columns
     * @param  array<string, mixed>  $columnConfig
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, float>
     */
    public function calculate(array $columns, array $columnConfig = [], array $rows = []): array
    {
        $totalColumns = count($columns);
        if ($totalColumns === 0) {
            return [];
        }

        $weights = [];
        foreach ($columns as $index => $column) {
            $key = is_array($column) ? (string) ($column['key'] ?? $index) : (string) $index;
            $label = is_array($column) ? (string) ($column['label'] ?? $key) : (string) $column;

            if (isset($columnConfig[$key]['width']) && is_numeric($columnConfig[$key]['width'])) {
                $weights[] = max(4.0, (float) $columnConfig[$key]['width']);

                continue;
            }

            $maxLen = max(
                mb_strlen($label, 'UTF-8'),
                $this->maxContentLengthForColumn($rows, $key, $index)
            );

            $normalizedKey = strtolower(preg_replace('/[_\s]+/', '', $key) ?? '');
            $weight = max(6.0, (float) $maxLen);

            if ($this->isNarrowColumnKey($normalizedKey)) {
                $weight *= 0.45;
            } elseif ($this->isWideTextColumnKey($normalizedKey)) {
                $weight *= 2.6;
            }

            if (preg_match('/[\x{0600}-\x{06FF}]/u', $label) === 1 || $maxLen > 10) {
                $weight *= 1.35;
            }

            $weights[] = $weight;
        }

        $sum = array_sum($weights);
        if ($sum <= 0) {
            $equal = round(100 / $totalColumns, 2);

            return array_fill(0, $totalColumns, $equal);
        }

        $widths = [];
        foreach ($weights as $weight) {
            $pct = ($weight / $sum) * 100;
            // Allow name/class columns to take nearly half the page when needed
            $widths[] = max(7.0, min(48.0, $pct));
        }

        $clampedSum = array_sum($widths);
        if ($clampedSum <= 0) {
            return $widths;
        }

        return array_map(
            static fn (float $w): float => round(($w / $clampedSum) * 100, 2),
            $widths
        );
    }

    /**
     * @param  array<int, array<string, mixed>>  $primaryRows
     * @param  array<string, mixed>  $parameters
     * @return array<int, array<string, mixed>>
     */
    public function collectRowsForSizing(array $primaryRows, array $parameters = []): array
    {
        $rows = $primaryRows;

        foreach (['sections', 'sheets'] as $groupKey) {
            $groups = $parameters[$groupKey] ?? null;
            if (! is_array($groups)) {
                continue;
            }
            foreach ($groups as $group) {
                if (! is_array($group) || ! isset($group['rows']) || ! is_array($group['rows'])) {
                    continue;
                }
                foreach ($group['rows'] as $row) {
                    if (is_array($row)) {
                        $rows[] = $row;
                    }
                }
            }
        }

        if (count($rows) > 2500) {
            return array_slice($rows, 0, 2500);
        }

        return $rows;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    private function maxContentLengthForColumn(array $rows, string $key, int $index): int
    {
        $max = 0;
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $value = $row[$key] ?? $row[$index] ?? '';
            if (is_array($value) || is_object($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE) ?: '';
            }
            $max = max($max, mb_strlen((string) $value, 'UTF-8'));
        }

        return $max;
    }

    private function isWideTextColumnKey(string $normalizedKey): bool
    {
        $exact = [
            'studentname', 'fullname', 'name', 'fullname', 'fathername', 'father',
            'classname', 'class', 'section', 'sectionname', 'address', 'schoolname',
            'subject', 'subjectname', 'notes', 'description', 'title', 'guardianname',
            'mothername',
        ];

        if (in_array($normalizedKey, $exact, true)) {
            return true;
        }

        return str_ends_with($normalizedKey, 'name')
            || str_ends_with($normalizedKey, 'fullname')
            || str_contains($normalizedKey, 'address')
            || str_contains($normalizedKey, 'classname')
            || str_contains($normalizedKey, 'section');
    }

    private function isNarrowColumnKey(string $normalizedKey): bool
    {
        $exact = [
            'rollnumber', 'secretnumber', 'cardnumber', 'status', 'gender',
            'score', 'marks', 'grade', 'date', 'phone', 'id', 'code',
            'admissionno', 'studentcode',
        ];

        if (in_array($normalizedKey, $exact, true)) {
            return true;
        }

        return (bool) preg_match('/(number|code|id|score|marks|grade|date|phone|status)$/', $normalizedKey);
    }
}
