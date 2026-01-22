# Grafana Loki Query Guide for Laravel Logs

## Understanding Your Logs

Your Laravel logs have two types of entries:

1. **Main log entries**: `[2026-01-17 20:19:54] production.ERROR: message`
   - These are parsed with `level` and `environment` labels
   - Have proper timestamps

2. **Stack traces**: Lines starting with `#` or file paths
   - These don't match the regex pattern
   - Pass through unchanged (no labels)
   - Use ingestion timestamp

## Recommended Queries

### 1. Only Main Log Entries (Filtered)

```logql
{job="laravel", level!=""}
```

This shows only logs that were successfully parsed (have a `level` label).

### 2. Only Errors and Critical

```logql
{job="laravel", level=~"ERROR|CRITICAL"}
```

### 3. Errors with Stack Traces (Full Context)

To see errors with their stack traces, use:

```logql
{job="laravel"} |~ "#[0-9]+"
```

This shows all logs, but you can filter in Grafana's UI.

### 4. Search for Specific Text

```logql
{job="laravel"} |= "database"
```

### 5. Exclude Stack Traces

```logql
{job="laravel"} !~ "^#"
```

This excludes lines starting with `#` (stack trace lines).

## Dashboard Filtering

In your Grafana dashboard, you can:

1. **Add a filter variable**:
   - Go to Dashboard Settings → Variables
   - Add variable: `level` with query: `label_values(level)`
   - Use `$level` in your queries

2. **Use LogQL in panels**:
   - Replace `{job="laravel"}` with `{job="laravel", level!=""}` to hide stack traces
   - Or use `{job="laravel"} !~ "^#"` to exclude stack trace lines

## Best Practices

1. **For monitoring**: Use `{job="laravel", level=~"ERROR|CRITICAL"}` to focus on issues
2. **For debugging**: Use `{job="laravel"} |= "your-search-term"` to find specific events
3. **For overview**: Use `{job="laravel", level!=""}` to see structured logs only

## Understanding the Log Format

- **Parsed logs** have labels: `level`, `environment`, `job`, `app`
- **Stack traces** have no labels (they're continuation lines)
- **Timestamps**: Parsed logs use log timestamp, stack traces use ingestion time

The current configuration correctly handles both types - you just need to filter appropriately in Grafana!

