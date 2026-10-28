# ThyroAI

Thyroid ultrasound review & crowdsourcing platform. Doctors rate ultrasound images with ACR TI-RADS, draw annotations, and toggle AI bounding-box suggestions. Admins can monitor doctor rating activity, inspect rated images, and create new doctor accounts.

---

## Prerequisites

- **Docker Desktop** (running)
- **Node.js 18+** (only needed if you are bulk-uploading the local image dataset)

---

## Step-by-Step Setup Guide

### 1. Clone the repository

```bash
git clone https://github.com/rahmankarimov/thyroid_new.git
cd thyroid_new
```

### 2. Configure & start the backend and infrastructure

```bash
cd thyroai-platform
cp .env.example .env
docker compose up --build -d
```

> Wait ~1–2 minutes on the first boot until `thyroai-postgres`, `thyroai-minio`, and `thyroai-clinical-backend` show `(healthy)` in `docker ps`.

### 3. Start the Doctor & Admin Web Panel (port 8081)

```bash
cd ..
docker compose up --build -d patient-panel
```

### 4. (Optional) Upload the Ultrasound Dataset & Bounding Boxes

Because medical image datasets are large, they are not tracked in Git. To load the 5,000 images and YOLO bounding boxes into MinIO and PostgreSQL:

1. Place the three dataset folders in the root of the repository (`thyroid_new/`):
   ```text
   thyroid_new/
   ├── benign/          # benign ultrasound images (.jpg / .png)
   ├── malignant/       # malignant ultrasound images (.jpg / .png)
   └── bbox_labels/     # YOLO-format bounding-box labels (.txt)
   ```
2. Run the bulk uploader script (it automatically reads credentials from `thyroai-platform/.env`):
   ```bash
   cd thyroai-platform/tools/bulk_uploader
   npm install
   node upload.js
   ```

---

## URLs & Default Credentials

| Service | URL |
| :--- | :--- |
| **Main Web App (Doctor Panel + Admin Dashboard)** | [http://localhost:8081](http://localhost:8081) |
| **Backend API / Swagger UI** | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) |
| **MinIO Console** | [http://localhost:9001](http://localhost:9001) |

### Default Login Accounts

| Role | Email | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@thyroai.com` | `Demo1234` | Automatically seeded on first boot; redirects to `/admin` |
| **Create Doctors** | *(via `/admin`)* | *(chosen by admin)* | Log in as `superadmin@thyroai.com` on `/admin` and use the **Create Doctor Account** form |
