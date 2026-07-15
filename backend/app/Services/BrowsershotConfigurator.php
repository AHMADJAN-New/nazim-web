<?php

namespace App\Services;

use Spatie\Browsershot\Browsershot;

/**
 * Shared Browsershot/Chrome launch defaults for Docker and restricted environments.
 *
 * In production containers www-data HOME is /var/www (not writable). Without writable
 * XDG config/cache dirs Chrome fails with: chrome_crashpad_handler: --database is required
 */
class BrowsershotConfigurator
{
    /**
     * Apply Docker-safe environment, Chromium args, and binary paths.
     *
     * @param  list<string>  $extraChromiumArguments  Extra args without the leading "--"
     */
    public static function apply(Browsershot $browsershot, array $extraChromiumArguments = []): Browsershot
    {
        $chromiumHome = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'.chromium';
        if (! is_dir($chromiumHome)) {
            @mkdir($chromiumHome, 0775, true);
        }

        $env = [
            'XDG_CONFIG_HOME' => $chromiumHome,
            'XDG_CACHE_HOME' => $chromiumHome,
            'CHROME_CONFIG_HOME' => $chromiumHome,
        ];

        foreach ($env as $key => $value) {
            putenv("{$key}={$value}");
        }

        $defaultCacheDir = PHP_OS_FAMILY === 'Windows'
            ? (getenv('USERPROFILE') ?: getenv('HOMEDRIVE').getenv('HOMEPATH')).DIRECTORY_SEPARATOR.'.cache'.DIRECTORY_SEPARATOR.'puppeteer'
            : '/var/www/.cache/puppeteer';
        $puppeteerCacheDir = env('PUPPETEER_CACHE_DIR') ?: getenv('PUPPETEER_CACHE_DIR') ?: $defaultCacheDir;
        if (is_string($puppeteerCacheDir) && $puppeteerCacheDir !== '') {
            if (! is_dir($puppeteerCacheDir)) {
                @mkdir($puppeteerCacheDir, 0775, true);
            }
            putenv("PUPPETEER_CACHE_DIR={$puppeteerCacheDir}");
            $env['PUPPETEER_CACHE_DIR'] = $puppeteerCacheDir;
        }

        $browsershot->setEnvironmentOptions($env);

        $args = array_values(array_unique(array_merge([
            'no-sandbox',
            'disable-setuid-sandbox',
            'disable-dev-shm-usage',
            'disable-gpu',
            'disable-crash-reporter',
        ], $extraChromiumArguments)));

        $browsershot->addChromiumArguments($args);

        $nodePath = env('BROWSERSHOT_NODE_BINARY') ?: getenv('BROWSERSHOT_NODE_BINARY') ?: '/usr/bin/node';
        if (is_string($nodePath) && $nodePath !== '' && file_exists($nodePath) && (PHP_OS_FAMILY === 'Windows' || is_executable($nodePath))) {
            $browsershot->setNodePath($nodePath);
        }

        $npmPath = env('BROWSERSHOT_NPM_BINARY') ?: getenv('BROWSERSHOT_NPM_BINARY') ?: '/usr/bin/npm';
        if (is_string($npmPath) && $npmPath !== '' && file_exists($npmPath) && (PHP_OS_FAMILY === 'Windows' || is_executable($npmPath))) {
            $browsershot->setNpmPath($npmPath);
        }

        $chromePath = self::findChromePath();
        if ($chromePath) {
            $browsershot->setChromePath($chromePath);
        }

        return $browsershot;
    }

    /**
     * Find Chrome/Chromium executable path.
     *
     * Priority:
     * 1. PUPPETEER_CHROME_PATH / BROWSERSHOT_CHROME_PATH
     * 2. Puppeteer cache
     * 3. System-installed Chrome/Chromium
     */
    public static function findChromePath(): ?string
    {
        $envChromePath = env('PUPPETEER_CHROME_PATH')
            ?: getenv('PUPPETEER_CHROME_PATH')
            ?: env('BROWSERSHOT_CHROME_PATH')
            ?: getenv('BROWSERSHOT_CHROME_PATH');

        if (is_string($envChromePath) && $envChromePath !== '' && is_file($envChromePath)) {
            if (PHP_OS_FAMILY === 'Windows' || is_executable($envChromePath)) {
                return $envChromePath;
            }
        }

        $sep = DIRECTORY_SEPARATOR;
        $possibleCacheDirs = [];

        if (PHP_OS_FAMILY === 'Windows') {
            $userProfile = getenv('USERPROFILE') ?: (getenv('HOMEDRIVE').getenv('HOMEPATH'));
            if ($userProfile) {
                $possibleCacheDirs[] = $userProfile.$sep.'.cache'.$sep.'puppeteer';
            }
            $possibleCacheDirs[] = getenv('PUPPETEER_CACHE_DIR') ?: null;
        } else {
            $possibleCacheDirs = [
                getenv('PUPPETEER_CACHE_DIR') ?: null,
                '/var/www/.cache/puppeteer',
                '/home/nazim/.cache/puppeteer',
                getenv('HOME') ? getenv('HOME').'/.cache/puppeteer' : null,
                '/root/.cache/puppeteer',
            ];
        }

        $possibleCacheDirs = array_filter($possibleCacheDirs, fn ($dir) => is_string($dir) && $dir !== '' && is_dir($dir));

        $chromePathPatterns = [];
        foreach ($possibleCacheDirs as $cache) {
            if (PHP_OS_FAMILY === 'Windows') {
                $chromePathPatterns[] = $cache.$sep.'chrome-headless-shell'.$sep.'win32-*'.$sep.'chrome-headless-shell'.$sep.'chrome-headless-shell.exe';
                $chromePathPatterns[] = $cache.$sep.'chrome-headless-shell'.$sep.'win64-*'.$sep.'chrome-headless-shell'.$sep.'chrome-headless-shell.exe';
                $chromePathPatterns[] = $cache.$sep.'chrome'.$sep.'win64-*'.$sep.'chrome-win64'.$sep.'chrome.exe';
                $chromePathPatterns[] = $cache.$sep.'chrome'.$sep.'win32-*'.$sep.'chrome-win'.$sep.'chrome.exe';
            } else {
                $chromePathPatterns[] = $cache.'/chrome-headless-shell/linux-*/chrome-headless-shell-linux64/chrome-headless-shell';
                $chromePathPatterns[] = $cache.'/chrome/linux-*/chrome-linux64/chrome';
            }
        }

        if (PHP_OS_FAMILY === 'Windows') {
            $localAppData = getenv('LOCALAPPDATA');
            $systemChromePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            ];
            if ($localAppData) {
                $systemChromePaths[] = $localAppData.$sep.'Google'.$sep.'Chrome'.$sep.'Application'.$sep.'chrome.exe';
            }
            $chromePathPatterns = array_merge($chromePathPatterns, $systemChromePaths);
        } else {
            $chromePathPatterns = array_merge($chromePathPatterns, [
                '/usr/bin/google-chrome',
                '/usr/bin/chromium',
                '/usr/bin/chromium-browser',
                '/snap/bin/chromium',
                '/usr/bin/google-chrome-stable',
            ]);
        }

        foreach ($chromePathPatterns as $pattern) {
            if ($pattern === null || $pattern === '') {
                continue;
            }
            $matches = glob($pattern);
            if (! empty($matches)) {
                rsort($matches);
                foreach ($matches as $chromePath) {
                    if (is_file($chromePath) && (PHP_OS_FAMILY === 'Windows' || is_executable($chromePath))) {
                        return $chromePath;
                    }
                }
            }
        }

        return null;
    }
}
