# ThyroAI — Setup & Usage Instructions

This guide walks you through cloning, configuring, running, and loading the dataset into the **ThyroAI** platform on a new machine.

---

## 1. Prerequisites

Before starting, make sure you have installed:
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (make sure Docker Desktop is open and running)
- **[Node.js (v18+)](https://nodejs.org/)** (required to run the dataset bulk-uploader script)
- **Git**

---

## 2. Clone the Repository

```bash
git clone https://github.com/rahmankarimov/thyroid_new.git
cd thyroid_new
```

---

## 3. Start the Backend & Infrastructure

The backend stack (`postgres`, `minio`, `rabbitmq`, `orthanc`, `clinical-backend`, `imaging-service`) lives inside `thyroai-platform/`.

```bash
cd thyroai-platform
cp .env.example .env
docker compose up --build -d
```

> **Windows PowerShell note:** If `cp .env.example .env` doesn't work in Command Prompt, use `copy .env.example .env`.

Wait **1–2 minutes** on the first run for Maven to build the Spring Boot backend and for all containers to become healthy. You can check the status with:

```bash
docker ps
```

Make sure `thyroai-postgres`, `thyroai-minio`, and `thyroai-clinical-backend` show `(healthy)`.

---

## 4. Start the Main Web Panel (Doctor Panel & Admin Dashboard)

From the root of the repository (`thyroid_new/`), build and start the web panel container:

```bash
cd ..
docker compose up --build -d patient-panel
```

The main web application will now be running at **[http://localhost:8081](http://localhost:8081)**.

---

## 5. Upload the Ultrasound Dataset & Bounding Boxes to MinIO

Because the 5,000 ultrasound images (~200 MB) are not stored in Git, copy the dataset folders into the root of the project (`thyroid_new/`) so the directory structure looks like this:

```text
thyroid_new/
├── benign/              # 1,426 benign ultrasound images (.jpg / .png)
├── malignant/           # 3,574 malignant ultrasound images (.jpg / .png)
├── bbox_labels/         # 5,000 YOLO-format bounding-box label files (.txt)
├── doctor-panel/
├── thyroai-platform/
└── docker-compose.yml
```

Then run the bulk uploader script:

```bash
cd thyroai-platform/tools/bulk_uploader
npm install
node upload.js
```

What `upload.js` does automatically:
1. Reads your database and MinIO credentials from `thyroai-platform/.env`.
2. Creates the `medical-imaging` bucket in MinIO (if it doesn't exist) and sets public-read policy so images load in the browser.
3. Uploads all images from `malignant/` and `benign/` to MinIO.
4. Inserts the corresponding patients, examinations, image series, pathology ground-truth labels, and shared YOLO bounding-box annotations (`bbox_labels/*.txt`) into PostgreSQL.

---

## 6. Access the Application & Log In

Open **[http://localhost:8081](http://localhost:8081)** in your browser.

### Default Admin Account

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@thyroai.com` | `Demo1234` |

### Workflow

1. **Admin Dashboard (`/admin`):**
   - Log in with `superadmin@thyroai.com` / `Demo1234`.
   - You will be automatically redirected to the **Admin Dashboard**.
   - View total images, rated/unrated counts, and total doctors.
   - Use the **Create Doctor Account** form on the right to create accounts for doctors.
   - Click on any doctor row in the **Doctor Leaderboard & Activity** table to inspect the exact images they rated, their TI-RADS levels, timestamps, and jump directly to the rated image.

2. **Doctor Rating View:**
   - Log in with a doctor account created from the Admin Dashboard.
   - Doctors are automatically taken to a random unrated ultrasound image from the queue.
   - Toggle **"Show AI Suggestion"** to display/hide the red dashed YOLO bounding box on the ultrasound canvas.
   - Draw custom annotations if needed, select the **ACR TI-RADS** features on the right panel, and click **Confirm** to save the rating and automatically load the next image.

---

## 7. Useful Commands

```bash
# Check running containers
docker ps

# View backend logs
docker logs -f thyroai-clinical-backend

# Rebuild frontend after code changes in doctor-panel/
docker compose up --build -d patient-panel

# Rebuild backend after Java code changes in thyroai-platform/
cd thyroai-platform
docker compose up --build -d clinical-backend
```
