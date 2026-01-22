# Grafana Loki Setup - Manual Configuration Required

## ✅ What's Working

- **Loki**: Running and collecting logs ✅
- **Promtail**: Reading Laravel logs ✅  
- **Grafana**: Running and accessible ✅
- **Logs**: Being collected from Laravel ✅

## ⚠️ Manual Steps Required

Since Grafana had issues with automatic datasource provisioning, you need to manually configure:

### 1. Access Grafana

Open in your browser: **http://168.231.125.153:3000**

Default credentials:
- Username: `admin`
- Password: `admin` (or check `GRAFANA_ADMIN_PASSWORD` env var)

### 2. Add Loki Datasource

1. Go to **Configuration** → **Data Sources** (gear icon in left sidebar)
2. Click **Add data source**
3. Select **Loki**
4. Configure:
   - **URL**: `http://loki:3100`
   - **Name**: `Loki`
   - **UID**: `loki` (optional, but recommended)
5. Click **Save & Test** - should show "Data source is working"

### 3. Add Prometheus Datasource (if not already added)

1. Go to **Configuration** → **Data Sources**
2. Click **Add data source**
3. Select **Prometheus**
4. Configure:
   - **URL**: `http://prometheus:9090`
   - **Name**: `Prometheus`
   - **UID**: `prometheus`
5. Click **Save & Test**

### 4. Import Laravel Logs Dashboard

1. Go to **Dashboards** → **Import** (plus icon → Import)
2. Click **Upload JSON file**
3. Select: `docker/monitoring/grafana/dashboards/laravel-logs.json`
4. Or paste the JSON content
5. Select **Loki** as the datasource
6. Click **Import**

### 5. Verify Logs Are Showing

1. Go to **Explore** (compass icon)
2. Select **Loki** datasource
3. Run query: `{job="laravel"}`
4. You should see Laravel logs appearing

## Quick Test Queries

In Grafana Explore with Loki datasource:

```logql
# All Laravel logs
{job="laravel"}

# Only errors
{job="laravel", level="ERROR"}

# Errors and critical
{job="laravel", level=~"ERROR|CRITICAL"}

# Search for specific text
{job="laravel"} |= "database"

# Docker container logs
{job="docker"}
```

## Troubleshooting

### If Loki datasource shows "Data source is not working"

1. Check Loki is running:
   ```bash
   docker compose -f docker-compose.monitoring.yml ps loki
   ```

2. Test Loki from Grafana container:
   ```bash
   docker exec nazim_monitoring_grafana wget -qO- http://loki:3100/ready
   ```

3. Check network:
   ```bash
   docker exec nazim_monitoring_grafana ping -c 2 loki
   ```

### If No Logs Appear

1. Check Promtail is reading logs:
   ```bash
   docker logs nazim_monitoring_promtail | grep laravel
   ```

2. Verify logs exist:
   ```bash
   docker exec nazim_prod_php ls -lh /var/www/backend/storage/logs/
   ```

3. Test Loki query directly:
   ```bash
   curl -s -G "http://localhost:3100/loki/api/v1/query_range" \
     --data-urlencode 'query={job="laravel"}' \
     --data-urlencode 'limit=5'
   ```

## Files Created

- `docker-compose.monitoring.yml` - Updated with Loki and Promtail
- `docker/monitoring/loki-config.yml` - Loki configuration
- `docker/monitoring/promtail-config.yml` - Promtail configuration  
- `docker/monitoring/grafana/dashboards/laravel-logs.json` - Dashboard
- `docker/monitoring/add-loki-datasource.sh` - Helper script
- `docker/monitoring/README.md` - Full documentation
- `docker/monitoring/TROUBLESHOOTING.md` - Troubleshooting guide

## Next Steps

1. ✅ Access Grafana at http://168.231.125.153:3000
2. ✅ Add Loki datasource manually
3. ✅ Import the Laravel Logs Dashboard
4. ✅ Start exploring your logs!

The system is ready - you just need to complete the manual Grafana configuration steps above.

