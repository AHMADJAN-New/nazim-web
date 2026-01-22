# Troubleshooting Grafana Loki Setup

## Issue: Loki Datasource Not Found in Grafana

### Symptoms
- Grafana shows "Loki datasource was not found"
- No data appears in dashboards
- Error when trying to query logs

### Solutions

#### 1. Verify Services Are Running

```bash
docker compose -f docker-compose.monitoring.yml ps
```

All services (loki, promtail, grafana) should be "Up" and running.

#### 2. Check Loki is Accessible

```bash
# Test Loki readiness
curl http://localhost:3100/ready

# Test Loki API
curl http://localhost:3100/loki/api/v1/labels
```

Should return `ready` and JSON with labels.

#### 3. Restart Grafana to Reload Datasources

```bash
docker restart nazim_monitoring_grafana
```

Wait 10-15 seconds for Grafana to fully restart, then refresh the browser.

#### 4. Manually Add Loki Datasource in Grafana

If automatic provisioning doesn't work:

1. Go to Grafana: http://localhost:3000
2. Login (admin/admin)
3. Go to **Configuration** → **Data Sources**
4. Click **Add data source**
5. Select **Loki**
6. Set URL: `http://loki:3100`
7. Click **Save & Test**

#### 5. Check Grafana Logs

```bash
docker logs nazim_monitoring_grafana | grep -i loki
```

Look for any errors related to datasource provisioning.

#### 6. Verify Datasource Configuration File

Check that the datasource file exists and is correct:

```bash
cat docker/monitoring/grafana/provisioning/datasources/prometheus.yml
```

Should contain both Prometheus and Loki datasources.

#### 7. Check Network Connectivity

```bash
# From Grafana container
docker exec nazim_monitoring_grafana ping -c 2 loki

# From Promtail container
docker exec nazim_monitoring_promtail ping -c 2 loki
```

Both should be able to reach Loki.

## Issue: No Logs Appearing

### Symptoms
- Loki datasource works but no logs show up
- Queries return empty results

### Solutions

#### 1. Check Promtail is Running

```bash
docker logs nazim_monitoring_promtail
```

Should show "Starting Promtail" and no errors.

#### 2. Verify Log Files Exist

```bash
# Check if Laravel logs exist in the volume
docker run --rm -v nazim_backend_storage:/storage alpine ls -la /storage/logs/
```

Should show `laravel.log` or `laravel-*.log` files.

#### 3. Check Promtail Configuration

```bash
docker exec nazim_monitoring_promtail cat /etc/promtail/config.yml
```

Verify the `__path__` matches the actual log location.

#### 4. Test Log Query in Loki

```bash
# Query for any logs
curl "http://localhost:3100/loki/api/v1/query_range?query={job=\"laravel\"}&limit=10"

# Query for Docker logs
curl "http://localhost:3100/loki/api/v1/query_range?query={job=\"docker\"}&limit=10"
```

If these return data, logs are being collected.

#### 5. Check Promtail Positions

```bash
docker exec nazim_monitoring_promtail cat /tmp/positions.yaml
```

This shows which files Promtail is reading and the position in each file.

#### 6. Generate Test Logs

Create a test log entry in Laravel:

```bash
# From Laravel container
docker exec nazim_prod_php php artisan tinker
# Then run:
Log::info('Test log entry from Grafana setup');
```

Wait a few seconds, then check if it appears in Grafana.

## Issue: Loki Container Unhealthy

### Symptoms
- Loki shows as "unhealthy" in `docker ps`
- Promtail can't connect to Loki

### Solutions

#### 1. Check Loki Logs

```bash
docker logs nazim_monitoring_loki | tail -50
```

Look for errors or warnings.

#### 2. Test Loki Manually

```bash
curl http://localhost:3100/ready
curl http://localhost:3100/metrics
```

If these work, Loki is actually running fine - the healthcheck might be too strict.

#### 3. Increase Healthcheck Timeout

Edit `docker-compose.monitoring.yml`:

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3100/ready"]
  interval: 30s
  timeout: 15s
  retries: 5
  start_period: 30s  # Give Loki more time to start
```

#### 4. Check Loki Configuration

```bash
docker exec nazim_monitoring_loki cat /etc/loki/local-config.yaml
```

Verify the configuration is valid YAML.

## Issue: Promtail Configuration Errors

### Symptoms
- Promtail fails to start
- Errors about "invalid timestamp stage config"

### Solutions

#### 1. Check Promtail Logs

```bash
docker logs nazim_monitoring_promtail
```

Look for specific error messages.

#### 2. Validate Configuration

The Promtail config should not have timestamp stages for Docker logs that don't have a timestamp source. Remove problematic timestamp stages.

#### 3. Test Configuration

```bash
docker run --rm -v $(pwd)/docker/monitoring/promtail-config.yml:/etc/promtail/config.yml:ro grafana/promtail:latest -config.file=/etc/promtail/config.yml -dry-run
```

This validates the configuration without starting Promtail.

## Quick Fixes

### Restart All Services

```bash
docker compose -f docker-compose.monitoring.yml restart
```

### Recreate Services

```bash
docker compose -f docker-compose.monitoring.yml down
docker compose -f docker-compose.monitoring.yml up -d
```

### Check All Services Status

```bash
docker compose -f docker-compose.monitoring.yml ps
curl http://localhost:3100/ready  # Loki
curl http://localhost:3000/api/health  # Grafana
```

## Still Having Issues?

1. Check all container logs:
   ```bash
   docker logs nazim_monitoring_loki
   docker logs nazim_monitoring_promtail
   docker logs nazim_monitoring_grafana
   ```

2. Verify network connectivity:
   ```bash
   docker network inspect nazim_network | grep -A 5 "Containers"
   ```

3. Check volume mounts:
   ```bash
   docker inspect nazim_monitoring_promtail | grep -A 10 "Mounts"
   ```

4. Test Loki API directly:
   ```bash
   curl "http://localhost:3100/loki/api/v1/labels"
   curl "http://localhost:3100/loki/api/v1/query_range?query={job=\"laravel\"}"
   ```


