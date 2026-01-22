# Monitoring Setup Guide

Complete guide for setting up and using Grafana + Prometheus monitoring stack.

## Quick Start

```bash
# Start monitoring stack
bash docker/scripts/monitoring/setup-monitoring.sh

# Check status
bash docker/scripts/monitoring/check-monitoring.sh

# Access Grafana
# URL: http://YOUR_SERVER_IP:3000
# Default credentials: admin / admin (change immediately!)
```

## What's Included

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization dashboards
- **Node Exporter**: System metrics (CPU, memory, disk, network)
- **cAdvisor**: Docker container metrics

## Recommended Dashboards

Import these community dashboards in Grafana:

1. **Node Exporter Full** (ID: 1860) - System metrics ✅ **YOU HAVE THIS**
2. **Docker Container Stats** (ID: 11074) - Individual containers
3. **Docker Monitoring** (ID: 15798) - Detailed container metrics

**To import:**
1. Open Grafana → Dashboards → Import
2. Enter dashboard ID
3. Select Prometheus data source
4. Click Import

## Container Monitoring

### Current Setup

cAdvisor exposes containers with systemd cgroup IDs (`/system.slice/docker-{id}.scope`). Prometheus relabeling transforms these to standard format.

### Using Grafana Explore

If dashboards don't show containers, use **Explore** with these queries:

```promql
# Container CPU Usage
rate(container_cpu_usage_seconds_total{id=~"/system.slice/docker-.*scope"}[5m]) * 100

# Container Memory Usage
container_memory_usage_bytes{id=~"/system.slice/docker-.*scope"}

# Container Network Receive
rate(container_network_receive_bytes_total{id=~"/system.slice/docker-.*scope"}[5m])

# Container Network Transmit
rate(container_network_transmit_bytes_total{id=~"/system.slice/docker-.*scope"}[5m])
```

### Fixing Container Format

If containers don't show in dashboards:

1. **Restart monitoring stack:**
   ```bash
   docker compose -f docker-compose.monitoring.yml restart cadvisor prometheus
   ```

2. **Wait 1-2 minutes** for metrics to populate

3. **Test in Grafana Explore** with queries above

4. **If still not working**, check Prometheus relabeling in `docker/monitoring/prometheus.yml`

## Troubleshooting

### Grafana Not Accessible

1. **Check firewall:**
   ```bash
   bash docker/scripts/monitoring/fix-firewall.sh
   ```

2. **Check container status:**
   ```bash
   docker ps | grep grafana
   docker logs nazim_monitoring_grafana --tail 50
   ```

3. **Verify port binding:**
   ```bash
   docker inspect nazim_monitoring_grafana | jq '.[0].NetworkSettings.Ports'
   ```

### No Data in Dashboards

1. **Check Prometheus targets:**
   ```bash
   curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'
   ```

2. **Check cAdvisor:**
   ```bash
   curl http://localhost:8080/metrics | grep container_cpu_usage_seconds_total | head -5
   ```

3. **Use Grafana Explore** to test queries directly

### Containers Not Showing

- **Use Grafana Explore** with queries matching your container ID format
- **Check Prometheus relabeling** configuration
- **Restart monitoring stack** after configuration changes

## Scripts

- `setup-monitoring.sh` - Setup and start monitoring stack
- `check-monitoring.sh` - Check monitoring stack status
- `fix-firewall.sh` - Open firewall ports for monitoring
- `fix-container-format.sh` - Fix container ID format issues

## Configuration Files

- `docker-compose.monitoring.yml` - Monitoring stack definition
- `docker/monitoring/prometheus.yml` - Prometheus configuration
- `docker/monitoring/alerts.yml` - Alert rules

## Ports

- **Grafana**: 3000
- **Prometheus**: 9090
- **cAdvisor**: 8080
- **Node Exporter**: 9100

Make sure these ports are open in your firewall!

## Security

1. **Change Grafana admin password** immediately after first login
2. **Use firewall** to restrict access to monitoring ports
3. **Don't expose** monitoring ports publicly unless necessary
4. **Use HTTPS** for Grafana in production (configure reverse proxy)

## Maintenance

- **Clean old metrics**: Prometheus retains 30 days by default
- **Monitor disk usage**: Prometheus data grows over time
- **Update dashboards**: Community dashboards get updates regularly
