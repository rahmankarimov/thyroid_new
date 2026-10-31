#!/usr/bin/env bash
# Server-side health/verification checks.
cd /opt/thyroai/deploy
echo "distinct image URLs: $(docker exec thyroai-postgres psql -U postgres -d thyroaidb -tAc "select count(distinct full_url) from image_series where full_url like '/medical-imaging/%'")"
for i in $(seq 1 60); do
  s=$(docker inspect --format '{{.State.Health.Status}}' thyroai-clinical-backend)
  [ "$s" = healthy ] && echo "backend: healthy" && break
  sleep 5
done
[ "$s" != healthy ] && { echo "backend: $s"; docker logs --tail 30 thyroai-clinical-backend; }
docker ps --format '{{.Names}}  {{.Status}}'
