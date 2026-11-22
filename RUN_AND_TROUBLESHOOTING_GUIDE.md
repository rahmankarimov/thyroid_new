# ThyroAI — Comprehensive Run, Setup & Troubleshooting Guide

This document provides complete instructions for configuring, launching, verifying, and troubleshooting the **ThyroAI** platform on any machine. It also documents the specific issues that previously prevented the project from running or creating doctor accounts, along with the fixes applied.

---

## 1. System Architecture & Components

ThyroAI consists of two main Docker Compose definitions:
1. **`thyroai-platform/docker-compose.yml`**: Infrastructure and backend microservices.
2. **`docker-compose.yml` (Root)**: The unified Doctor & Admin Web Panel (`patient-panel`) running on port **8081**.

### Service Port Map

| Service Name | Container Name | Port(s) | Description |
| :--- | :--- | :--- | :--- |
| **Main Web Panel** | `new-patient-panel` | `8081` | Doctor review interface & Admin dashboard |
| **Clinical Backend** | `thyroai-clinical-backend` | `8080` | Spring Boot REST API & Business Logic |
| **PostgreSQL 16** | `thyroai-postgres` | `5432` | Relational database (`thyroaidb` & `medical_imaging`) |
| **MinIO Object Store**| `thyroai-minio` | `9000` (API), `9001` (Console) | S3-compatible medical image archive |
| **RabbitMQ** | `thyroai-rabbitmq` | `5672` (AMQP), `15672` (Management) | Event & message broker for DICOM processing |
| **Orthanc DICOM** | `thyroai-orthanc` | `18042` (REST), `14242` (DICOM) | DICOM PACS server |
| **Imaging Service** | `thyroai-imaging-service` | `8081` (internal) | DICOM ingestion & image pipeline |

---

## 2. Step-by-Step Setup & Run Instructions

### Prerequisites
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** installed, running, and updated.
- **Git**

---

### Step 1: Environment File Configuration
The infrastructure stack requires a `.env` file inside `thyroai-platform/`.

**Windows (PowerShell):**
```powershell
Copy-Item thyroai-platform\.env.example thyroai-platform\.env
```

**macOS / Linux (Bash):**
```bash
cp thyroai-platform/.env.example thyroai-platform/.env
```

---

### Step 2: Build & Start the Backend Infrastructure
From the project root:

**Windows (PowerShell) / macOS / Linux:**
```bash
docker compose -f thyroai-platform/docker-compose.yml up --build -d
```

> **First Boot Duration:** Takes ~2–3 minutes on initial startup. Docker downloads base images (PostgreSQL, RabbitMQ, MinIO, OpenJDK), runs Maven to compile the Spring Boot application, and runs Flyway database migrations (V1 to V19).

Verify all core containers are healthy:
```bash
docker ps
```
Ensure `thyroai-postgres`, `thyroai-minio`, and `thyroai-clinical-backend` report `(healthy)`.

---

### Step 3: Start the Main Web Panel (Port 8081)
From the project root directory:

```bash
docker compose up --build -d patient-panel
```

This compiles the React/Vite application into static assets and launches an Nginx reverse-proxy on port **8081**.

---

### Step 4: Seed Initial Data (Mock Exams & Patients)
On first startup, the database contains 0 patients. To immediately enable the doctor review queue:

**Windows (PowerShell):**
```powershell
Get-Content thyroai-platform\mock_data.sql -Raw | docker exec -i thyroai-postgres psql -U postgres -d thyroaidb
docker exec thyroai-postgres psql -U postgres -d thyroaidb -c "UPDATE users SET hospital_id = (SELECT id FROM hospitals LIMIT 1) WHERE hospital_id IS NULL;"
```

**macOS / Linux (Bash):**
```bash
docker exec -i thyroai-postgres psql -U postgres -d thyroaidb < thyroai-platform/mock_data.sql
docker exec thyroai-postgres psql -U postgres -d thyroaidb -c "UPDATE users SET hospital_id = (SELECT id FROM hospitals LIMIT 1) WHERE hospital_id IS NULL;"
```

---

## 3. URLs & Default Credentials

| Portal / Service | URL | Credentials |
| :--- | :--- | :--- |
| **Main Web Application** | [http://localhost:8081](http://localhost:8081) | *See logins below* |
| **Backend REST API / Swagger** | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) | Direct API documentation |
| **MinIO Console** | [http://localhost:9001](http://localhost:9001) | User: `minio` / Pass: `change_me_minio` |
| **RabbitMQ Dashboard** | [http://localhost:15672](http://localhost:15672) | User: `orthanc` / Pass: `change_me_rabbit` |

### Default Login Accounts

| Role | Email | Password | Destination |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@thyroai.com` | `Demo1234` | Automatically opens `/admin` dashboard |
| **Doctor (Sample)** | `doctor@thyroai.com` | `Doctor1234` | Opens doctor review queue (`/patients/...`) |
| **Doctor (Mock)** | `doctor@cmc.com` | `Demo1234` | Opens doctor review queue (`/patients/...`) |

---

## 4. Key Troubleshooting: Why the Project Previously Failed to Run

If an instructor or developer encountered errors trying to run this repository, here is why:

### Issue 1: Two Separate Docker Compose Configurations
- **Symptom:** Running `docker compose up` only in the root directory only starts the Nginx web panel (`patient-panel`) on port 8081. The backend is completely missing, causing all API requests to fail.
- **Symptom:** Running `docker compose up` only inside `thyroai-platform` starts the backend, but the main web app specified in the project documentation lives in the root directory (`docker-compose.yml`).
- **Solution:** Both `thyroai-platform/docker-compose.yml` and the root `docker-compose.yml` must be launched.

### Issue 2: Missing `.env` File
- **Symptom:** Docker Compose throws configuration or syntax errors when parsing environment variables like `${POSTGRES_USER}` or `${MINIO_ROOT_USER}`.
- **Solution:** Always copy `thyroai-platform/.env.example` to `thyroai-platform/.env` prior to starting.

### Issue 3: Super Admin Could Not Create Doctor Accounts (Spring Security Bug)
- **Symptom:** When logging in as `superadmin@thyroai.com` and submitting the "Create Doctor Account" form, the web page immediately logged the user out and redirected to `/login`. Trying to log in with the new doctor credentials failed with `"Invalid email or password"`.
- **Root Cause:**
  - `superadmin@thyroai.com` had the role `SUPER_ADMIN`.
  - In `SecurityConfig.java`, user management endpoints (`/api/v1/users/**`) were strictly protected with `.hasRole("ADMIN")`.
  - In `UserService.java`, the `SUPER_ADMIN` role was not granted the `ROLE_ADMIN` authority.
  - When the Super Admin posted to `/api/v1/users`, Spring Security threw a `401 Unauthorized`.
  - The frontend's `api.ts` received 401, cleared the session from `localStorage`, and redirected to `/login` without saving the user.
- **Fix Applied:**
  1. Updated `UserService.java` so that `SUPER_ADMIN` users receive both `ROLE_SUPER_ADMIN` and `ROLE_ADMIN` authorities.
  2. Updated `SecurityConfig.java` to explicitly permit `.hasAnyRole("ADMIN", "SUPER_ADMIN")` across administrative endpoints.
  3. Updated `UserManagementService.java` to fallback to default hospital assignments when created by a Super Admin.

### Issue 4: Empty Rating Queue on First Boot
- **Symptom:** When a doctor logs in, the screen displays `"Yüklənir..."` (Loading) and gets stuck because `/api/v1/rating-queue/next` returns 404 (`"No more images to rate in the queue!"`).
- **Root Cause:** Raw medical images and bounding boxes are not committed to Git due to size (~200 MB).
- **Solution:** Run `mock_data.sql` (as shown in Step 4) to populate sample patients, examinations, and AI scores, OR run the bulk uploader (`thyroai-platform/tools/bulk_uploader/upload.js`).

---

## 5. Helpful Commands for Daily Operations

### Check Health of All Containers
```bash
docker ps
```

### Check Backend Logs in Real Time
```bash
docker logs -f thyroai-clinical-backend
```

### Rebuild Frontend After Modifying React Code
```bash
docker compose up --build -d patient-panel
```

### Rebuild Backend After Modifying Java Code
```bash
docker compose -f thyroai-platform/docker-compose.yml up --build -d clinical-backend
```

### Stop All Containers
```bash
docker compose down
docker compose -f thyroai-platform/docker-compose.yml down
```
