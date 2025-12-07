<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;

class TranslationController extends Controller
{
    /**
     * Get all translations
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // No permission check - translations are accessible to all authenticated users
        // This allows translators to work without needing special permissions

        $translationsPath = base_path('../frontend/src/lib/translations');
        
        $languages = ['en', 'ps', 'fa', 'ar'];
        $translations = [];

        foreach ($languages as $lang) {
            $filePath = $translationsPath . "/{$lang}.ts";
            
            if (!File::exists($filePath)) {
                Log::warning("Translation file not found: {$filePath}");
                continue;
            }

            $content = File::get($filePath);
            
            // Extract the translation object from the TypeScript file
            // Pattern: export const en: TranslationKeys = { ... };
            if (preg_match('/export const ' . $lang . ': TranslationKeys = ({.*?});/s', $content, $matches)) {
                $jsonString = $matches[1];
                
                // Convert TypeScript object to JSON
                // Remove trailing commas
                $jsonString = preg_replace('/,\s*}/', '}', $jsonString);
                $jsonString = preg_replace('/,\s*]/', ']', $jsonString);
                
                // Replace single quotes with double quotes
                $jsonString = str_replace("'", '"', $jsonString);
                
                // Replace unquoted keys with quoted keys
                $jsonString = preg_replace('/(\w+):/', '"$1":', $jsonString);
                
                try {
                    $translations[$lang] = json_decode($jsonString, true);
                } catch (\Exception $e) {
                    Log::error("Failed to parse translation file {$lang}.ts: " . $e->getMessage());
                    $translations[$lang] = [];
                }
            } else {
                Log::warning("Could not extract translation object from {$lang}.ts");
                $translations[$lang] = [];
            }
        }

        return response()->json($translations);
    }

    /**
     * Save translations back to files
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // No permission check - translations are accessible to all authenticated users

        $request->validate([
            'translations' => 'required|array',
            'translations.en' => 'required|array',
            'translations.ps' => 'required|array',
            'translations.fa' => 'required|array',
            'translations.ar' => 'required|array',
        ]);

        $translations = $request->input('translations');
        $translationsPath = base_path('../frontend/src/lib/translations');
        $languages = ['en', 'ps', 'fa', 'ar'];
        $errors = [];

        foreach ($languages as $lang) {
            if (!isset($translations[$lang])) {
                $errors[] = "Missing translations for language: {$lang}";
                continue;
            }

            $filePath = $translationsPath . "/{$lang}.ts";
            
            if (!File::exists($filePath)) {
                $errors[] = "Translation file not found: {$filePath}";
                continue;
            }

            try {
                // Convert array to TypeScript object format
                $tsContent = $this->arrayToTypeScript($translations[$lang], $lang);
                
                // Write to file
                File::put($filePath, $tsContent);
                
                Log::info("Translation file updated: {$lang}.ts by user {$user->id}");
            } catch (\Exception $e) {
                Log::error("Failed to save translation file {$lang}.ts: " . $e->getMessage());
                $errors[] = "Failed to save {$lang}.ts: " . $e->getMessage();
            }
        }

        if (!empty($errors)) {
            return response()->json([
                'error' => 'Some translations could not be saved',
                'details' => $errors
            ], 422);
        }

        return response()->json([
            'message' => 'Translations saved successfully',
            'languages' => $languages
        ], 200);
    }

    /**
     * Convert PHP array to TypeScript object format
     */
    private function arrayToTypeScript(array $data, string $lang): string
    {
        $indent = '  ';
        $lines = [];
        $lines[] = "import type { TranslationKeys } from './types';";
        $lines[] = '';
        $lines[] = "export const {$lang}: TranslationKeys = {";
        
        $this->formatObject($data, $lines, $indent, 1);
        
        $lines[] = '};';
        
        return implode("\n", $lines);
    }

    /**
     * Recursively format object for TypeScript
     */
    private function formatObject(array $data, array &$lines, string $indent, int $level): void
    {
        $currentIndent = str_repeat($indent, $level);
        
        $keys = array_keys($data);
        $lastIndex = count($keys) - 1;
        
        foreach ($keys as $index => $key) {
            $value = $data[$key];
            $isLast = ($index === $lastIndex);
            
            if (is_array($value) && $this->isAssociativeArray($value)) {
                // Nested object
                $lines[] = "{$currentIndent}{$key}: {";
                $this->formatObject($value, $lines, $indent, $level + 1);
                $lines[] = "{$currentIndent}}" . ($isLast ? '' : ',');
            } else {
                // Primitive value
                $formattedValue = $this->formatValue($value);
                $lines[] = "{$currentIndent}{$key}: {$formattedValue}" . ($isLast ? '' : ',');
            }
        }
    }

    /**
     * Check if array is associative
     */
    private function isAssociativeArray(array $array): bool
    {
        if (empty($array)) {
            return false;
        }
        return array_keys($array) !== range(0, count($array) - 1);
    }

    /**
     * Format value for TypeScript
     */
    private function formatValue($value): string
    {
        if (is_string($value)) {
            // Escape backslashes first, then single quotes
            $escaped = str_replace('\\', '\\\\', $value);
            $escaped = str_replace("'", "\\'", $escaped);
            // Also escape newlines and other special characters
            $escaped = str_replace(["\n", "\r", "\t"], ['\\n', '\\r', '\\t'], $escaped);
            return "'{$escaped}'";
        } elseif (is_bool($value)) {
            return $value ? 'true' : 'false';
        } elseif (is_null($value)) {
            return 'null';
        } elseif (is_numeric($value)) {
            return (string) $value;
        } elseif (is_array($value)) {
            // Array literal (for numeric arrays)
            if (!$this->isAssociativeArray($value)) {
                $items = array_map([$this, 'formatValue'], $value);
                return '[' . implode(', ', $items) . ']';
            } else {
                // Should not happen in our case, but handle it
                return '{}';
            }
        } else {
            $str = (string) $value;
            $escaped = str_replace('\\', '\\\\', $str);
            $escaped = str_replace("'", "\\'", $escaped);
            return "'{$escaped}'";
        }
    }
}

