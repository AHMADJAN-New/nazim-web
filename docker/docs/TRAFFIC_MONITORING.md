# Traffic Monitoring

Guide for monitoring and analyzing network traffic on your Nazim server.

## Overview

The application tracks traffic through:
- **Nginx access logs**: API endpoint requests
- **Laravel download logs**: File downloads and large responses
- **System metrics**: Network I/O via Node Exporter

## Quick Analysis

```bash
# Quick traffic summary
bash docker/scripts/maintenance/traffic-summary.sh

# Detailed analysis
bash docker/scripts/maintenance/analyze-traffic.sh

# Monitor in real-time
bash docker/scripts/maintenance/monitor-traffic.sh
```

## Traffic Sources

### Nginx Access Logs

Located at: `/var/log/nginx/api_access.log` (inside nginx container)

Tracks:
- API endpoint requests
- Request size
- Response size
- Client IP
- Timestamp

### Laravel Download Logs

Tracked via `LogDownloadTraffic` middleware:

- File downloads (reports, documents, etc.)
- Large API responses (>1MB)
- User information
- File sizes
- Endpoints

## Monitoring Scripts

### `traffic-summary.sh`

Quick overview:
- Total bandwidth
- Top endpoints
- Downloads by user
- Time range summary

### `analyze-traffic.sh`

Detailed analysis:
- Bandwidth by time period
- Top endpoints by traffic
- Download activity
- User activity

### `monitor-traffic.sh`

Real-time monitoring:
- System network I/O
- Docker network traffic
- Nginx access logs
- Laravel download activity

## Grafana Monitoring

If monitoring stack is set up:

- **Dashboard 1860** (Node Exporter Full) shows network I/O
- **Custom queries** for traffic analysis:
  ```promql
  # Network receive rate
  rate(node_network_receive_bytes_total[5m])
  
  # Network transmit rate
  rate(node_network_transmit_bytes_total[5m])
  ```

## Common Issues

### High Traffic with Few Users

**Possible causes:**
- Large file downloads
- Report generation
- API responses with large payloads
- Automated requests/cron jobs

**Investigation:**
```bash
# Check download activity
bash docker/scripts/maintenance/analyze-traffic.sh --hours 1

# Check top endpoints
bash docker/scripts/maintenance/traffic-summary.sh
```

### Unexpected Traffic Spikes

**Check:**
1. Nginx access logs for unusual patterns
2. Laravel logs for large downloads
3. System metrics for network I/O
4. User activity logs

## Best Practices

1. **Monitor regularly**: Check traffic patterns weekly
2. **Set up alerts**: Use Grafana alerts for traffic spikes
3. **Optimize downloads**: Compress large files when possible
4. **Review logs**: Check for unusual patterns
5. **Use caching**: Reduce API response sizes

## Scripts

- `traffic-summary.sh` - Quick traffic overview
- `analyze-traffic.sh` - Detailed traffic analysis
- `monitor-traffic.sh` - Real-time traffic monitoring
- `enable-traffic-logging.sh` - Enable Nginx access logging
