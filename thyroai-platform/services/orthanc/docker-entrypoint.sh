#!/bin/bash
set -euo pipefail

# Render Orthanc config from template using environment variables.
envsubst < /tmp/orthanc.json.template > /etc/orthanc/orthanc.json

echo "Orthanc config rendered; starting Orthanc..."

# orthancteam/osimis entrypoint expects a single path to the config directory
# (or file). Pass the directory that contains the rendered orthanc.json.
if [ -x /docker-entrypoint.sh ]; then
  exec /docker-entrypoint.sh /etc/orthanc
fi

# Fallback: run Orthanc directly against the generated config.
exec Orthanc /etc/orthanc/orthanc.json
