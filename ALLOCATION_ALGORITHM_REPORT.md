# Asynchronous Stratified Multi-Clinician Allocation Test Report

## 1. Executive Summary & Configuration
According to the specification **"Asynchronous Stratified Allocation Algorithm for Multi-Clinician Thyroid Ultrasound Annotation"** (Implementation Specification, November 5, 2026), the platform's image queue was re-architected and upgraded to enforce all required mathematical and concurrency invariants:

- **Initial Common Pool ($I_0$):** Exactly 10 images (Placeholder #1 to #10, `is_common_pool = TRUE`). Every registered clinician must rate all 10 images before progressing to the main batches.
- **Main Stratified Batches ($I_M$):** 40 images (Placeholder #11 to #50) split into Batch 1 (#11–#30) and Batch 2 (#31–#50).
- **Reservation Duration:** Exactly 3 minutes ($t_{exp} = 3\text{ minutes}$).
- **Concurrency Control:** PostgreSQL row-level locks using `FOR UPDATE OF e_lock SKIP LOCKED`.
- **Target Invariant:** Exactly 3 independent primary annotations per main image ($|A(i)| = 3$), priority order $2 \succ 1 \succ 0$, and pair/triplet combination balancing ($P(c,x)$ and $T(c,x,y)$ minimization).
- **Dataset Placeholders:** 50 high-visibility numbered PNG placeholder images (`Image #1` to `Image #50`) generated, uploaded to MinIO bucket `medical-imaging/placeholders/`, and seeded into PostgreSQL.

---

## 2. Test Execution & Verified Invariants

### 1. Placeholder & MinIO Validation
- Generated 50 high-contrast images labeled `Image #1` through `Image #50`.
- Uploaded to MinIO bucket `medical-imaging/placeholders/`.
- Verified HTTP `200 OK` on direct URL access: `http://localhost:9000/medical-imaging/placeholders/image_1.png`.

### 2. Common Pool ($I_0$) Priority Enforcement
- Requesting `/api/v1/rating-queue/next` for a newly authenticated clinician always selects an uncompleted image from $I_0$ first (`is_common_pool = TRUE`).
- Main batches remain untouched until the clinician has completed all 10 calibration images.

### 3. Expiring Reservation ($t_{exp} = 3\text{ min}$)
- When a clinician requests a study, an active reservation record is created in `image_reservations` with `status = 'ACTIVE'` and `expires_at = now() + 3 minutes`.
- While active, it occupies an annotation slot ($a(i) + r(i) < 3$).
- If the clinician refreshes or re-enters before the 3 minutes elapse, the system idempotently serves the reserved image.
- If the timer elapses without a submission, `expireStaleReservations` marks the reservation `EXPIRED`, releasing the slot back to other clinicians.

### 4. Annotation Submission & Invariant Guard (Algorithm 2)
- Submitting `/api/v1/examinations/{id}/tirads`:
  - Validates that all 5 TI-RADS categories are selected.
  - Verifies that the clinician has not already annotated this image (duplicate guard).
  - Verifies that main dataset images do not exceed 3 completed annotations ($a(i) < 3$).
  - Transitions the active reservation status from `ACTIVE` to `COMPLETED`.
  - Automatically transitions examination status to `COMPLETED` once $|A(i)| = 3$.

---

## 3. How to Visually Inspect in the Browser

1. Navigate to **[http://localhost:8081/login](http://localhost:8081/login)**.
2. Sign in as:
   - **Email:** `doctor@thyroai.com`
   - **Password:** `Doctor1234`
3. You will immediately see the numbered placeholder canvas (e.g., **Image #1**, **Image #2**...) on white background.
4. Fill in the TI-RADS categories on the right panel and click **Təsdiqlə / Confirm**.
5. The system automatically marks your reservation complete and instantly serves the next image in accordance with the asynchronous allocation algorithm.
