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

        $translationsPath = base_path('../frontend/src/lib/translations');
        $languages = ['en', 'ps', 'fa', 'ar'];
        $translations = [];

        foreach ($languages as $lang) {
            $filePath = $translationsPath . "/{$lang}.ts";
            
            if (!File::exists($filePath)) {
                Log::warning("Translation file not found: {$filePath}");
                $translations[$lang] = [];
                continue;
            }

            try {
            $content = File::get($filePath);
                // Normalize file content: remove BOM and normalize line endings
                $content = $this->normalizeFileContent($content);
                $obj = $this->extractTsObjectFromFile($content, $lang); // "{ ... }"
                $json = $this->tsObjectToJson($obj);

                $decoded = json_decode($json, true);
                if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
                    throw new \Exception("JSON decode failed: " . json_last_error_msg());
                }

                $translations[$lang] = $decoded;
                } catch (\Exception $e) {
                    Log::error("Failed to parse translation file {$lang}.ts: " . $e->getMessage());
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
                $tsContent = $this->arrayToTypeScript($translations[$lang], $lang);
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
            $fileChanges = [];

            // Group changes by language
            $changesByLang = [];
            foreach ($changes as $change) {
                $lang = $change['lang'];
                $changesByLang[$lang] ??= [];
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
                    if (!is_readable($filePath)) {
                        throw new \Exception("Translation file is not readable: {$filePath}");
                    }
                    
                    $fileContent = File::get($filePath);
                    if ($fileContent === false) {
                        throw new \Exception("Failed to read translation file: {$filePath}");
                    }
                    
                    // Normalize file content: remove BOM and normalize line endings
                    $fileContent = $this->normalizeFileContent($fileContent);
                    
                    $updatedContent = $this->updateTranslationFile($fileContent, $langChanges, $lang);
                    
                    $dir = dirname($filePath);
                    if (!is_writable($dir)) {
                        throw new \Exception("Translation directory is not writable: {$dir}");
                    }
                    
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

            // Track changes (best-effort)
            foreach ($fileChanges as $lang => $changeData) {
                try {
                    $this->trackFileChange($changeData, (string) $user->id);
                } catch (\Exception $e) {
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
     * Merges new changes with existing changes instead of replacing them
     * If a published key is edited again, it moves back to pending
     */
    private function trackFileChange(array $changeData, string $userId): void
    {
        // Check if record exists (pending or built)
        $existingPending = DB::table('translation_changes')
            ->where('file_name', $changeData['file_name'])
            ->where('status', 'pending')
            ->first();
        
        $existingBuilt = DB::table('translation_changes')
            ->where('file_name', $changeData['file_name'])
            ->where('status', 'built')
            ->first();
        
        if ($existingPending) {
            // Merge existing pending keys with new keys (don't replace)
            $existingKeys = json_decode($existingPending->changed_keys, true) ?? [];
            $newKeys = $changeData['changed_keys'] ?? [];
            
            // Merge arrays and remove duplicates
            $mergedKeys = array_unique(array_merge($existingKeys, $newKeys));
            
            // Update existing pending record with merged keys
            DB::table('translation_changes')
                ->where('id', $existingPending->id)
                ->update([
                    'language' => $changeData['language'],
                    'keys_changed' => count($mergedKeys), // Total unique keys changed
                    'changed_keys' => json_encode(array_values($mergedKeys)), // Re-index array
                    'last_modified_at' => now(),
                    'modified_by' => $userId,
                    'status' => 'pending',
                    'updated_at' => now(),
                ]);
        } elseif ($existingBuilt) {
            // If file was built but is being edited again, merge keys and move back to pending
            $existingKeys = json_decode($existingBuilt->changed_keys, true) ?? [];
            $newKeys = $changeData['changed_keys'] ?? [];
            
            // Merge arrays and remove duplicates
            $mergedKeys = array_unique(array_merge($existingKeys, $newKeys));
            
            // Update built record to pending status (re-edited published keys go back to pending)
            DB::table('translation_changes')
                ->where('id', $existingBuilt->id)
                ->update([
                    'language' => $changeData['language'],
                    'keys_changed' => count($mergedKeys), // Total unique keys changed
                    'changed_keys' => json_encode(array_values($mergedKeys)), // Re-index array
                    'last_modified_at' => now(),
                    'modified_by' => $userId,
                    'status' => 'pending', // Move back to pending
                    'built_at' => null, // Clear built timestamp
                    'updated_at' => now(),
                ]);
        } else {
            // Insert new record
            DB::table('translation_changes')->insert([
                'file_name' => $changeData['file_name'],
                'language' => $changeData['language'],
                'keys_changed' => $changeData['keys_changed'],
                'changed_keys' => json_encode($changeData['changed_keys']),
                'last_modified_at' => now(),
                'modified_by' => $userId,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Get list of changed files (both pending and built)
     */
    public function getChangedFiles(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Get all files (pending and built)
        $allFiles = DB::table('translation_changes')
            ->orderBy('last_modified_at', 'desc')
            ->get()
            ->map(function ($file) {
                return [
                    'file_name' => $file->file_name,
                    'language' => $file->language,
                    'keys_changed' => $file->keys_changed,
                    'changed_keys' => json_decode($file->changed_keys, true) ?? [],
                    'last_modified_at' => $file->last_modified_at,
                    'built_at' => $file->built_at,
                    'status' => $file->status, // 'pending' or 'built'
                    'modified_by' => $file->modified_by,
                ];
            });

        // Separate pending and built files
        $pendingFiles = $allFiles->where('status', 'pending')->values();
        $builtFiles = $allFiles->where('status', 'built')->values();

        return response()->json([
            'changed_files' => $pendingFiles->toArray(), // Keep for backward compatibility
            'pending_files' => $pendingFiles->toArray(),
            'built_files' => $builtFiles->toArray(),
            'total_files' => $pendingFiles->count(),
            'total_keys_changed' => $pendingFiles->sum('keys_changed'),
            'total_built_files' => $builtFiles->count(),
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
        } elseif ($request->has('file_names')) {
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
            if (empty(trim($fileContent))) {
                throw new \Exception("Translation file {$lang}.ts is empty or invalid.");
            }
            
        $objectContent = $this->extractTsObjectFromFile($fileContent, $lang); // "{...}"
        $jsonString = $this->tsObjectToJson($objectContent);

        $translations = json_decode($jsonString, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($translations)) {
            $errorMsg = json_last_error_msg();
            $errorCode = json_last_error();
            
            // Find the error position
            $errorPos = -1;
            $lastValidPos = -1;
            $len = strlen($jsonString);
            
            // Binary search for error position
            $low = 0;
            $high = $len;
            while ($low < $high) {
                $mid = intval(($low + $high) / 2);
                $testJson = substr($jsonString, 0, $mid);
                
                // Try to make it valid by closing structures
                $openBraces = substr_count($testJson, '{') - substr_count($testJson, '}');
                $openBrackets = substr_count($testJson, '[') - substr_count($testJson, ']');
                $testJson .= str_repeat('}', max(0, $openBraces));
                $testJson .= str_repeat(']', max(0, $openBrackets));
                
                json_decode($testJson);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $lastValidPos = $mid;
                    $low = $mid + 1;
                } else {
                    $high = $mid;
                    $errorPos = $mid;
                }
            }
            
            // Get context around error
            $errorContext = '';
            $errorChar = '';
            if ($errorPos >= 0 && $errorPos < $len) {
                $start = max(0, $errorPos - 100);
                $end = min($len, $errorPos + 100);
                $errorContext = substr($jsonString, $start, $end - $start);
                $errorChar = $jsonString[$errorPos];
            }
            
            Log::error("JSON decode error in {$lang}.ts", [
                'error' => $errorMsg,
                'error_code' => $errorCode,
                'error_pos' => $errorPos,
                'last_valid_pos' => $lastValidPos,
                'error_char' => $errorChar,
                'error_char_code' => $errorPos >= 0 ? ord($errorChar) : null,
                'error_context' => $errorContext,
                'json_preview' => substr($jsonString, 0, 1200),
                'json_length' => strlen($jsonString),
            ]);
            throw new \Exception("Failed to parse translation object for {$lang}.ts: {$errorMsg} at position {$errorPos}");
        }

        foreach ($changes as $keyPath => $value) {
            $this->setNestedValue($translations, $keyPath, $value);
        }

        $lines = [];
        $lines[] = "import type { TranslationKeys } from './types';";
        $lines[] = '';
        $lines[] = "export const {$lang}: TranslationKeys = {";
        $this->formatObject($translations, $lines, '  ', 1);
        $lines[] = '};';

        return implode("\n", $lines);
    }

    /**
     * Extract "{ ... }" from: export const <lang>: TranslationKeys = { ... };
     */
    private function extractTsObjectFromFile(string $fileContent, string $lang): string
    {
            $pattern = '/export\s+const\s+' . preg_quote($lang, '/') . '\s*:\s*TranslationKeys\s*=\s*{/s';
            if (!preg_match($pattern, $fileContent, $matches, PREG_OFFSET_CAPTURE)) {
                throw new \Exception("Could not find translation object declaration for {$lang}.ts");
            }

        $startBracePos = $matches[0][1] + strlen($matches[0][0]) - 1;

        $braceCount = 1;
        $endBracePos = null;

        $len = strlen($fileContent);
            $inString = false;
        $stringChar = null;
            $escaped = false;

        for ($i = $startBracePos + 1; $i < $len; $i++) {
            $ch = $fileContent[$i];

                if ($escaped) {
                    $escaped = false;
                    continue;
                }
                
            if ($ch === '\\') {
                    $escaped = true;
                    continue;
                }
                
            if ($ch === "'" || $ch === '"') {
                    if (!$inString) {
                        $inString = true;
                    $stringChar = $ch;
                } elseif ($ch === $stringChar) {
                        $inString = false;
                        $stringChar = null;
                    }
                    continue;
                }
                
                if (!$inString) {
                if ($ch === '{') {
                        $braceCount++;
                } elseif ($ch === '}') {
                        $braceCount--;
                        if ($braceCount === 0) {
                        $endBracePos = $i;
                            break;
                        }
                    }
                }
            }

        if ($endBracePos === null) {
            throw new \Exception("Unbalanced braces in translation file {$lang}.ts");
        }

        return substr($fileContent, $startBracePos, $endBracePos - $startBracePos + 1);
    }

    /**
     * Robust JSON5-like (TS object) -> JSON converter.
     * Handles:
     * - Single-line and multi-line comments
     * - unquoted object keys
     * - single-quoted strings
     * - trailing commas
     *
     * IMPORTANT: This is a tokenizer, not regex hacks.
     */
    private function tsObjectToJson(string $tsObject): string
    {
        $s = $tsObject;
        $n = strlen($s);

        $out = [];
        $outLen = 0;

        $i = 0;

        $inString = false;
        $quote = null;      // ' or "
        $escaped = false;

        $inLineComment = false;
        $inBlockComment = false;

        // When true, we are in an object and expecting a key next (after '{' or ',')
        $expectKey = false;
        
        // When true, we are expecting a value (after ':')
        $expectValue = false;

        // Stack to know if we're inside object/array
        $stack = []; // values: '{' or '['

        while ($i < $n) {
            $ch = $s[$i];
            $next = ($i + 1 < $n) ? $s[$i + 1] : '';

            // Handle comments (only when NOT inside string)
            if (!$inString) {
                if ($inLineComment) {
                    if ($ch === "\n") {
                        $inLineComment = false;
                        $out[] = "\n";
                        $outLen++;
                    }
                    $i++;
                    continue;
                }

                if ($inBlockComment) {
                    if ($ch === '*' && $next === '/') {
                        $inBlockComment = false;
                        $i += 2;
                        continue;
                    }
                    $i++;
                    continue;
                }

                // Start comment?
                if ($ch === '/' && $next === '/') {
                    $inLineComment = true;
                    $i += 2;
                    continue;
                }
                if ($ch === '/' && $next === '*') {
                    $inBlockComment = true;
                    $i += 2;
                    continue;
                }
            }

            // String handling
            if ($inString) {
                if ($escaped) {
                    // JSON strings are double-quoted, so an escaped single-quote should be unescaped.
                    if ($ch === "'") {
                        $out[] = "'";
                        $outLen++;
                    } else {
                        $out[] = '\\' . $ch;
                        $outLen += 2;
                    }
                    $escaped = false;
                    $i++;
                    continue;
                }

                if ($ch === '\\') {
                    $escaped = true;
                    $i++;
                    continue;
                }

                // End of string?
                if ($ch === $quote) {
                    $out[] = '"'; // always close with double quote for JSON
                    $outLen++;
                    $inString = false;
                    $quote = null;
                    $i++;
                    continue;
                }

                // If original quote was single-quote, we must escape any raw double quotes
                if ($quote === "'" && $ch === '"') {
                    $out[] = '\\"';
                    $outLen += 2;
                    $i++;
                    continue;
                }

                // Normal char - but check for control characters that need escaping
                $charCode = ord($ch);
                
                if ($charCode < 0x20) {
                    // Control character - must be escaped in JSON
                    // Use standard JSON escape sequences where possible
                    $escaped = match ($charCode) {
                        0x08 => '\\b',  // backspace
                        0x09 => '\\t',  // tab
                        0x0A => '\\n',  // newline
                        0x0C => '\\f',  // form feed
                        0x0D => '\\r',  // carriage return
                        default => '\\u' . str_pad(dechex($charCode), 4, '0', STR_PAD_LEFT), // \uXXXX
                    };
                    $out[] = $escaped;
                    $outLen += strlen($escaped);
                } else {
                    $out[] = $ch;
                    $outLen++;
                }
                $i++;
                continue;
            }

            // Not in string: whitespace is copied, but also helps key detection
            if ($ch === "'" || $ch === '"') {
                // Start string: always emit a JSON double-quote
                $inString = true;
                $quote = $ch;
                $escaped = false;
                $expectValue = false; // we're processing a string value
                
                // If we were expecting a key, we're now processing a quoted key
                // Clear expectKey - after the string ends, we'll encounter ':' which will set expectValue
                if ($expectKey) {
                    $expectKey = false;
                }

                $out[] = '"';
                $outLen++;
                $i++;
                continue;
            }

            // Manage structure stack
            if ($ch === '{') {
                $stack[] = '{';
                $expectKey = true;
                $expectValue = false; // we're starting an object, not expecting a simple value
                $out[] = '{';
                $outLen++;
                $i++;
                continue;
            }
            if ($ch === '[') {
                $stack[] = '[';
                $expectKey = false;
                $expectValue = false; // we're starting an array, not expecting a simple value
                $out[] = '[';
                $outLen++;
                $i++;
                continue;
            }
            if ($ch === '}' || $ch === ']') {
                // Remove trailing comma before closing
                // If last non-space output ends with ',' remove it
                for ($k = count($out) - 1; $k >= 0; $k--) {
                    $t = $out[$k];
                    if (trim($t) === '') {
                        continue;
                    }
                    if ($t === ',') {
                        array_splice($out, $k, 1);
                    }
                    break;
                }

                if (!empty($stack)) {
                    array_pop($stack);
                }
                // After closing, we are not expecting a key (depends on parent, will be set by ',' logic)
                $expectKey = false;
                $expectValue = false; // we've finished processing the value

                $out[] = $ch;
                $outLen++;
                $i++;
                continue;
            }

            if ($ch === ',') {
                // Comma means: in object => next token might be key; in array => value
                $out[] = ',';
                $outLen++;
                $i++;

                // Determine expectKey based on current container
                $top = end($stack);
                $expectKey = ($top === '{');
                $expectValue = false; // we've finished processing the previous value
                continue;
            }

            if ($ch === ':') {
                $out[] = ':';
                $outLen++;
                $i++;
                $expectKey = false; // now expecting value
                $expectValue = true; // we're expecting a value after the colon
                continue;
            }

            // If we're in an object and expecting a key, and next non-space is identifier -> quote it
            if ($expectKey) {
                // Skip whitespace (but still output it)
                if ($ch === ' ' || $ch === "\t" || $ch === "\n" || $ch === "\r") {
                    $out[] = $ch;
                    $outLen++;
                    $i++;
                    continue;
                }

                // Identifier key?
                if ($this->isIdentifierStart($ch)) {
                    $start = $i;
                    $i++;

                    while ($i < $n && $this->isIdentifierPart($s[$i])) {
                        $i++;
                    }

                    $key = substr($s, $start, $i - $start);

                    // Skip whitespace between key and colon (but keep it)
                    $j = $i;
                    while ($j < $n && ($s[$j] === ' ' || $s[$j] === "\t" || $s[$j] === "\n" || $s[$j] === "\r")) {
                        $j++;
                    }

                    // Only treat as key if next non-space is ':'
                    if ($j < $n && $s[$j] === ':') {
                        $out[] = '"' . $key . '"';
                        $outLen += (strlen($key) + 2);
                        // Keep whitespace between key and colon
                        while ($i < $j) {
                            $out[] = $s[$i];
                            $outLen++;
                            $i++;
                        }
                        // colon will be handled by loop normally
                        continue;
                    }

                    // Not actually a key (weird), output raw
                    $out[] = $key;
                    $outLen += strlen($key);
                    continue;
                }
            }

            // If we're expecting a value (not a key), check for unquoted identifiers
            if ($expectValue && !$inString) {
                // Skip whitespace (but still output it)
                if ($ch === ' ' || $ch === "\t" || $ch === "\n" || $ch === "\r") {
                    $out[] = $ch;
                    $outLen++;
                    $i++;
                    continue;
                }

                // Check if this is an unquoted identifier value (not a JSON keyword)
                if ($this->isIdentifierStart($ch)) {
                    $start = $i;
                    $i++;

                    while ($i < $n && $this->isIdentifierPart($s[$i])) {
                        $i++;
                    }

                    $value = substr($s, $start, $i - $start);
                    
                    // Check if it's a JSON keyword - if not, quote it
                    if (!in_array($value, ['null', 'true', 'false'])) {
                        // Check if next non-whitespace is a valid value terminator
                        $j = $i;
                        while ($j < $n && ($s[$j] === ' ' || $s[$j] === "\t" || $s[$j] === "\n" || $s[$j] === "\r")) {
                            $j++;
                        }
                        
                        // If next char is comma, closing brace/bracket, or end of input, quote the value
                        if ($j >= $n || $s[$j] === ',' || $s[$j] === '}' || $s[$j] === ']') {
                            $out[] = '"' . $value . '"';
                            $outLen += (strlen($value) + 2);
                            // Keep whitespace between value and terminator
                            while ($i < $j) {
                                $out[] = $s[$i];
                                $outLen++;
                                $i++;
                            }
                            $expectValue = false; // we've processed the value
                            continue;
                        }
                    }
                    
                    // It's a JSON keyword or not a standalone value, output as-is
                    $out[] = $value;
                    $outLen += strlen($value);
                    $expectValue = false; // we've processed the value (even if it's a keyword)
                    continue;
                }
                
                // If we hit a '{' or '[', we're starting a nested structure, not a simple value
                if ($ch === '{' || $ch === '[') {
                    $expectValue = false;
                }
            }

            // Default: copy character, but filter out control characters outside strings
            // JSON allows whitespace control chars (0x09, 0x0A, 0x0D) but not others
            $charCode = ord($ch);
            if ($charCode < 0x20) {
                // Control character outside string - only allow whitespace control chars
                if ($charCode === 0x09 || $charCode === 0x0A || $charCode === 0x0D) {
                    // Tab, newline, carriage return - allowed in JSON as whitespace
                    // Copy as-is (JSON allows these as whitespace between tokens)
                    $out[] = $ch;
                    $outLen++;
                }
                // Other control characters are silently skipped (not valid in JSON)
            } else {
                // Regular character - copy as-is
                $out[] = $ch;
                $outLen++;
            }
            $i++;
        }

        $json = implode('', $out);

        // Final safety: remove any trailing commas before } or ]
        $json = preg_replace('/,\s*([}\]])/', '$1', $json);
        
        // Validate structure balance (braces and brackets)
        $openBraces = substr_count($json, '{') - substr_count($json, '}');
        $openBrackets = substr_count($json, '[') - substr_count($json, ']');
        
        if ($openBraces !== 0 || $openBrackets !== 0) {
            // Structure is unbalanced - try to fix by closing structures
            if ($openBraces > 0) {
                $json .= str_repeat('}', $openBraces);
            }
            if ($openBrackets > 0) {
                $json .= str_repeat(']', $openBrackets);
            }
        }
        
        // Additional safety: remove any remaining control characters (except allowed whitespace)
        // This handles edge cases where control chars might have slipped through
        // Only remove if JSON is invalid (to avoid breaking valid JSON)
        $testDecode = json_decode($json);
        if (json_last_error() !== JSON_ERROR_NONE) {
            // JSON is invalid, try cleaning control characters
            $cleanedJson = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $json);
            $testCleaned = json_decode($cleanedJson);
            if (json_last_error() === JSON_ERROR_NONE) {
                $json = $cleanedJson;
            }
            // If cleaning didn't help, keep original for better error reporting
        }
        
        return $json;
    }

    private function isIdentifierStart(string $ch): bool
    {
        $o = ord($ch);
        return ($o >= 65 && $o <= 90)   // A-Z
            || ($o >= 97 && $o <= 122)  // a-z
            || $ch === '_'
            || $ch === '$';
    }

    private function isIdentifierPart(string $ch): bool
    {
        $o = ord($ch);
        return ($o >= 65 && $o <= 90)
            || ($o >= 97 && $o <= 122)
            || ($o >= 48 && $o <= 57)   // 0-9
            || $ch === '_'
            || $ch === '$';
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
     * Check if a key needs to be quoted in TypeScript
     * Keys with dots, hyphens, or other special characters need quotes
     */
    private function needsQuotedKey(string $key): bool
    {
        // Check if key contains dots, hyphens, or starts with a number
        if (strpos($key, '.') !== false || strpos($key, '-') !== false) {
            return true;
        }
        
        // Check if key starts with a number (invalid identifier)
        if (preg_match('/^\d/', $key)) {
            return true;
        }
        
        // Check if key is a valid JavaScript identifier
        // Valid identifiers: letters, digits, underscore, dollar sign (but not starting with digit)
        if (!preg_match('/^[a-zA-Z_$][a-zA-Z0-9_$]*$/', $key)) {
            return true;
        }
        
        return false;
    }

    /**
     * Format a key for TypeScript (quote if necessary)
     */
    private function formatKey(string $key): string
    {
        if ($this->needsQuotedKey($key)) {
            // Escape single quotes in the key
            $escaped = str_replace("'", "\\'", $key);
            return "'{$escaped}'";
        }
        return $key;
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
            $formattedKey = $this->formatKey($key);
            
            if (is_array($value) && $this->isAssociativeArray($value)) {
                $lines[] = "{$currentIndent}{$formattedKey}: {";
                $this->formatObject($value, $lines, $indent, $level + 1);
                $lines[] = "{$currentIndent}}" . ($isLast ? '' : ',');
            } else {
                $formattedValue = $this->formatValue($value);
                $lines[] = "{$currentIndent}{$formattedKey}: {$formattedValue}" . ($isLast ? '' : ',');
            }
        }
    }

    private function isAssociativeArray(array $array): bool
    {
        if (empty($array)) {
            return false;
        }
        return array_keys($array) !== range(0, count($array) - 1);
    }

    /**
     * Normalize file content: remove BOM, normalize line endings
     * Note: We don't remove control characters here - let the JSON converter handle them
     * to avoid breaking valid content
     */
    private function normalizeFileContent(string $content): string
    {
        // Remove UTF-8 BOM if present
        if (substr($content, 0, 3) === "\xEF\xBB\xBF") {
            $content = substr($content, 3);
        }
        
        // Normalize line endings to \n (Unix style)
        $content = str_replace(["\r\n", "\r"], "\n", $content);
        
        // Don't remove control characters here - the JSON converter will handle them properly
        // This avoids accidentally removing characters that might be part of valid content
        
        return $content;
    }

    private function formatValue($value): string
    {
        if (is_string($value)) {
            $escaped = str_replace('\\', '\\\\', $value);
            $escaped = str_replace("'", "\\'", $escaped);
            $escaped = str_replace(["\n", "\r", "\t"], ['\\n', '\\r', '\\t'], $escaped);
            return "'{$escaped}'";
        } elseif (is_bool($value)) {
            return $value ? 'true' : 'false';
        } elseif (is_null($value)) {
            return 'null';
        } elseif (is_numeric($value)) {
            return (string) $value;
        } elseif (is_array($value)) {
            if (!$this->isAssociativeArray($value)) {
                $items = array_map([$this, 'formatValue'], $value);
                return '[' . implode(', ', $items) . ']';
            }
                return '{}';
            }

            $str = (string) $value;
            $escaped = str_replace('\\', '\\\\', $str);
            $escaped = str_replace("'", "\\'", $escaped);
            return "'{$escaped}'";
    }
}
