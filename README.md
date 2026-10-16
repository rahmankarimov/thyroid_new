# ThyroAI

Thyroid ultrasound review platform. Doctors rate images with ACR TI-RADS, draw annotations and see the AI bounding-box suggestions. Admins can see doctor activity and create doctor accounts.

## Structure

```
doctor-panel/              React + Vite doctor panel (also includes the Admin Dashboard at /admin)
docker-compose.yml         Runs only the doctor panel (port 8081), against a backend on host port 8080
thyroai-platform/
  docker-compose.yml       Full stack: postgres, rabbitmq, minio, orthanc, clinical-backend, imaging-service, panels
  .env.example             Copy to .env and fill in the values
  services/clinical-backend  Spring Boot API (port 8080)
  services/imaging-service   DICOM ingest pipeline
  services/orthanc           Orthanc DICOM server
  frontends/                 admin-panel, super-admin-panel
  infra/postgres             DB init scripts
  tools/bulk_uploader        Node script for bulk-uploading the image dataset
```

## Running

Requirements: Docker Desktop.

```bash
# 1. Backend and infrastructure
cd thyroai-platform
cp .env.example .env        # then set the passwords and JWT_SECRET (openssl rand -base64 48)
docker compose up --build -d

# 2. Doctor panel (from the repo root)
cd ..
docker compose up --build -d patient-panel
```

- Doctor panel: http://localhost:8081 (the full-stack compose also serves it on `DOCTOR_PANEL_PORT`, 3000 by default)
- Backend API: http://localhost:8080/api/v1

Admin and super-admin users go straight to `/admin` after login.

## Dataset

The image datasets are **not** in this repository. Put them in the repo root:

```
benign/        benign ultrasound images
malignant/     malignant ultrasound images
bbox_labels/   YOLO-format bounding-box labels (one .txt per image)
```

Then upload them with `thyroai-platform/tools/bulk_uploader` (`npm install`, then `node upload.js`).
