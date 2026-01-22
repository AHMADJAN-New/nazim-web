# Monitoring Scripts

Quick reference for monitoring setup and usage.

## Setup

```bash
# Start monitoring stack (Grafana + Prometheus)
bash docker/scripts/monitoring/setup-monitoring.sh
```

## Access

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **cAdvisor**: http://localhost:8080

## Quick Commands

```bash
# Start monitoring
docker compose -f docker-compose.monitoring.yml up -d

# Stop monitoring
docker compose -f docker-compose.monitoring.yml down

# View logs
docker logs -f nazim_monitoring_grafana
docker logs -f nazim_monitoring_prometheus

# Restart services
docker compose -f docker-compose.monitoring.yml restart
```

## See Full Documentation

See `docker/docs/MONITORING.md` for complete guide.

