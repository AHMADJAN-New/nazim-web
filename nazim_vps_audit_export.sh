#!/usr/bin/env bash
set -euo pipefail

# ============================
# Nazim VPS Audit + Export
# Read-only collector for:
# - OS + packages + services
# - Nginx/PHP-FPM/PostgreSQL/Supervisor
# - Firewall, SSL certs, cron, env hints
# - Project tree summary (no big files)
# Outputs: nazim_audit_<host>_<date>.tar.gz
# ============================

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "ERROR: Please run as root (sudo)."
  exit 1
fi

HOST="$(hostname -s || echo unknownhost)"
TS="$(date +%Y%m%d_%H%M%S)"
OUTDIR="nazim_audit_${HOST}_${TS}"
TARBALL="${OUTDIR}.tar.gz"

# Change this if your app lives elsewhere
DEFAULT_APP_PATH="/var/www"
APP_PATH="${1:-$DEFAULT_APP_PATH}"

mkdir -p "${OUTDIR}"/{system,network,services,nginx,php,postgres,supervisor,cron,security,app,logs}

log() { echo "[+] $*"; }
save_cmd() {
  local out="$1"; shift
  ( "$@" ) > "${OUTDIR}/${out}" 2>&1 || true
}

# Detect package manager
PM="apt"
if command -v apt >/dev/null 2>&1; then PM="apt"; fi
if command -v dnf >/dev/null 2>&1; then PM="dnf"; fi
if command -v yum >/dev/null 2>&1; then PM="yum"; fi

log "Collecting system info..."
save_cmd "system/date.txt" date
save_cmd "system/uptime.txt" uptime
save_cmd "system/uname.txt" uname -a
save_cmd "system/os-release.txt" cat /etc/os-release
save_cmd "system/lsb-release.txt" bash -lc 'lsb_release -a 2>/dev/null || true'
save_cmd "system/cpu.txt" bash -lc 'lscpu 2>/dev/null || cat /proc/cpuinfo | head -n 200'
save_cmd "system/mem.txt" bash -lc 'free -h; echo; cat /proc/meminfo | head -n 80'
save_cmd "system/disk.txt" bash -lc 'df -hT; echo; lsblk -f'
save_cmd "system/mounts.txt" mount
save_cmd "system/env_root_sanitized.txt" bash -lc 'env | sort | sed -E "s/(PASS|PASSWORD|SECRET|TOKEN|KEY)=.*/\1=REDACTED/Ig"'
save_cmd "system/users.txt" bash -lc 'cat /etc/passwd'
save_cmd "system/groups.txt" bash -lc 'cat /etc/group'
save_cmd "system/sudoers.txt" bash -lc 'grep -R "^[^#]" /etc/sudoers /etc/sudoers.d 2>/dev/null || true'
save_cmd "system/timezone.txt" bash -lc 'timedatectl 2>/dev/null || true'

log "Collecting installed packages..."
if [[ "$PM" == "apt" ]]; then
  save_cmd "system/packages_apt.txt" bash -lc 'dpkg -l'
  save_cmd "system/apt_policy_php.txt" bash -lc 'apt-cache policy php php8.2 php8.3 2>/dev/null || true'
elif [[ "$PM" == "dnf" ]]; then
  save_cmd "system/packages_dnf.txt" bash -lc 'dnf list installed'
else
  save_cmd "system/packages_yum.txt" bash -lc 'yum list installed'
fi

log "Collecting network info..."
save_cmd "network/ip_addr.txt" ip addr
save_cmd "network/ip_route.txt" ip route
save_cmd "network/resolv.conf.txt" cat /etc/resolv.conf
save_cmd "network/hosts.txt" cat /etc/hosts
save_cmd "network/listening_ports.txt" bash -lc 'ss -tulpn || netstat -tulpn'
save_cmd "network/public_ip.txt" bash -lc 'curl -s https://ifconfig.me || true'

log "Collecting service info..."
save_cmd "services/systemctl_status.txt" bash -lc 'systemctl --no-pager --full status nginx php8.2-fpm php-fpm postgresql postgresql@15-main supervisor 2>/dev/null || true'
save_cmd "services/systemctl_enabled.txt" bash -lc 'systemctl list-unit-files --type=service | grep enabled || true'
save_cmd "services/systemd_failed.txt" bash -lc 'systemctl --failed --no-pager || true'
save_cmd "services/journal_nginx_last300.txt" bash -lc 'journalctl -u nginx -n 300 --no-pager 2>/dev/null || true'
save_cmd "services/journal_phpfpm_last300.txt" bash -lc 'journalctl -u php8.2-fpm -n 300 --no-pager 2>/dev/null || true'
save_cmd "services/journal_postgres_last300.txt" bash -lc 'journalctl -u postgresql -n 300 --no-pager 2>/dev/null || true'

log "Collecting Nginx config..."
if [[ -d /etc/nginx ]]; then
  tar -czf "${OUTDIR}/nginx/nginx_etc.tar.gz" -C /etc nginx >/dev/null 2>&1 || true
  save_cmd "nginx/nginx_version.txt" nginx -v
  save_cmd "nginx/nginx_T.txt" bash -lc 'nginx -T 2>/dev/null || true'
  save_cmd "nginx/sites_enabled_list.txt" bash -lc 'ls -la /etc/nginx/sites-enabled 2>/dev/null || true'
  save_cmd "nginx/sites_available_list.txt" bash -lc 'ls -la /etc/nginx/sites-available 2>/dev/null || true'
fi

log "Collecting PHP + PHP-FPM info..."
save_cmd "php/php_version.txt" php -v
save_cmd "php/php_modules.txt" php -m
save_cmd "php/php_ini_loaded.txt" php --ini
save_cmd "php/php_fpm_version.txt" bash -lc 'php-fpm -v 2>/dev/null || true; php8.2-fpm -v 2>/dev/null || true'
if [[ -d /etc/php ]]; then
  tar -czf "${OUTDIR}/php/php_etc.tar.gz" -C /etc php >/dev/null 2>&1 || true
fi

log "Collecting PostgreSQL info..."
save_cmd "postgres/psql_version.txt" psql --version
if command -v pg_config >/dev/null 2>&1; then
  save_cmd "postgres/pg_config.txt" pg_config
fi
# Postgres configs (safe to export)
if [[ -d /etc/postgresql ]]; then
  tar -czf "${OUTDIR}/postgres/postgresql_etc.tar.gz" -C /etc postgresql >/dev/null 2>&1 || true
fi
save_cmd "postgres/postgres_list_databases.txt" bash -lc 'sudo -u postgres psql -Atc "\l" 2>/dev/null || true'
save_cmd "postgres/postgres_list_roles.txt" bash -lc 'sudo -u postgres psql -Atc "\du" 2>/dev/null || true'
save_cmd "postgres/postgres_hba_path.txt" bash -lc 'sudo -u postgres psql -Atc "show hba_file;" 2>/dev/null || true'
save_cmd "postgres/postgres_conf_path.txt" bash -lc 'sudo -u postgres psql -Atc "show config_file;" 2>/dev/null || true'
save_cmd "postgres/postgres_settings_core.txt" bash -lc 'sudo -u postgres psql -Atc "show listen_addresses; show port; show max_connections; show shared_buffers; show work_mem; show wal_level;" 2>/dev/null || true'

log "Collecting Supervisor info..."
if [[ -d /etc/supervisor ]]; then
  tar -czf "${OUTDIR}/supervisor/supervisor_etc.tar.gz" -C /etc supervisor >/dev/null 2>&1 || true
fi
save_cmd "supervisor/supervisorctl_status.txt" bash -lc 'supervisorctl status 2>/dev/null || true'

log "Collecting cron jobs..."
save_cmd "cron/system_crontab.txt" bash -lc 'cat /etc/crontab 2>/dev/null || true'
save_cmd "cron/cron_d_list.txt" bash -lc 'ls -la /etc/cron.d 2>/dev/null || true'
tar -czf "${OUTDIR}/cron/cron_d.tar.gz" -C /etc cron.d >/dev/null 2>&1 || true
save_cmd "cron/root_crontab.txt" bash -lc 'crontab -l 2>/dev/null || true'

log "Collecting firewall + security posture..."
save_cmd "security/ufw_status.txt" bash -lc 'ufw status verbose 2>/dev/null || true'
save_cmd "security/iptables_rules.txt" bash -lc 'iptables -S 2>/dev/null || true'
save_cmd "security/fail2ban_status.txt" bash -lc 'fail2ban-client status 2>/dev/null || true'
save_cmd "security/ssh_config.txt" bash -lc 'sshd -T 2>/dev/null || true; echo; cat /etc/ssh/sshd_config 2>/dev/null || true'

log "Collecting SSL cert info (CERTS only by default)..."
# Safe: copy cert/public chain; NOT private keys unless user explicitly agrees later
mkdir -p "${OUTDIR}/security/ssl_public"
if [[ -d /etc/letsencrypt/live ]]; then
  find /etc/letsencrypt/live -maxdepth 2 -type f \( -name "fullchain.pem" -o -name "cert.pem" -o -name "chain.pem" \) \
    -exec bash -lc 'dest="'${OUTDIR}'/security/ssl_public/$(echo "{}" | sed "s#/#_#g")"; cp "{}" "$dest" 2>/dev/null || true' \; 2>/dev/null || true
fi

log "Collecting application hints..."
save_cmd "app/app_path_used.txt" bash -lc "echo APP_PATH='${APP_PATH}'"
save_cmd "app/dirs_var_www.txt" bash -lc 'ls -la /var/www 2>/dev/null || true'
save_cmd "app/find_laravel_projects.txt" bash -lc 'find '"${APP_PATH}"' -maxdepth 4 -type f -name artisan 2>/dev/null || true'
save_cmd "app/find_env_files.txt" bash -lc 'find '"${APP_PATH}"' -maxdepth 6 -type f -name .env 2>/dev/null || true'

# Attempt to locate a Laravel project and capture composer/app details
LARAVEL_ARTISAN="$(find "${APP_PATH}" -maxdepth 5 -type f -name artisan 2>/dev/null | head -n 1 || true)"
if [[ -n "${LARAVEL_ARTISAN}" ]]; then
  LARAVEL_ROOT="$(dirname "${LARAVEL_ARTISAN}")"
  log "Detected Laravel root: ${LARAVEL_ROOT}"
  echo "${LARAVEL_ROOT}" > "${OUTDIR}/app/laravel_root_detected.txt"

  save_cmd "app/laravel_composer_json.txt" bash -lc "cat '${LARAVEL_ROOT}/composer.json' 2>/dev/null || true"
  save_cmd "app/laravel_package_json.txt" bash -lc "cat '${LARAVEL_ROOT}/package.json' 2>/dev/null || true"
  save_cmd "app/laravel_env_example.txt" bash -lc "cat '${LARAVEL_ROOT}/.env.example' 2>/dev/null || true"
  save_cmd "app/laravel_storage_permissions.txt" bash -lc "ls -ld '${LARAVEL_ROOT}/storage' '${LARAVEL_ROOT}/bootstrap/cache' 2>/dev/null || true"
  save_cmd "app/laravel_tree_top.txt" bash -lc "cd '${LARAVEL_ROOT}' && find . -maxdepth 3 -type d -print | sed 's#^./##' | sort"
  save_cmd "app/laravel_git_status.txt" bash -lc "cd '${LARAVEL_ROOT}' && git status 2>/dev/null || true"
  save_cmd "app/laravel_git_remote.txt" bash -lc "cd '${LARAVEL_ROOT}' && git remote -v 2>/dev/null || true"

  # Try artisan summaries without requiring DB connectivity
  save_cmd "app/artisan_version.txt" bash -lc "cd '${LARAVEL_ROOT}' && php artisan --version 2>/dev/null || true"
  save_cmd "app/artisan_env_hint.txt" bash -lc "cd '${LARAVEL_ROOT}' && php artisan env 2>/dev/null || true"
  save_cmd "app/artisan_route_list_head.txt" bash -lc "cd '${LARAVEL_ROOT}' && php artisan route:list --columns=method,uri,name --compact 2>/dev/null | head -n 200 || true"
fi

log "Collecting last logs (small samples)..."
# Nginx logs
save_cmd "logs/nginx_access_tail.txt" bash -lc 'tail -n 300 /var/log/nginx/access.log 2>/dev/null || true'
save_cmd "logs/nginx_error_tail.txt" bash -lc 'tail -n 300 /var/log/nginx/error.log 2>/dev/null || true'

# PHP-FPM logs (common locations vary)
save_cmd "logs/php_fpm_logs_hint.txt" bash -lc 'ls -la /var/log/php* /var/log/php8.2-fpm* 2>/dev/null || true'
save_cmd "logs/syslog_tail.txt" bash -lc 'tail -n 200 /var/log/syslog 2>/dev/null || true'

# ============================
# Optional sensitive export
# ============================
echo
echo "----------------------------------------------"
echo "OPTIONAL: Include sensitive files?"
echo " - Laravel .env contains DB passwords, APP_KEY"
echo " - SSL private keys should NEVER be exported unless you fully trust the destination"
echo "Type YES to include .env files in the tarball (keys still excluded)."
echo "Type KEYS to include SSL private keys too (NOT recommended)."
echo "Anything else = skip."
echo "----------------------------------------------"
read -r -p "Your choice [skip/YES/KEYS]: " SENSITIVE || true

if [[ "${SENSITIVE}" == "YES" || "${SENSITIVE}" == "KEYS" ]]; then
  log "Including Laravel .env files (SENSITIVE)..."
  mkdir -p "${OUTDIR}/security/sensitive_env"
  find "${APP_PATH}" -maxdepth 6 -type f -name .env 2>/dev/null | while read -r f; do
    # Copy as-is (because user asked for "all aspects")
    # Keep file names unique by path encoding
    dest="${OUTDIR}/security/sensitive_env/$(echo "$f" | sed 's#/#_#g')"
    cp "$f" "$dest" 2>/dev/null || true
  done
fi

if [[ "${SENSITIVE}" == "KEYS" ]]; then
  log "Including SSL private keys (HIGH RISK)..."
  mkdir -p "${OUTDIR}/security/ssl_private"
  # WARNING: This may expose your cert private keys
  find /etc/letsencrypt -type f -name "privkey.pem" 2>/dev/null | while read -r k; do
    dest="${OUTDIR}/security/ssl_private/$(echo "$k" | sed 's#/#_#g')"
    cp "$k" "$dest" 2>/dev/null || true
  done
fi

log "Creating tarball: ${TARBALL}"
tar -czf "${TARBALL}" "${OUTDIR}"

log "Done."
echo "Output folder: ${OUTDIR}"
echo "Tarball: ${TARBALL}"
echo
echo "Next step: download the tarball to your PC, then upload to VPS-2 for reference."
