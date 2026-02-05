<?php

namespace App\Http\Middleware;

use App\Services\ActivityLogService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogActivity
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}

    /**
     * Handle an incoming request and log activity after response
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only log successful requests (status < 400)
        // Can be configured to log all requests if needed
        if ($response->getStatusCode() < 400) {
            try {
                // Extract action from route name or method
                $action = $this->extractAction($request);
                
                // Extract entity from route parameters
                $entityType = $this->extractEntityType($request);
                $entityId = $this->extractEntityId($request);

                // Build description
                $description = $this->getDescription($request, $action, $entityType, $entityId);

                // Log the activity
                $activity = $this->activityLogService->logEvent(
                    description: $description,
                    logName: $this->getLogName($request),
                    event: $action,
                    properties: $this->getProperties($request, $entityType, $entityId),
                    request: $request
                );

                // Update with status code
                $this->activityLogService->updateStatusCode($activity, $response->getStatusCode());
            } catch (\Exception $e) {
                // Don't let logging errors break the request
                // Log the error but don't throw
                if (config('app.debug')) {
                    \Log::warning('Activity logging failed: ' . $e->getMessage());
                }
            }
        }

        return $response;
    }

    /**
     * Extract action from route name or HTTP method
     */
    private function extractAction(Request $request): string
    {
        $routeName = $request->route()?->getName();
        if ($routeName) {
            // Extract from route name: students.store -> store
            $parts = explode('.', $routeName);
            $action = end($parts);
            
            // Map common route actions to events
            $actionMap = [
                'index' => 'viewed',
                'show' => 'viewed',
                'store' => 'created',
                'update' => 'updated',
                'destroy' => 'deleted',
            ];
            
            return $actionMap[$action] ?? $action;
        }
        
        // Fallback to HTTP method
        return strtolower($request->method());
    }

    /**
     * Extract entity type from route name
     */
    private function extractEntityType(Request $request): ?string
    {
        $routeName = $request->route()?->getName();
        if ($routeName) {
            $parts = explode('.', $routeName);
            return $parts[0] ?? null; // students, staff, etc.
        }
        return null;
    }

    /**
     * Extract entity ID from route parameters
     */
    private function extractEntityId(Request $request): ?string
    {
        // Try common parameter names
        return $request->route('id') 
            ?? $request->route('student')
            ?? $request->route('staff')
            ?? $request->route('class')
            ?? $request->route('subject')
            ?? null;
    }

    /**
     * Get log name based on route or request
     */
    private function getLogName(Request $request): string
    {
        $routeName = $request->route()?->getName();
        if ($routeName) {
            $parts = explode('.', $routeName);
            return $parts[0] ?? 'default'; // Use resource name as log name
        }
        return 'default';
    }

    /**
     * Build description from request context
     */
    private function getDescription(Request $request, string $action, ?string $entityType, ?string $entityId): string
    {
        if ($entityType && $entityId) {
            return ucfirst($action) . " {$entityType} {$entityId}";
        } elseif ($entityType) {
            return ucfirst($action) . " {$entityType}";
        }
        
        $routeName = $request->route()?->getName() ?? $request->path();
        return ucfirst($action) . " " . str_replace(['.', '-', '_'], ' ', $routeName);
    }

    /**
     * Get additional properties for logging
     */
    private function getProperties(Request $request, ?string $entityType, ?string $entityId): array
    {
        $properties = [
            'route' => $request->route()?->getName() ?? $request->path(),
            'method' => $request->method(),
        ];

        if ($entityType) {
            $properties['entity_type'] = $entityType;
        }

        if ($entityId) {
            $properties['entity_id'] = $entityId;
        }

        // Add query parameters (excluding sensitive data)
        $queryParams = $request->query();
        unset($queryParams['password'], $queryParams['token'], $queryParams['api_key']);
        if (!empty($queryParams)) {
            $properties['query_params'] = $queryParams;
        }

        return $properties;
    }
}
