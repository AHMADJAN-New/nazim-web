# Docker Documentation

Essential documentation for managing Nazim in production.

## Quick Reference

### Getting Started
- **[QUICK_START.md](QUICK_START.md)** - Quick setup guide for new servers
- **[PRODUCTION_SCRIPTS.md](PRODUCTION_SCRIPTS.md)** - Production scripts reference
- **[PRODUCTION_ENV_FILES.md](PRODUCTION_ENV_FILES.md)** - Environment configuration

### Operations
- **[DISK_USAGE.md](DISK_USAGE.md)** - Disk space management and cleanup
- **[TRAFFIC_MONITORING.md](TRAFFIC_MONITORING.md)** - Network traffic analysis
- **[MONITORING.md](MONITORING.md)** - Grafana + Prometheus monitoring setup

## Documentation Overview

### QUICK_START.md
One-page guide for setting up Nazim on a new server. Includes prerequisites, setup steps, and verification.

### PRODUCTION_SCRIPTS.md
Complete reference for all production scripts:
- Setup scripts (`setup.sh`, `bootstrap.sh`)
- Maintenance scripts (`update.sh`, `cleanup-docker.sh`)
- Monitoring scripts (`setup-monitoring.sh`, `check-monitoring.sh`)

### PRODUCTION_ENV_FILES.md
Environment file configuration guide:
- Required environment variables
- File locations
- Security best practices

### DISK_USAGE.md
Disk space management:
- Diagnosing disk usage
- Production-safe cleanup
- Log rotation
- Prevention strategies

### TRAFFIC_MONITORING.md
Network traffic monitoring:
- Traffic analysis scripts
- Nginx access logs
- Laravel download tracking
- Grafana integration

### MONITORING.md
Complete monitoring stack guide:
- Grafana + Prometheus setup
- Recommended dashboards
- Container monitoring
- Troubleshooting

## Scripts Location

All scripts are in `docker/scripts/`:
- `docker/scripts/prod/` - Production setup scripts
- `docker/scripts/maintenance/` - Maintenance scripts
- `docker/scripts/monitoring/` - Monitoring scripts

## Need Help?

1. **Setup issues**: See [QUICK_START.md](QUICK_START.md)
2. **Script usage**: See [PRODUCTION_SCRIPTS.md](PRODUCTION_SCRIPTS.md)
3. **Disk space**: See [DISK_USAGE.md](DISK_USAGE.md)
4. **Monitoring**: See [MONITORING.md](MONITORING.md)
5. **Traffic analysis**: See [TRAFFIC_MONITORING.md](TRAFFIC_MONITORING.md)

