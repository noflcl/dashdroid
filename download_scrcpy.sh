#!/usr/bin/sh

cd /tmp

# Fetch the latest release information and extract the download URL using Python
LATEST_URL=$(python3 -c "
import requests
import json
response = requests.get('https://api.github.com/repos/Genymobile/scrcpy/releases/latest')
response.raise_for_status()
data = response.json()
for asset in data['assets']:
    if 'linux-x86_64' in asset['name'] and asset['name'].endswith('.tar.gz'):
        print(asset['browser_download_url'])
        break
")

# Debugging: Print the extracted URL
echo "Extracted URL: $LATEST_URL"

if [ -z "$LATEST_URL" ]; then
    echo "Failed to get download URL"
    exit 1
fi

echo "Downloading from: $LATEST_URL"
curl -L -o scrcpy.tar.gz "$LATEST_URL"
tar xzf scrcpy.tar.gz
cd scrcpy-*

# Move binaries to /usr/local/bin
mv scrcpy /usr/bin/
mv scrcpy-server /usr/bin/

# Clean up
cd /tmp
rm -rf scrcpy*
