#!/usr/bin/env bash
# Server-side: restore DB + MinIO images from /opt/thyroai/migrate, then start the app.
set -e
cd /opt/thyroai/deploy
set -a; . ./.env; set +a
M=/opt/thyroai/migrate
DC="docker compose -f docker-compose.prod.yml"

echo "== 1. Restore database"
TABLES=$(docker exec thyroai-postgres psql -U "$POSTGRES_USER" -d thyroaidb -tAc "select count(*) from information_schema.tables where table_schema='public'")
if [ "$TABLES" = "0" ]; then
  gunzip -c $M/thyroaidb.sql.gz | docker exec -i thyroai-postgres psql -q -U "$POSTGRES_USER" -d thyroaidb -v ON_ERROR_STOP=1 > /dev/null
  echo "restored"
else
  echo "thyroaidb already has $TABLES tables, skipping restore"
fi

echo "== 2. Make image URLs relative (served by nginx -> MinIO)"
docker exec thyroai-postgres psql -U "$POSTGRES_USER" -d thyroaidb -tAc \
  "update image_series set full_url = regexp_replace(full_url, '^https?://[^/]+/medical-imaging/', '/medical-imaging/') where full_url ~ '^https?://[^/]+/medical-imaging/'; select count(*) from image_series where full_url like '/medical-imaging/%';"

echo "== 3. Import images into MinIO"
rm -rf $M/images && mkdir -p $M/images && tar -xzf $M/images.tar.gz -C $M/images
docker cp $M/images/medical-imaging thyroai-minio:/tmp/import
# Read-only access to individual objects; no bucket listing.
cat > $M/policy.json <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::medical-imaging/*"]}]}
EOF
docker cp $M/policy.json thyroai-minio:/tmp/policy.json
docker exec thyroai-minio sh -c "
  mc alias set local http://localhost:9000 \"$MINIO_ROOT_USER\" \"$MINIO_ROOT_PASSWORD\" >/dev/null &&
  mc mb -p local/medical-imaging >/dev/null &&
  mc mirror --quiet --overwrite /tmp/import local/medical-imaging >/dev/null &&
  mc anonymous set-json /tmp/policy.json local/medical-imaging >/dev/null &&
  rm -rf /tmp/import /tmp/policy.json &&
  mc du local/medical-imaging"

echo "== 4. Start backend + web"
$DC up -d
echo "done"
