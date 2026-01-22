# Grafana Loki Log Monitoring Setup

This directory contains the configuration for Grafana Loki log aggregation and monitoring for the Nazim application.

## Overview

The monitoring stack includes:
- **Loki**: Log aggregation system (Grafana's native solution)
- **Promtail**: Log shipper that sends Laravel logs to Loki
- **Grafana**: Visualization dashboards for log inspection

## Architecture

```
Laravel Logs (storage/logs/laravel.log)
    ↓
Promtail (reads logs)
    ↓
Loki (stores logs)
    ↓
Grafana (visualizes logs)
```

## Setup Instructions

### 1. Start the Monitoring Stack

```bash
# Make sure the nazim_network exists
docker network create nazim_network 2>/dev/null || true

# Make sure the backend storage volume exists (from docker-compose.prod.yml)
docker volume create nazim_backend_storage 2>/dev/null || true

# Start the monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Access Grafana

1. Open your browser and navigate to: `http://localhost:3000`
2. Login with:
   - Username: `admin` (or value from `GRAFANA_ADMIN_USER` env var)
   - Password: `admin` (or value from `GRAFANA_ADMIN_PASSWORD` env var)
3. The Loki datasource is automatically configured
4. The "Laravel Logs Dashboard" is automatically available

### 3. Verify Log Collection

1. In Grafana, go to **Explore** (compass icon in left sidebar)
2. Select **Loki** as the datasource
3. Run this query: `{job="laravel"}`
4. You should see Laravel logs appearing

## Configuration Files

### Loki Configuration (`loki-config.yml`)
- Retention: 30 days
- Storage: Filesystem (local)
- Port: 3100

### Promtail Configuration (`promtail-config.yml`)
- Reads Laravel logs from: `/var/log/laravel/logs/**/*.log`
- Reads Docker container logs
- Sends logs to Loki at: `http://loki:3100`

### Grafana Datasource (`grafana/provisioning/datasources/prometheus.yml`)
- Prometheus datasource (for metrics)
- Loki datasource (for logs)

### Grafana Dashboard (`grafana/dashboards/laravel-logs.json`)
- Log volume by level
- Error count gauge
- Critical count gauge
- Full log viewer
- Error & critical logs filter
- Log distribution charts

## Log Queries

### Basic Queries

```logql
# All Laravel logs
{job="laravel"}

# Only errors
{job="laravel", level="ERROR"}

# Errors and critical
{job="laravel", level=~"ERROR|CRITICAL"}

# Search for specific text
{job="laravel"} |= "database"

# Search with regex
{job="laravel"} |~ "Exception|Error"
```

### Advanced Queries

```logql
# Count logs by level
sum(count_over_time({job="laravel"} [1m])) by (level)

# Error rate
rate({job="laravel", level="ERROR"}[5m])

# Top error messages
topk(10, sum(count_over_time({job="laravel", level="ERROR"} [1h])) by (message))
```

## Troubleshooting

### Logs Not Appearing

1. **Check Promtail is running:**
   ```bash
   docker logs nazim_monitoring_promtail
   ```

2. **Check Loki is running:**
   ```bash
   docker logs nazim_monitoring_loki
   ```

3. **Verify log file path:**
   ```bash
   # Check if Laravel logs exist in the volume
   docker run --rm -v nazim_backend_storage:/storage alpine ls -la /storage/logs/
   ```

4. **Check Promtail configuration:**
   ```bash
   docker exec nazim_monitoring_promtail cat /etc/promtail/config.yml
   ```

### Promtail Can't Read Logs

If Promtail can't access the logs, ensure:
1. The `nazim_backend_storage` volume exists
2. The volume is mounted correctly in Promtail
3. The log path in `promtail-config.yml` matches the actual log location

### Grafana Can't Connect to Loki

1. Check Loki is healthy:
   ```bash
   curl http://localhost:3100/ready
   ```

2. Check network connectivity:
   ```bash
   docker exec nazim_monitoring_grafana ping loki
   ```

3. Verify datasource configuration in Grafana UI:
   - Go to **Configuration** → **Data Sources** → **Loki**
   - Test the connection

## Log Retention

- **Retention Period**: 30 days (configurable in `loki-config.yml`)
- **Storage Location**: Docker volume `nazim_loki_data`
- **Cleanup**: Automatic (Loki handles retention)

## Performance Tuning

### For High Log Volume

1. Increase ingestion limits in `loki-config.yml`:
   ```yaml
   limits_config:
     ingestion_rate_mb: 32  # Increase from 16
     ingestion_burst_size_mb: 64  # Increase from 32
   ```

2. Increase query limits:
   ```yaml
   limits_config:
     max_query_length: 1440h  # 60 days
     max_query_parallelism: 64
   ```

## Security Notes

- Grafana is exposed on port 3000 (change if needed)
- Loki is exposed on port 3100 (internal network only recommended)
- Use environment variables for sensitive credentials
- Consider adding authentication/authorization for production

## Environment Variables

Set these in your `.env` or `docker-compose.monitoring.yml`:

```bash
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your_secure_password
```

## Useful Links

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Promtail Documentation](https://grafana.com/docs/loki/latest/clients/promtail/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Grafana Logs Panel](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/logs/)


