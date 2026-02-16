<?php

namespace App\Http\Controllers;

use App\Models\DesktopPrerequisite;
use App\Models\DesktopRelease;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DesktopReleaseController extends Controller
{
    // ─── Platform Admin: Releases ────────────────────────────────────────

    /**
     * List all releases (platform admin).
     */
    public function listReleases(Request $request): \Illuminate\Http\JsonResponse
    {
        $releases = DesktopRelease::whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => $this->formatRelease($r));

        return response()->json(['data' => $releases]);
    }

    /**
     * Create / upload a new release.
     */
    public function storeRelease(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'version' => 'required|string|max:50|unique:desktop_releases,version',
            'display_name' => 'required|string|max:255',
            'release_notes' => 'nullable|string|max:10000',
            'file' => 'required|file|max:512000', // 500 MB max
            'status' => 'nullable|string|in:draft,published,archived',
            'download_available' => 'nullable|boolean',
        ]);

        $file = $request->file('file');
        $hash = hash_file('sha256', $file->getRealPath());
        $hashMd5 = hash_file('md5', $file->getRealPath());
        $ext = $file->getClientOriginalExtension();
        $storedName = 'nazim-desktop-'.$request->version.'-'.Str::random(8).'.'.$ext;
        $path = $file->storeAs('desktop/releases', $storedName, 'public');

        $status = $request->input('status', 'draft');
        $isLatest = false;

        if ($status === 'published') {
            // Un-flag any previous "latest"
            DesktopRelease::where('is_latest', true)->update(['is_latest' => false]);
            $isLatest = true;
        }

        $downloadAvailable = $request->boolean('download_available', false);

        $release = DesktopRelease::create([
            'version' => $request->version,
            'display_name' => $request->display_name,
            'release_notes' => $request->release_notes,
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'file_hash' => $hash,
            'file_hash_md5' => $hashMd5,
            'status' => $status,
            'is_latest' => $isLatest,
            'download_available' => $downloadAvailable,
            'published_at' => $status === 'published' ? now() : null,
        ]);

        return response()->json(['data' => $this->formatRelease($release)], 201);
    }

    /**
     * Get a single release.
     */
    public function showRelease(string $id): \Illuminate\Http\JsonResponse
    {
        $release = DesktopRelease::whereNull('deleted_at')->findOrFail($id);

        return response()->json(['data' => $this->formatRelease($release)]);
    }

    /**
     * Update release metadata (not the file).
     */
    public function updateRelease(Request $request, string $id): \Illuminate\Http\JsonResponse
    {
        $release = DesktopRelease::whereNull('deleted_at')->findOrFail($id);

        $request->validate([
            'version' => 'sometimes|string|max:50|unique:desktop_releases,version,'.$id,
            'display_name' => 'sometimes|string|max:255',
            'release_notes' => 'nullable|string|max:10000',
            'status' => 'nullable|string|in:draft,published,archived',
            'download_available' => 'nullable|boolean',
            'is_latest' => 'nullable|boolean',
        ]);

        $data = $request->only(['version', 'display_name', 'release_notes', 'status', 'download_available', 'is_latest']);

        // Handle status transitions
        if (isset($data['status']) && $data['status'] === 'published' && $release->status !== 'published') {
            DesktopRelease::where('is_latest', true)->where('id', '!=', $id)->update(['is_latest' => false]);
            $data['is_latest'] = true;
            $data['published_at'] = now();
        }

        if (isset($data['status']) && $data['status'] !== 'published' && $release->is_latest) {
            $data['is_latest'] = false;
        }

        // When enabling download_available, set as latest so updates.txt and friendly URL point here
        if (isset($data['download_available']) && $data['download_available'] && ! $release->download_available) {
            DesktopRelease::where('is_latest', true)->where('id', '!=', $id)->update(['is_latest' => false]);
            $data['is_latest'] = true;
        }

        if (array_key_exists('is_latest', $data) && $data['is_latest']) {
            DesktopRelease::where('is_latest', true)->where('id', '!=', $id)->update(['is_latest' => false]);
        }

        $release->update($data);

        return response()->json(['data' => $this->formatRelease($release->fresh())]);
    }

    /**
     * Replace the file on an existing release.
     */
    public function replaceReleaseFile(Request $request, string $id): \Illuminate\Http\JsonResponse
    {
        $release = DesktopRelease::whereNull('deleted_at')->findOrFail($id);

        $request->validate([
            'file' => 'required|file|max:512000',
        ]);

        // Delete old file
        if ($release->file_path && Storage::disk('public')->exists($release->file_path)) {
            Storage::disk('public')->delete($release->file_path);
        }

        $file = $request->file('file');
        $hash = hash_file('sha256', $file->getRealPath());
        $hashMd5 = hash_file('md5', $file->getRealPath());
        $ext = $file->getClientOriginalExtension();
        $storedName = 'nazim-desktop-'.$release->version.'-'.Str::random(8).'.'.$ext;
        $path = $file->storeAs('desktop/releases', $storedName, 'public');

        $release->update([
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'file_hash' => $hash,
            'file_hash_md5' => $hashMd5,
        ]);

        return response()->json(['data' => $this->formatRelease($release->fresh())]);
    }

    /**
     * Soft-delete a release.
     */
    public function destroyRelease(string $id): \Illuminate\Http\Response
    {
        $release = DesktopRelease::whereNull('deleted_at')->findOrFail($id);
        $release->delete();

        return response()->noContent();
    }

    // ─── Platform Admin: Prerequisites ───────────────────────────────────

    /**
     * List all prerequisites (platform admin).
     */
    public function listPrerequisites(Request $request): \Illuminate\Http\JsonResponse
    {
        $prerequisites = DesktopPrerequisite::whereNull('deleted_at')
            ->orderBy('install_order')
            ->get()
            ->map(fn ($p) => $this->formatPrerequisite($p));

        return response()->json(['data' => $prerequisites]);
    }

    /**
     * Create / upload a prerequisite.
     */
    public function storePrerequisite(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'version' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:2000',
            'file' => 'required|file|max:512000',
            'install_order' => 'nullable|integer|min:0',
            'is_required' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        $file = $request->file('file');
        $hash = hash_file('sha256', $file->getRealPath());
        $storedName = Str::slug($request->name).'-'.Str::random(8).'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs('desktop/prerequisites', $storedName, 'public');

        $prerequisite = DesktopPrerequisite::create([
            'name' => $request->name,
            'version' => $request->version,
            'description' => $request->description,
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'file_hash' => $hash,
            'install_order' => $request->input('install_order', 0),
            'is_required' => $request->boolean('is_required', true),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return response()->json(['data' => $this->formatPrerequisite($prerequisite)], 201);
    }

    /**
     * Update prerequisite metadata.
     */
    public function updatePrerequisite(Request $request, string $id): \Illuminate\Http\JsonResponse
    {
        $prerequisite = DesktopPrerequisite::whereNull('deleted_at')->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'version' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:2000',
            'install_order' => 'nullable|integer|min:0',
            'is_required' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        $prerequisite->update($request->only([
            'name', 'version', 'description', 'install_order', 'is_required', 'is_active',
        ]));

        return response()->json(['data' => $this->formatPrerequisite($prerequisite->fresh())]);
    }

    /**
     * Replace the file on an existing prerequisite.
     */
    public function replacePrerequisiteFile(Request $request, string $id): \Illuminate\Http\JsonResponse
    {
        $prerequisite = DesktopPrerequisite::whereNull('deleted_at')->findOrFail($id);

        $request->validate([
            'file' => 'required|file|max:512000',
        ]);

        if ($prerequisite->file_path && Storage::disk('public')->exists($prerequisite->file_path)) {
            Storage::disk('public')->delete($prerequisite->file_path);
        }

        $file = $request->file('file');
        $hash = hash_file('sha256', $file->getRealPath());
        $storedName = Str::slug($prerequisite->name).'-'.Str::random(8).'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs('desktop/prerequisites', $storedName, 'public');

        $prerequisite->update([
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'file_hash' => $hash,
        ]);

        return response()->json(['data' => $this->formatPrerequisite($prerequisite->fresh())]);
    }

    /**
     * Soft-delete a prerequisite.
     */
    public function destroyPrerequisite(string $id): \Illuminate\Http\Response
    {
        $prerequisite = DesktopPrerequisite::whereNull('deleted_at')->findOrFail($id);
        $prerequisite->delete();

        return response()->noContent();
    }

    // ─── Public Endpoints ────────────────────────────────────────────────

    /**
     * Get the latest published release + active prerequisites (public, no auth).
     */
    public function latestRelease(): \Illuminate\Http\JsonResponse
    {
        $release = DesktopRelease::whereNull('deleted_at')
            ->where('status', 'published')
            ->where('is_latest', true)
            ->first();

        if (! $release) {
            // Fallback: most recently published
            $release = DesktopRelease::whereNull('deleted_at')
                ->where('status', 'published')
                ->orderByDesc('published_at')
                ->first();
        }

        $prerequisites = DesktopPrerequisite::whereNull('deleted_at')
            ->where('is_active', true)
            ->orderBy('install_order')
            ->get();

        $baseUrl = config('app.url');

        return response()->json([
            'data' => [
                'release' => $release ? [
                    'id' => $release->id,
                    'version' => $release->version,
                    'display_name' => $release->display_name,
                    'release_notes' => $release->release_notes,
                    'file_name' => $release->file_name,
                    'file_size' => $release->file_size,
                    'download_url' => $baseUrl.'/api/desktop/releases/'.$release->id.'/download',
                    'download_available' => (bool) $release->download_available,
                    'published_at' => $release->published_at?->toISOString(),
                ] : null,
                'prerequisites' => $prerequisites->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'version' => $p->version,
                    'description' => $p->description,
                    'file_name' => $p->file_name,
                    'file_size' => $p->file_size,
                    'is_required' => $p->is_required,
                    'download_url' => $baseUrl.'/api/desktop/prerequisites/'.$p->id.'/download',
                ]),
            ],
        ]);
    }

    /**
     * Download a release file (public, increments counter).
     * Uses X-Accel-Redirect when available so nginx serves the file directly for full download speed.
     */
    public function downloadRelease(string $id): \Illuminate\Http\Response|\Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\JsonResponse
    {
        $release = DesktopRelease::whereNull('deleted_at')
            ->where('status', 'published')
            ->findOrFail($id);

        if (! $release->download_available) {
            return response()->json(['error' => 'Download not available for this release'], 403);
        }

        if (! $release->file_path || ! Storage::disk('public')->exists($release->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        $release->increment('download_count');

        if (config('desktop.use_x_accel_redirect', true)) {
            $internalPath = '/internal-desktop-files/'.$release->file_path;
            $filename = $release->file_name ?? basename($release->file_path);
            if ($filename !== '') {
                $internalPath .= '?f='.rawurlencode($filename);
            }

            return response('', 200)
                ->header('X-Accel-Redirect', $internalPath)
                ->header('Content-Type', 'application/octet-stream');
        }

        return Storage::disk('public')->download(
            $release->file_path,
            $release->file_name ?? basename($release->file_path)
        );
    }

    /**
     * Download a prerequisite file (public, increments counter).
     * Uses X-Accel-Redirect when available so nginx serves the file directly for full download speed.
     */
    public function downloadPrerequisite(string $id): \Illuminate\Http\Response|\Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\JsonResponse
    {
        $prerequisite = DesktopPrerequisite::whereNull('deleted_at')
            ->where('is_active', true)
            ->findOrFail($id);

        if (! $prerequisite->file_path || ! Storage::disk('public')->exists($prerequisite->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        $prerequisite->increment('download_count');

        if (config('desktop.use_x_accel_redirect', true)) {
            $internalPath = '/internal-desktop-files/'.$prerequisite->file_path;
            $filename = $prerequisite->file_name ?? basename($prerequisite->file_path);
            if ($filename !== '') {
                $internalPath .= '?f='.rawurlencode($filename);
            }

            return response('', 200)
                ->header('X-Accel-Redirect', $internalPath)
                ->header('Content-Type', 'application/octet-stream');
        }

        return Storage::disk('public')->download(
            $prerequisite->file_path,
            $prerequisite->file_name ?? basename($prerequisite->file_path)
        );
    }

    /**
     * Public config for desktop download URL (used by platform admin UI to show/copy friendly URL).
     */
    public function desktopConfig(): \Illuminate\Http\JsonResponse
    {
        $baseUrl = rtrim(config('app.url'), '/');
        $path = trim(config('desktop.download_path'), '/');
        $filename = config('desktop.download_filename');
        $friendlyUrl = $path ? $baseUrl.'/'.$path.'/'.$filename : $baseUrl.'/'.$filename;

        return response()->json([
            'download_path' => config('desktop.download_path'),
            'download_filename' => $filename,
            'friendly_download_url' => $friendlyUrl,
            'updater_config_url' => $baseUrl.'/api/desktop/updates.txt',
        ]);
    }

    /**
     * Friendly download URL: redirect /downloads/Nazim.exe to the latest release file.
     * Used by the updater so it can point to a stable URL like https://example.com/downloads/Nazim.exe.
     */
    public function downloadLatestAt(string $filename): \Illuminate\Http\RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $expected = config('desktop.download_filename');
        if ($filename !== $expected) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $release = $this->getDownloadLatestRelease();

        if (! $release || ! $release->file_path) {
            return response()->json(['error' => 'No release available'], 404);
        }

        $url = config('app.url').'/api/desktop/releases/'.$release->id.'/download';

        return redirect()->away($url, 302);
    }

    /**
     * Serve the Advanced Installer updater configuration file (`;aiu;` format).
     *
     * If an updates file was uploaded via platform admin, that content is served.
     * Otherwise the file is generated from the latest published release in the format:
     * [Update] with Name, ProductVersion, URL, Size, SHA256, MD5, ServerFileName, Flags, RegistryKey, Version.
     */
    public function updaterConfig(): \Illuminate\Http\Response
    {
        $overridePath = 'desktop/updates_override.txt';
        if (Storage::disk('local')->exists($overridePath)) {
            $content = Storage::disk('local')->get($overridePath);

            return response($content, 200)
                ->header('Content-Type', 'text/plain; charset=utf-8')
                ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
        }

        $release = $this->getDownloadLatestRelease();

        if (! $release || ! $release->file_path) {
            return response(";aiu;\r\n", 200)
                ->header('Content-Type', 'text/plain; charset=utf-8');
        }

        $baseUrl = rtrim(config('app.url'), '/');
        $filename = config('desktop.download_filename');
        // Use direct API URL so updates.txt points only to the downloadable release (publish-to-download).
        // The friendly URL (/downloads/Nazim.exe) remains available for manual use.
        $downloadUrl = $baseUrl.'/api/desktop/releases/'.$release->id.'/download';

        $sha256 = $release->file_hash ? strtoupper($release->file_hash) : '';
        $md5 = $release->file_hash_md5 ? strtolower($release->file_hash_md5) : '';
        $flags = config('desktop.updater_flags', 'Critical');
        $registryKey = config('desktop.updater_registry_key', 'HKLM\\Software\\Nazim\\Nazim\\Version');

        $lines = [
            ';aiu;',
            '',
            '[Update]',
            'Name = '.$release->display_name,
            'ProductVersion = '.$release->version,
            'URL = '.$downloadUrl,
            'Size = '.($release->file_size ?? 0),
            'SHA256 = '.$sha256,
            'MD5 = '.$md5,
            'ServerFileName = '.($release->file_name ?? $filename),
            'Flags = '.$flags,
            'RegistryKey = '.$registryKey,
            'Version = '.$release->version,
        ];

        $content = implode("\r\n", $lines)."\r\n";

        return response($content, 200)
            ->header('Content-Type', 'text/plain; charset=utf-8')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    /**
     * Upload a custom updates.txt file (platform admin). When present, it is served instead of the auto-generated content.
     */
    public function uploadUpdatesFile(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:txt|max:1024',
        ]);

        $content = file_get_contents($request->file('file')->getRealPath());
        Storage::disk('local')->put('desktop/updates_override.txt', $content);

        return response()->json(['message' => 'Updates file uploaded. It will be served at /api/desktop/updates.txt until removed.']);
    }

    /**
     * Remove the custom updates.txt override (platform admin). After removal, auto-generated content is served again.
     */
    public function deleteUpdatesFile(): \Illuminate\Http\JsonResponse
    {
        $path = 'desktop/updates_override.txt';
        if (Storage::disk('local')->exists($path)) {
            Storage::disk('local')->delete($path);
        }

        return response()->json(['message' => 'Updates file override removed.']);
    }

    /**
     * Check if a custom updates file is set (platform admin).
     */
    public function hasUpdatesFile(): \Illuminate\Http\JsonResponse
    {
        $exists = Storage::disk('local')->exists('desktop/updates_override.txt');

        return response()->json(['has_override' => $exists]);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    /**
     * Get the release used for updates.txt and /downloads/Nazim.exe: published, download_available, is_latest or most recent.
     */
    private function getDownloadLatestRelease(): ?DesktopRelease
    {
        $release = DesktopRelease::whereNull('deleted_at')
            ->where('status', 'published')
            ->where('download_available', true)
            ->where('is_latest', true)
            ->first();

        if (! $release) {
            $release = DesktopRelease::whereNull('deleted_at')
                ->where('status', 'published')
                ->where('download_available', true)
                ->orderByDesc('published_at')
                ->first();
        }

        return $release;
    }

    private function formatRelease(DesktopRelease $r): array
    {
        $baseUrl = config('app.url');

        return [
            'id' => $r->id,
            'version' => $r->version,
            'display_name' => $r->display_name,
            'release_notes' => $r->release_notes,
            'file_path' => $r->file_path,
            'file_name' => $r->file_name,
            'file_size' => $r->file_size,
            'file_hash' => $r->file_hash,
            'file_hash_md5' => $r->file_hash_md5 ?? null,
            'status' => $r->status,
            'is_latest' => $r->is_latest,
            'download_available' => (bool) $r->download_available,
            'download_count' => $r->download_count,
            'download_url' => $r->file_path ? $baseUrl.'/api/desktop/releases/'.$r->id.'/download' : null,
            'published_at' => $r->published_at?->toISOString(),
            'created_at' => $r->created_at?->toISOString(),
            'updated_at' => $r->updated_at?->toISOString(),
        ];
    }

    private function formatPrerequisite(DesktopPrerequisite $p): array
    {
        $baseUrl = config('app.url');

        return [
            'id' => $p->id,
            'name' => $p->name,
            'version' => $p->version,
            'description' => $p->description,
            'file_path' => $p->file_path,
            'file_name' => $p->file_name,
            'file_size' => $p->file_size,
            'file_hash' => $p->file_hash,
            'install_order' => $p->install_order,
            'is_required' => $p->is_required,
            'is_active' => $p->is_active,
            'download_count' => $p->download_count,
            'download_url' => $p->file_path ? $baseUrl.'/api/desktop/prerequisites/'.$p->id.'/download' : null,
            'created_at' => $p->created_at?->toISOString(),
            'updated_at' => $p->updated_at?->toISOString(),
        ];
    }
}
