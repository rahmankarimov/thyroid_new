#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

POSTGRES_USER="${POSTGRES_USER:-postgres}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minio}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minio12345}"

echo "== 1. Uploading 50 placeholder images to thyroai-test-minio (medical-imaging/placeholders/) =="
docker exec thyroai-test-minio mkdir -p /tmp/placeholders
docker cp "$ROOT_DIR/placeholder_images/." thyroai-test-minio:/tmp/placeholders/

cat > /tmp/test_minio_policy.json <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::medical-imaging/*"]}]}
EOF
docker cp /tmp/test_minio_policy.json thyroai-test-minio:/tmp/policy.json
rm -f /tmp/test_minio_policy.json

docker exec thyroai-test-minio sh -c "
  mc alias set local http://localhost:9000 \"$MINIO_ROOT_USER\" \"$MINIO_ROOT_PASSWORD\" >/dev/null &&
  mc mb -p local/medical-imaging >/dev/null &&
  mc cp --recursive /tmp/placeholders/ local/medical-imaging/placeholders/ >/dev/null &&
  mc anonymous set-json /tmp/policy.json local/medical-imaging >/dev/null &&
  rm -rf /tmp/placeholders /tmp/policy.json &&
  mc ls local/medical-imaging/placeholders/ | wc -l
"

echo "== 2. Waiting for thyroai-test-clinical-backend Flyway migrations to complete =="
for i in {1..40}; do
  if docker exec thyroai-test-postgres psql -U "$POSTGRES_USER" -d thyroaidb -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='image_reservations'" | grep -q 1; then
    echo "Flyway V20 schema is ready."
    break
  fi
  echo "Waiting for database migrations... ($i/40)"
  sleep 3
done

echo "== 3. Seeding 50 placeholder examinations and 5 test clinicians into thyroai-test-postgres =="
docker exec -i thyroai-test-postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d thyroaidb < "$ROOT_DIR/seed_placeholders.sql"

echo "== 4. Verifying MinIO image delivery through Nginx on port 8081 =="
curl -sI http://localhost:8081/medical-imaging/placeholders/image_1.png | head -n 5
echo "Test environment successfully deployed and seeded at http://157.173.121.121:8081"
