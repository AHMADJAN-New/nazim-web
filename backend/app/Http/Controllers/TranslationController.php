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
     * Save translations back to files (legacy - full file replacement)
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
     * Save only changed translations back to files (incremental update)
     */
    public function storeChanges(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }
            
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            $request->validate([
                'changes' => 'required|array',
                'changes.*.key' => 'required|string',
                'changes.*.lang' => 'required|string|in:en,ps,fa,ar',
                'changes.*.value' => 'required|string',
            ]);

            $changes = $request->input('changes');
            $translationsPath = base_path('../frontend/src/lib/translations');
            $errors = [];
            $updatedFiles = [];
            $fileChanges = []; // Track changes per file

            // Group changes by language
            $changesByLang = [];
            foreach ($changes as $change) {
                $lang = $change['lang'];
                if (!isset($changesByLang[$lang])) {
                    $changesByLang[$lang] = [];
                }
                $changesByLang[$lang][$change['key']] = $change['value'];
            }

            foreach ($changesByLang as $lang => $langChanges) {
                $filePath = $translationsPath . "/{$lang}.ts";
                $fileName = "{$lang}.ts";
                
                if (!File::exists($filePath)) {
                    $errors[] = "Translation file not found: {$filePath}";
                    continue;
                }

                try {
                    // Read existing file content
                    if (!is_readable($filePath)) {
                        throw new \Exception("Translation file is not readable: {$filePath}");
                    }
                    
                    $fileContent = File::get($filePath);
                    
                    if ($fileContent === false) {
                        throw new \Exception("Failed to read translation file: {$filePath}");
                    }
                    
                    // Update only changed keys
                    $updatedContent = $this->updateTranslationFile($fileContent, $langChanges, $lang);
                    
                    // Check if directory is writable
                    $dir = dirname($filePath);
                    if (!is_writable($dir)) {
                        throw new \Exception("Translation directory is not writable: {$dir}");
                    }
                    
                    // Write updated content
                    $result = File::put($filePath, $updatedContent);
                    
                    if ($result === false) {
                        throw new \Exception("Failed to write translation file: {$filePath}");
                    }
                    
                    $updatedFiles[] = $lang;
                    $fileChanges[$lang] = [
                        'file_name' => $fileName,
                        'language' => $lang,
                        'keys_changed' => count($langChanges),
                        'changed_keys' => array_keys($langChanges),
                    ];
                    
                    Log::info("Translation file updated incrementally: {$fileName} by user {$user->id}", [
                        'updated_keys' => array_keys($langChanges)
                    ]);
                } catch (\Exception $e) {
                    Log::error("Failed to save translation file {$fileName}: " . $e->getMessage(), [
                        'exception' => get_class($e),
                        'trace' => $e->getTraceAsString()
                    ]);
                    $errors[] = "Failed to save {$fileName}: " . $e->getMessage();
                }
            }

            // Track changes in database (only if files were successfully updated)
            foreach ($fileChanges as $lang => $changeData) {
                try {
                    $this->trackFileChange($changeData, $user->id);
                } catch (\Exception $e) {
                    // Log but don't fail the request if tracking fails
                    Log::warning("Failed to track file change for {$changeData['file_name']}: " . $e->getMessage());
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
                'updated_files' => $updatedFiles,
                'updated_keys_count' => count($changes),
                'file_changes' => $fileChanges
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error("storeChanges error: " . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id ?? 'unknown'
            ]);
            return response()->json([
                'error' => 'Failed to save translations',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Track file changes in database
     */
    private function trackFileChange(array $changeData, string $userId): void
    {
        DB::table('translation_changes')->updateOrInsert(
            [
                'file_name' => $changeData['file_name'],
                'status' => 'pending'
            ],
            [
                'language' => $changeData['language'],
                'keys_changed' => $changeData['keys_changed'],
                'changed_keys' => json_encode($changeData['changed_keys']),
                'last_modified_at' => now(),
                'modified_by' => $userId,
                'status' => 'pending',
                'updated_at' => now(),
                'created_at' => DB::raw('COALESCE(created_at, NOW())'),
            ]
        );
    }

    /**
     * Get list of changed files
     */
    public function getChangedFiles(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $changedFiles = DB::table('translation_changes')
            ->where('status', 'pending')
            ->orderBy('last_modified_at', 'desc')
            ->get()
            ->map(function ($file) {
                return [
                    'file_name' => $file->file_name,
                    'language' => $file->language,
                    'keys_changed' => $file->keys_changed,
                    'changed_keys' => json_decode($file->changed_keys, true) ?? [],
                    'last_modified_at' => $file->last_modified_at,
                    'modified_by' => $file->modified_by,
                ];
            });

        return response()->json([
            'changed_files' => $changedFiles,
            'total_files' => $changedFiles->count(),
            'total_keys_changed' => $changedFiles->sum('keys_changed'),
        ]);
    }

    /**
     * Mark files as built (after daily rebuild)
     */
    public function markAsBuilt(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $request->validate([
            'file_names' => 'nullable|array',
            'file_names.*' => 'string',
            'mark_all' => 'nullable|boolean',
        ]);

        $query = DB::table('translation_changes')->where('status', 'pending');

        if ($request->input('mark_all')) {
            // Mark all pending files as built
        } else if ($request->has('file_names')) {
            $query->whereIn('file_name', $request->input('file_names'));
        } else {
            return response()->json(['error' => 'Either file_names or mark_all must be provided'], 400);
        }

        $updated = $query->update([
            'status' => 'built',
            'built_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => "Marked {$updated} file(s) as built",
            'updated_count' => $updated,
        ]);
    }

    /**
     * Update translation file with only changed keys, preserving structure
     */
    private function updateTranslationFile(string $fileContent, array $changes, string $lang): string
    {
        try {
            // Validate file content
            if (empty(trim($fileContent))) {
                throw new \Exception("Translation file {$lang}.ts is empty or invalid.");
            }
            
            // Parse the existing file to extract the translation object
            // Use a more robust approach: find the opening brace and match balanced braces
            $pattern = '/export\s+const\s+' . preg_quote($lang, '/') . '\s*:\s*TranslationKeys\s*=\s*{/s';
            if (!preg_match($pattern, $fileContent, $matches, PREG_OFFSET_CAPTURE)) {
                $filePreview = substr($fileContent, 0, 200);
                Log::error("Could not find translation object declaration for {$lang}.ts", [
                    'pattern' => $pattern,
                    'file_preview' => $filePreview,
                    'file_length' => strlen($fileContent)
                ]);
                throw new \Exception("Could not find translation object declaration for {$lang}.ts");
            }

            $startPos = $matches[0][1] + strlen($matches[0][0]) - 1; // Position of opening brace
            $braceCount = 1; // Start at 1 since we're already at the opening brace
            $endPos = $startPos;
            $contentLength = strlen($fileContent);
            $inString = false;
            $stringChar = null; // Track if we're in single or double quote string
            $escaped = false;

            // Find the matching closing brace, accounting for strings
            for ($i = $startPos + 1; $i < $contentLength; $i++) {
                $char = $fileContent[$i];
                $prevChar = $i > 0 ? $fileContent[$i - 1] : '';
                
                // Handle escape sequences
                if ($escaped) {
                    $escaped = false;
                    continue;
                }
                
                if ($char === '\\') {
                    $escaped = true;
                    continue;
                }
                
                // Track string boundaries
                if (($char === "'" || $char === '"') && !$escaped) {
                    if (!$inString) {
                        $inString = true;
                        $stringChar = $char;
                    } elseif ($char === $stringChar) {
                        $inString = false;
                        $stringChar = null;
                    }
                    continue;
                }
                
                // Only count braces when not inside a string
                if (!$inString) {
                    if ($char === '{') {
                        $braceCount++;
                    } elseif ($char === '}') {
                        $braceCount--;
                        if ($braceCount === 0) {
                            $endPos = $i;
                            break;
                        }
                    }
                }
            }

            if ($braceCount !== 0) {
                throw new \Exception("Unbalanced braces in translation file {$lang}.ts (brace count: {$braceCount})");
            }

            // Extract the object content (without the outer braces)
            $objectContent = substr($fileContent, $startPos + 1, $endPos - $startPos - 1);
            
            if (empty(trim($objectContent))) {
                throw new \Exception("Translation object content is empty for {$lang}.ts");
            }
            
            // Convert to array for easier manipulation
            $jsonString = $this->tsObjectToJson($objectContent);
            
            if (empty(trim($jsonString))) {
                throw new \Exception("Failed to convert TypeScript object to JSON for {$lang}.ts (result is empty)");
            }
            
            $translations = json_decode($jsonString, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                $errorMsg = json_last_error_msg();
                $jsonPreview = substr($jsonString, 0, 500);
                Log::error("JSON decode error in {$lang}.ts", [
                    'error' => $errorMsg,
                    'json_preview' => $jsonPreview,
                    'json_length' => strlen($jsonString)
                ]);
                throw new \Exception("Failed to parse translation object for {$lang}.ts: {$errorMsg}");
            }

            // Update only changed keys
            foreach ($changes as $keyPath => $value) {
                $this->setNestedValue($translations, $keyPath, $value);
            }

            // Rebuild the file with updated translations
            $lines = [];
            $lines[] = "import type { TranslationKeys } from './types';";
            $lines[] = '';
            $lines[] = "export const {$lang}: TranslationKeys = {";
            
            $this->formatObject($translations, $lines, '  ', 1);
            
            $lines[] = '};';
            
            return implode("\n", $lines);
        } catch (\Exception $e) {
            Log::error("Error in updateTranslationFile for {$lang}.ts: " . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
                'file_content_preview' => substr($fileContent, 0, 500)
            ]);
            throw $e; // Re-throw to be caught by storeChanges
        }
    }

    /**
     * Convert TypeScript object to JSON string
     * This is a simplified parser - for production, consider using a proper TS parser
     */
    private function tsObjectToJson(string $tsObject): string
    {
        $json = $tsObject;
        
        // Remove single-line comments (// ...)
        $json = preg_replace('/\/\/.*$/m', '', $json);
        
        // Remove multi-line comments (/* ... */)
        $json = preg_replace('/\/\*.*?\*\//s', '', $json);
        
        // Remove trailing commas before closing braces/brackets
        $json = preg_replace('/,\s*}/', '}', $json);
        $json = preg_replace('/,\s*]/', ']', $json);
        
        // Handle string conversion: single quotes to double quotes
        // First, protect escaped single quotes
        $json = str_replace("\\'", '__ESCAPED_SINGLE_QUOTE__', $json);
        // Protect escaped double quotes that might already exist
        $json = str_replace('\\"', '__ESCAPED_DOUBLE_QUOTE__', $json);
        // Replace unescaped single quotes with double quotes
        $json = str_replace("'", '"', $json);
        // Restore escaped quotes
        $json = str_replace('__ESCAPED_SINGLE_QUOTE__', '\\"', $json);
        $json = str_replace('__ESCAPED_DOUBLE_QUOTE__', '\\"', $json);
        
        // Replace unquoted keys with quoted keys
        // Match identifier-like keys (word characters, can include $ and _) followed by colon
        // But avoid matching if already quoted or if it's part of a string value
        $json = preg_replace('/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/', '$1"$2"$3', $json);
        
        return $json;
    }

    /**
     * Set nested value in array using dot notation
     */
    private function setNestedValue(array &$array, string $keyPath, string $value): void
    {
        $keys = explode('.', $keyPath);
        $current = &$array;
        
        for ($i = 0; $i < count($keys) - 1; $i++) {
            if (!isset($current[$keys[$i]]) || !is_array($current[$keys[$i]])) {
                $current[$keys[$i]] = [];
            }
            $current = &$current[$keys[$i]];
        }
        
        $current[$keys[count($keys) - 1]] = $value;
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

