# Disk Usage Management

Guide for managing disk space on your Nazim server.

## Quick Diagnostics

```bash
# Check overall disk usage
df -h

# Check Docker disk usage
docker system df -v

# Detailed diagnostic
bash docker/scripts/maintenance/check-disk-usage.sh
```

## Cleanup

### Production-Safe Cleanup

```bash
# Interactive cleanup (protects database and storage)
bash docker/scripts/maintenance/cleanup-docker.sh
```

**What it cleans:**
- ✅ Stopped containers
- ✅ Dangling images
- ✅ Unused images
- ✅ Build cache
- ✅ Unused networks
- ✅ Container logs

**What it protects:**
- ✅ Database volumes (`nazim_pg_data`)
- ✅ Application storage (`nazim_backend_storage`)
- ✅ Redis data (`nazim_redis_data`)
- ✅ SSL certificates (`nazim_letsencrypt`)

### Automatic Cleanup After Builds

Build scripts automatically clean up dangling images:

- `bootstrap.sh` - Cleans after initial build
- `update.sh` - Cleans after updates
- `build-with-cleanup.sh` - Standalone build with cleanup

## Prevention

### Log Rotation

All services have log rotation configured in `docker-compose.prod.yml`:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

This limits logs to 30MB per service (3 files × 10MB).

### Regular Maintenance

Run cleanup monthly or when disk usage exceeds 80%:

```bash
bash docker/scripts/maintenance/cleanup-docker.sh
```

## Common Issues

### High Disk Usage After Builds

**Problem:** `docker compose build` creates new images without removing old ones.

**Solution:** Build scripts now automatically clean up dangling images. If manual cleanup needed:

```bash
docker image prune -f
```

### Log Files Growing

**Problem:** Container logs consuming disk space.

**Solution:** Log rotation is configured. To manually truncate logs:

```bash
# Find large log files
docker ps -q | xargs -I {} sh -c 'docker inspect --format="{{.LogPath}}" {}' | xargs ls -lh

# Truncate logs (if needed)
docker ps -q | xargs -I {} sh -c 'truncate -s 0 $(docker inspect --format="{{.LogPath}}" {})'
```

### Build Cache Growing

**Problem:** Docker build cache consuming disk space.

**Solution:** Clean build cache:

```bash
docker builder prune -a -f
```

**Warning:** This removes all build cache. Next builds will be slower.

## Monitoring Disk Usage

Use Grafana monitoring (if set up):

- **Dashboard 1860** (Node Exporter Full) shows disk usage
- **Alert rules** can notify when disk usage exceeds thresholds

## Best Practices

1. **Monitor regularly**: Check disk usage weekly
2. **Clean after builds**: Build scripts handle this automatically
3. **Keep logs small**: Log rotation is configured
4. **Protect critical data**: Cleanup scripts protect database and storage
5. **Use monitoring**: Set up alerts for disk usage

## Scripts

- `check-disk-usage.sh` - Diagnose disk usage
- `cleanup-docker.sh` - Production-safe cleanup
- `build-with-cleanup.sh` - Build with automatic cleanup
