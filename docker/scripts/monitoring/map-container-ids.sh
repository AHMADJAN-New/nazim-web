#!/usr/bin/env bash

# Map Container IDs to Names
# Creates a mapping file for Prometheus relabeling

set -e

echo "Creating container ID to name mapping..."

# Create mapping: container_id -> container_name
docker ps --format "{{.ID}}\t{{.Names}}" | while read id name; do
  echo "$id -> $name"
done

echo ""
echo "This mapping will be used by Prometheus relabeling to add container_name labels."

