# Chrome Setup for PDF Generation

## Problem
Chrome headless shell requires system libraries to run. If you see errors like:
```
error while loading shared libraries: libatk-1.0.so.0: cannot open shared object file
```

## Solution

### Install Chrome Dependencies

Run the installation script with sudo:

```bash
cd /var/www/nazim/nazim-web/backend
sudo bash install-chrome-deps.sh
```

Or install manually:

```bash
sudo apt-get update
sudo apt-get install -y \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libxss1 \
    libxtst6 \
    libgconf-2-4 \
    libxkbcommon0 \
    libnss3 \
    libx11-6 \
    libxext6
```

### Verify Installation

Check if Chrome can find all libraries:

```bash
ldd /home/nazim/.cache/puppeteer/chrome-headless-shell/linux-143.0.7499.169/chrome-headless-shell-linux64/chrome-headless-shell | grep "not found"
```

If no output, all dependencies are satisfied.

### Environment Variable

The Chrome path is configured in `.env`:

```
PUPPETEER_CHROME_PATH=/home/nazim/.cache/puppeteer/chrome-headless-shell/linux-143.0.7499.169/chrome-headless-shell-linux64/chrome-headless-shell
```

### Troubleshooting

1. **Permission errors**: Ensure `/home/nazim` is accessible:
   ```bash
   sudo chmod o+x /home/nazim
   ```

2. **Library not found**: Install the specific missing library:
   ```bash
   sudo apt-get install -y <library-name>
   ```

3. **Chrome path not found**: Update `PUPPETEER_CHROME_PATH` in `.env` to the correct path.
