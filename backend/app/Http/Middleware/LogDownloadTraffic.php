<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Middleware to log download traffic for bandwidth monitoring
 * Tracks file downloads, report downloads, and large API responses
 */
class LogDownloadTraffic
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only log downloads and large responses
        $isDownload = $this->isDownloadResponse($response);
        $isLargeResponse = $this->isLargeResponse($response);
        
        if ($isDownload || $isLargeResponse) {
            $this->logTraffic($request, $response);
        }

        return $response;
    }

    /**
     * Check if response is a file download
     */
    private function isDownloadResponse(Response $response): bool
    {
        // Check for download headers
        if ($response->headers->has('Content-Disposition')) {
            $disposition = $response->headers->get('Content-Disposition');
            return str_contains($disposition, 'attachment') || str_contains($disposition, 'filename');
        }

        // Check if it's a StreamedResponse (file download)
        if ($response instanceof StreamedResponse) {
            return true;
        }

        // Check if it's a BinaryFileResponse (file download)
        if ($response instanceof BinaryFileResponse) {
            return true;
        }

        return false;
    }

    /**
     * Check if response is large (> 1MB)
     */
    private function isLargeResponse(Response $response): bool
    {
        $contentLength = $response->headers->get('Content-Length');
        
        if ($contentLength) {
            return (int) $contentLength > 1048576; // 1MB
        }

        // For StreamedResponse, check Content-Type
        if ($response instanceof StreamedResponse || $response instanceof BinaryFileResponse) {
            $contentType = $response->headers->get('Content-Type');
            return in_array($contentType, [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel
                'application/vnd.ms-excel', // Excel
                'application/zip',
                'application/octet-stream',
            ]);
        }

        return false;
    }

    /**
     * Log traffic information
     */
    private function logTraffic(Request $request, Response $response): void
    {
        $user = $request->user();
        $userId = $user?->id ?? 'anonymous';
        $userEmail = $user?->email ?? 'anonymous';
        
        $endpoint = $request->path();
        $method = $request->method();
        $contentLength = $response->headers->get('Content-Length', 'unknown');
        $contentType = $response->headers->get('Content-Type', 'unknown');
        
        // Get filename if available
        $filename = null;
        if ($response->headers->has('Content-Disposition')) {
            $disposition = $response->headers->get('Content-Disposition');
            if (preg_match('/filename="?([^"]+)"?/', $disposition, $matches)) {
                $filename = $matches[1];
            }
        }

        // Calculate size in MB
        $sizeMB = 'unknown';
        if ($contentLength !== 'unknown' && is_numeric($contentLength)) {
            $sizeMB = round((int) $contentLength / 1048576, 2) . ' MB';
        }

        // Log download activity
        Log::info('File download tracked', [
            'user_id' => $userId,
            'user_email' => $userEmail,
            'endpoint' => $endpoint,
            'method' => $method,
            'filename' => $filename,
            'content_type' => $contentType,
            'size_bytes' => $contentLength,
            'size_mb' => $sizeMB,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}

