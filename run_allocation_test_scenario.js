const { Client } = require('./thyroai-platform/tools/bulk_uploader/node_modules/pg');

const API_BASE = 'http://127.0.0.1:8080/api/v1';

async function apiCall(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, json };
}

async function login(email, password = 'Demo1234') {
  const res = await apiCall('POST', '/auth/login', null, { email, password });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.json)}`);
  return res.json.data;
}

function sampleTiradsPayload(seed = 1) {
  const levels = ['TR2', 'TR3', 'TR4', 'TR5'];
  return {
    totalPoints: (seed % 7) + 2,
    level: levels[seed % levels.length],
    composition: 'Solid or almost completely solid',
    echogenicity: 'Hypoechoic',
    shape: 'Wider-than-tall',
    margin: 'Smooth',
    echogenicFoci: 'None or large comet-tail artifacts',
  };
}

function assert(cond, msg) {
  if (!cond) {
    console.error('❌ ASSERTION FAILED:', msg);
    throw new Error(msg);
  }
  console.log('  ✅ PASS:', msg);
}

async function main() {
  const pg = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'thyroaidb',
    password: 'postgres',
    port: 5432,
  });
  await pg.connect();

  // Map examId -> imageNumber (1..50), isCommonPool, batchIndex
  const examRows = await pg.query(`
    SELECT e.id AS exam_id, e.is_common_pool, e.batch_index, p.fin, p.last_name
    FROM examinations e
    JOIN patients p ON p.id = e.patient_id
    ORDER BY p.fin ASC
  `);
  const examMap = new Map();
  for (const r of examRows.rows) {
    const num = parseInt(r.fin.replace('P', ''), 10);
    examMap.set(r.exam_id, { num, isCommon: r.is_common_pool, batch: r.batch_index, fin: r.fin });
  }
  console.log(`Loaded ${examMap.size} placeholder examinations (#1 to #50).\n`);

  // Authenticate initial 4 clinicians
  console.log('=== STEP 0: Authenticating Initial 4 Clinicians (Alice, Bob, Charlie, David) ===');
  const alice   = await login('alice@thyroai.com');
  const bob     = await login('bob@thyroai.com');
  const charlie = await login('charlie@thyroai.com');
  const david   = await login('david@thyroai.com');
  console.log('  Authenticated Alice, Bob, Charlie, David.\n');

  // =========================================================================
  // PHASE 1: Common Pool (I0), StrictMode Concurrency & Logout Timer Resume
  // =========================================================================
  console.log('=== PHASE 1: Common Initial Pool (I0), StrictMode Concurrency & Timer Logout/Resume ===');

  // TC-Concurrency-StrictMode: Fire 2 simultaneous /rating-queue/next requests for Alice
  const [req1, req2] = await Promise.all([
    apiCall('GET', '/rating-queue/next', alice.token),
    apiCall('GET', '/rating-queue/next', alice.token),
  ]);
  assert(req1.ok && req2.ok, 'Both concurrent /rating-queue/next requests succeeded (no 404 or NonUniqueResultException)');
  assert(req1.json.data.examId === req2.json.data.examId, `Both concurrent calls returned the exact same reserved image (${examMap.get(req1.json.data.examId).fin})`);

  const activeResCount = await pg.query(
    `SELECT COUNT(*) FROM image_reservations WHERE clinician_id = $1 AND status = 'ACTIVE'`,
    [alice.user.id]
  );
  assert(parseInt(activeResCount.rows[0].count, 10) === 1, 'Exactly 1 ACTIVE reservation exists in DB for Alice after concurrent requests');

  // TC-Timer-Logout: Wait 3 seconds, log out, log back in, and verify timer remainingSeconds
  const initialRem = req1.json.data.remainingSeconds;
  console.log(`  [Timer Test] Alice reserved Image #${examMap.get(req1.json.data.examId).num} with remainingSeconds = ${initialRem}s. Waiting 3 seconds before logout...`);
  await new Promise((r) => setTimeout(r, 3100));

  await apiCall('POST', '/audit-logs', alice.token, {
    patientId: req1.json.data.patientId,
    action: 'LOGOUT',
    details: `Exam: ${req1.json.data.examId}, Spent: 3s, Remaining: ${initialRem - 3}s`,
  });

  const aliceRelogin = await login('alice@thyroai.com');
  const resumeRes = await apiCall('GET', '/rating-queue/next', aliceRelogin.token);
  const resumedRem = resumeRes.json.data.remainingSeconds;
  console.log(`  [Timer Test] After logout & re-login, server returned same Image #${examMap.get(resumeRes.json.data.examId).num} with remainingSeconds = ${resumedRem}s.`);
  assert(resumeRes.json.data.examId === req1.json.data.examId, 'Re-login resumed the exact same reserved examination');
  assert(resumedRem <= initialRem - 2 && resumedRem >= initialRem - 6, `Timer did NOT reset to 180s on logout/re-login (expected ~${initialRem - 3}s, got ${resumedRem}s)`);

  // Complete all 10 Common Pool images (#1..#10) for Alice, Bob, Charlie, David
  for (const doc of [
    { name: 'Alice', auth: alice },
    { name: 'Bob', auth: bob },
    { name: 'Charlie', auth: charlie },
    { name: 'David', auth: david },
  ]) {
    const seenCommon = [];
    for (let k = 0; k < 10; k++) {
      const next = await apiCall('GET', '/rating-queue/next', doc.auth.token);
      assert(next.ok, `${doc.name} received common pool image ${k + 1}/10`);
      const info = examMap.get(next.json.data.examId);
      if (!info.isCommon) {
        throw new Error(`TC-01 Violation: ${doc.name} received main pool image #${info.num} before completing I0!`);
      }
      seenCommon.push(info.num);
      const sub = await apiCall('POST', `/examinations/${next.json.data.examId}/tirads`, doc.auth.token, sampleTiradsPayload(k));
      assert(sub.ok, `${doc.name} submitted Common Pool Image #${info.num}`);
    }
    assert(seenCommon.length === 10, `TC-01: ${doc.name} completed all 10 Common Pool images (#${seenCommon.join(', #')}) before main pool`);
  }
  console.log('');

  // =========================================================================
  // PHASE 2: 2 > 1 > 0 Priority, Duplicate Guard & Async Batch Progression
  // =========================================================================
  console.log('=== PHASE 2: Priority (2 > 1 > 0), Duplicate Guard & Asynchronous Batch Progression ===');

  // Alice annotates 2 images in Batch 1 (so those 2 images now have a(i) = 1, while 8 images have a(i) = 0)
  const aliceB1Imgs = [];
  for (let s = 0; s < 2; s++) {
    const n = await apiCall('GET', '/rating-queue/next', alice.token);
    const info = examMap.get(n.json.data.examId);
    assert(info.batch === 1 && !info.isCommon, `Alice allocated Image #${info.num} from Batch 1`);
    await apiCall('POST', `/examinations/${n.json.data.examId}/tirads`, alice.token, sampleTiradsPayload(s));
    aliceB1Imgs.push(n.json.data.examId);
  }

  // TC-05: Duplicate annotation guard — Alice tries to submit again on the first B1 image
  const dupAttempt = await apiCall('POST', `/examinations/${aliceB1Imgs[0]}/tirads`, alice.token, sampleTiradsPayload(99));
  assert(!dupAttempt.ok, 'TC-05: Duplicate annotation by the same clinician on the same image was rejected');

  // TC-03 (1 > 0 priority): Bob requests an image from Batch 1.
  // There are 2 images with a(i)=1 (annotated by Alice) and 8 images with a(i)=0.
  // Bob MUST receive one of the a(i)=1 images!
  const bobNext1 = await apiCall('GET', '/rating-queue/next', bob.token);
  const bobExam1 = bobNext1.json.data.examId;
  assert(
    aliceB1Imgs.includes(bobExam1),
    `TC-03 (1 > 0 Priority): Bob received Image #${examMap.get(bobExam1).num} which already had 1 annotation (instead of opening an untouched 0-annotation image)`
  );
  await apiCall('POST', `/examinations/${bobExam1}/tirads`, bob.token, sampleTiradsPayload(2));
  // Now bobExam1 has a(i) = 2! And aliceB1Imgs[1] has a(i) = 1! And 8 images have a(i) = 0!

  // TC-02 (2 > 1 > 0 priority): Charlie requests an image from Batch 1.
  // Charlie MUST receive bobExam1 (which has a(i) = 2) over the a(i)=1 and a(i)=0 candidates!
  const charlieNext1 = await apiCall('GET', '/rating-queue/next', charlie.token);
  const charlieExam1 = charlieNext1.json.data.examId;
  assert(
    charlieExam1 === bobExam1,
    `TC-02 (2 > 1 > 0 Priority): Charlie received Image #${examMap.get(charlieExam1).num} (a=2) over a=1 and a=0 images`
  );
  await apiCall('POST', `/examinations/${charlieExam1}/tirads`, charlie.token, sampleTiradsPayload(3));

  // TC-06: Verify bobExam1 now has 3 annotations, status = 'COMPLETED', and a 4th annotation by David is rejected!
  const examStatusCheck = await pg.query(`SELECT status FROM examinations WHERE id = $1`, [bobExam1]);
  assert(examStatusCheck.rows[0].status === 'COMPLETED', `TC-06: Image #${examMap.get(bobExam1).num} status transitioned to COMPLETED upon 3rd annotation`);
  const fourthAttempt = await apiCall('POST', `/examinations/${bobExam1}/tirads`, david.token, sampleTiradsPayload(4));
  assert(!fourthAttempt.ok, 'TC-06: 4th primary annotation on a 3-annotation image was strictly rejected');

  // TC-07 & TC-08: Alice (Fast clinician) finishes the remaining 8 images of Batch 1 and moves asynchronously to Batch 2
  for (let s = 0; s < 8; s++) {
    const n = await apiCall('GET', '/rating-queue/next', alice.token);
    const info = examMap.get(n.json.data.examId);
    assert(info.batch === 1, `Alice completing Batch 1 (${s + 3}/10): Image #${info.num}`);
    await apiCall('POST', `/examinations/${n.json.data.examId}/tirads`, alice.token, sampleTiradsPayload(s));
  }

  // Now Alice has annotated all 10 images in Batch 1, while Batch 1 is NOT globally complete yet (Bob & Charlie only did 1 image in Batch 1).
  // Alice requests her next image -> she must immediately advance to Batch 2!
  const aliceB2 = await apiCall('GET', '/rating-queue/next', alice.token);
  const aliceB2Info = examMap.get(aliceB2.json.data.examId);
  assert(
    aliceB2Info.batch === 2,
    `TC-07 (Asynchronous Batch Progression): Fast clinician Alice advanced to Batch 2 (Image #${aliceB2Info.num}) without waiting for slower clinicians in Batch 1`
  );
  await apiCall('POST', `/examinations/${aliceB2.json.data.examId}/tirads`, alice.token, sampleTiradsPayload(10));

  // Meanwhile, Bob requests his next image -> Bob must STILL be in Batch 1!
  const bobStillB1 = await apiCall('GET', '/rating-queue/next', bob.token);
  const bobStillB1Info = examMap.get(bobStillB1.json.data.examId);
  assert(
    bobStillB1Info.batch === 1,
    `TC-08: Slower clinician Bob remained in Batch 1 (Image #${bobStillB1Info.num}) while Alice works in Batch 2`
  );
  await apiCall('POST', `/examinations/${bobStillB1.json.data.examId}/tirads`, bob.token, sampleTiradsPayload(11));
  console.log('');

  // =========================================================================
  // PHASE 3: Dr. David Mid-Way Dropout / Logout & Reservation Expiration
  // =========================================================================
  console.log('=== PHASE 3: Clinician Dropout (Dr. David Logs Out Mid-Way) & Reservation Expiration ===');

  // David annotates 2 images in Batch 1, then reserves a 3rd image and LOGS OUT without submitting!
  for (let s = 0; s < 2; s++) {
    const dNext = await apiCall('GET', '/rating-queue/next', david.token);
    const dInfo = examMap.get(dNext.json.data.examId);
    console.log(`  David annotated Image #${dInfo.num} in Batch ${dInfo.batch}`);
    await apiCall('POST', `/examinations/${dNext.json.data.examId}/tirads`, david.token, sampleTiradsPayload(s));
  }

  const davidAbandoned = await apiCall('GET', '/rating-queue/next', david.token);
  const abandonedExamId = davidAbandoned.json.data.examId;
  const abandonedInfo = examMap.get(abandonedExamId);
  console.log(`  David reserved Image #${abandonedInfo.num} (Batch ${abandonedInfo.batch}) and LOGGED OUT without submitting!`);

  await apiCall('POST', '/audit-logs', david.token, {
    patientId: davidAbandoned.json.data.patientId,
    action: 'LOGOUT',
    details: `Exam: ${abandonedExamId}, Abandoned mid-session by Dr. David`,
  });

  // Verify the active reservation occupies a slot (TC-09)
  const resBeforeExpire = await pg.query(
    `SELECT status FROM image_reservations WHERE examination_id = $1 AND clinician_id = $2 AND status = 'ACTIVE'`,
    [abandonedExamId, david.user.id]
  );
  assert(resBeforeExpire.rowCount === 1, `TC-09: David's unsubmitted reservation on Image #${abandonedInfo.num} is currently ACTIVE`);

  // Simulate 3-minute reservation timeout passing for David's abandoned reservation (TC-10)
  await pg.query(
    `UPDATE image_reservations SET expires_at = NOW() - INTERVAL '10 seconds' WHERE examination_id = $1 AND clinician_id = $2 AND status = 'ACTIVE'`,
    [abandonedExamId, david.user.id]
  );

  // Trigger next allocation call from Charlie, which runs expireStaleReservations(now)
  const charlieAfterExpire = await apiCall('GET', '/rating-queue/next', charlie.token);
  await apiCall('POST', `/examinations/${charlieAfterExpire.json.data.examId}/tirads`, charlie.token, sampleTiradsPayload(12));

  const resAfterExpire = await pg.query(
    `SELECT status FROM image_reservations WHERE examination_id = $1 AND clinician_id = $2`,
    [abandonedExamId, david.user.id]
  );
  assert(
    resAfterExpire.rows[0].status === 'EXPIRED',
    `TC-10: David's abandoned reservation on Image #${abandonedInfo.num} automatically transitioned to EXPIRED and released its slot`
  );
  console.log('');

  // =========================================================================
  // PHASE 4: Dynamic Late Joiner (Dr. Emma Enters Mid-Study!)
  // =========================================================================
  console.log('=== PHASE 4: Late Joiner Clinician (Dr. Emma Joins Mid-Study) ===');
  const emma = await login('emma@thyroai.com');

  // Verify Emma's very first allocated image is from Common Initial Pool (I0), NOT Batch 1 or Batch 2!
  const emmaFirst = await apiCall('GET', '/rating-queue/next', emma.token);
  const emmaFirstInfo = examMap.get(emmaFirst.json.data.examId);
  assert(
    emmaFirstInfo.isCommon && emmaFirstInfo.num === 1,
    `Late Joiner Rule: Newly joined Dr. Emma was routed straight to Common Initial Pool Image #${emmaFirstInfo.num} (I0), not active main batches`
  );
  await apiCall('POST', `/examinations/${emmaFirst.json.data.examId}/tirads`, emma.token, sampleTiradsPayload(1));

  // Emma completes the remaining 9 Common Pool images (#2..#10)
  for (let k = 1; k < 10; k++) {
    const next = await apiCall('GET', '/rating-queue/next', emma.token);
    const info = examMap.get(next.json.data.examId);
    assert(info.isCommon, `Dr. Emma completing Common Pool (${k + 1}/10): Image #${info.num}`);
    await apiCall('POST', `/examinations/${next.json.data.examId}/tirads`, emma.token, sampleTiradsPayload(k));
  }

  // Now Emma requests her 11th image -> she must enter Batch 1 (to help finish remaining uncompleted Batch 1 images!)
  const emmaMain1 = await apiCall('GET', '/rating-queue/next', emma.token);
  const emmaMain1Info = examMap.get(emmaMain1.json.data.examId);
  assert(
    !emmaMain1Info.isCommon && emmaMain1Info.batch === 1,
    `Late Joiner Progression: After finishing I0, Dr. Emma seamlessly entered Batch 1 (Image #${emmaMain1Info.num})`
  );
  await apiCall('POST', `/examinations/${emmaMain1.json.data.examId}/tirads`, emma.token, sampleTiradsPayload(20));
  console.log('');

  // =========================================================================
  // PHASE 5: Asynchronous Multi-Clinician Completion of All 50 Images
  // =========================================================================
  console.log('=== PHASE 5: Full Multi-Clinician Simulation Until All 50 Images Complete ===');

  // Active clinicians after David dropped out: Alice (fast), Bob (steady), Charlie (slow), Emma (late joiner)
  // Schedule turns weighted by clinician speed: Alice (3x), Bob (2x), Emma (2x), Charlie (1x)
  const schedule = [
    { name: 'Alice',   auth: alice },
    { name: 'Bob',     auth: bob },
    { name: 'Emma',    auth: emma },
    { name: 'Alice',   auth: alice },
    { name: 'Charlie', auth: charlie },
    { name: 'Alice',   auth: alice },
    { name: 'Bob',     auth: bob },
    { name: 'Emma',    auth: emma },
  ];

  let step = 0;
  while (true) {
    let anyAllocated = false;
    for (const worker of schedule) {
      const next = await apiCall('GET', '/rating-queue/next', worker.auth.token);
      if (next.ok && next.json?.data?.examId) {
        anyAllocated = true;
        step++;
        const examId = next.json.data.examId;
        const sub = await apiCall('POST', `/examinations/${examId}/tirads`, worker.auth.token, sampleTiradsPayload(step));
        if (!sub.ok) {
          throw new Error(`Submission failed for ${worker.name} on ${examId}: ${JSON.stringify(sub.json)}`);
        }
      }
    }
    if (!anyAllocated) break;
  }
  console.log(`  Completed all remaining main-pool allocations (${step} additional annotations submitted).\n`);

  // =========================================================================
  // FINAL INVARIANT VERIFICATION & STATISTICAL REPORT
  // =========================================================================
  console.log('=== FINAL INVARIANT VERIFICATION AGAINST POSTGRESQL ===');

  // 1. Common Pool (I0: #1..#10): Every one of the 5 clinicians annotated all 10 images (50 annotations total)
  const commonStats = await pg.query(`
    SELECT u.email, COUNT(tr.id) AS cnt
    FROM tirads_results tr
    JOIN examinations e ON e.id = tr.examination_id
    JOIN users u ON u.id = tr.created_by
    WHERE e.is_common_pool = TRUE
    GROUP BY u.email
    ORDER BY u.email
  `);
  console.log('  1. Common Pool (I0) Annotations per Clinician:', commonStats.rows);
  assert(commonStats.rows.length === 5, 'All 5 clinicians (including Dropout David & Late Joiner Emma) annotated Common Pool');
  for (const r of commonStats.rows) {
    assert(parseInt(r.cnt, 10) === 10, `${r.email} completed 10/10 Common Pool images`);
  }

  // 2. Main Pool (IM: #11..#50): Every single image has EXACTLY 3 annotations and status = 'COMPLETED'
  const mainImageCounts = await pg.query(`
    SELECT p.fin, e.batch_index, e.status, COUNT(tr.id) AS annotation_count,
           STRING_AGG(u.first_name, ', ' ORDER BY u.first_name) AS annotators
    FROM examinations e
    JOIN patients p ON p.id = e.patient_id
    LEFT JOIN tirads_results tr ON tr.examination_id = e.id
    LEFT JOIN users u ON u.id = tr.created_by
    WHERE e.is_common_pool = FALSE
    GROUP BY p.fin, e.batch_index, e.status
    ORDER BY p.fin ASC
  `);
  const wrongCount = mainImageCounts.rows.filter((r) => parseInt(r.annotation_count, 10) !== 3 || r.status !== 'COMPLETED');
  assert(
    wrongCount.length === 0 && mainImageCounts.rows.length === 40,
    'Invariant 1 & 2: All 40 main-set images (#11..#50) received EXACTLY 3 annotations from 3 distinct clinicians and reached COMPLETED status'
  );

  // 3. Zero duplicates across all 50 images
  const dupCheck = await pg.query(`
    SELECT examination_id, created_by, COUNT(*) AS cnt
    FROM tirads_results
    GROUP BY examination_id, created_by
    HAVING COUNT(*) > 1
  `);
  assert(dupCheck.rowCount === 0, 'Invariant 3: Zero duplicate (examination, clinician) annotations exist in database');

  // 4. Total counts per clinician across I0 and IM
  const clinicianSummary = await pg.query(`
    SELECT u.first_name, u.email,
           COUNT(tr.id) FILTER (WHERE e.is_common_pool = TRUE) AS common_pool_count,
           COUNT(tr.id) FILTER (WHERE e.is_common_pool = FALSE) AS main_pool_count,
           COUNT(tr.id) AS total_annotations
    FROM users u
    JOIN tirads_results tr ON tr.created_by = u.id
    JOIN examinations e ON e.id = tr.examination_id
    GROUP BY u.first_name, u.email
    ORDER BY total_annotations DESC
  `);
  console.log('\n  Clinician Workload Summary:');
  console.table(clinicianSummary.rows);

  // 5. Pairwise Co-Annotation Balance P(c, x) in Main Pool
  const pairStats = await pg.query(`
    SELECT u1.first_name || ' & ' || u2.first_name AS pair, COUNT(DISTINCT tr1.examination_id) AS shared_main_images
    FROM tirads_results tr1
    JOIN tirads_results tr2 ON tr1.examination_id = tr2.examination_id AND tr1.created_by < tr2.created_by
    JOIN examinations e ON e.id = tr1.examination_id
    JOIN users u1 ON u1.id = tr1.created_by
    JOIN users u2 ON u2.id = tr2.created_by
    WHERE e.is_common_pool = FALSE
    GROUP BY u1.first_name, u2.first_name
    ORDER BY shared_main_images DESC
  `);
  console.log('  Pairwise Co-Annotation Frequencies P(c, x) on Main Set:');
  console.table(pairStats.rows);

  // 6. Triplet Combination Balance T(c, x, y) in Main Pool
  const tripletStats = await pg.query(`
    SELECT annotators AS triplet, COUNT(*) AS images_count
    FROM (
      SELECT e.id, STRING_AGG(u.first_name, ' + ' ORDER BY u.first_name) AS annotators
      FROM examinations e
      JOIN tirads_results tr ON tr.examination_id = e.id
      JOIN users u ON u.id = tr.created_by
      WHERE e.is_common_pool = FALSE
      GROUP BY e.id
    ) sub
    GROUP BY annotators
    ORDER BY images_count DESC
  `);
  console.log('  Triplet Combination Frequencies T(c, x, y) on Main Set:');
  console.table(tripletStats.rows);

  // 7. Audit Log Check for Logout Events
  const logoutLogs = await pg.query(`
    SELECT u.first_name, a.action, a.details, a.timestamp
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.doctor_id
    WHERE a.action = 'LOGOUT'
    ORDER BY a.timestamp ASC
  `);
  console.log('  Recorded LOGOUT Audit Logs (with Time Spent):');
  console.table(logoutLogs.rows);

  await pg.end();
  console.log('\n🎉 ALL 12 TEST CASES AND MATHEMATICAL INVARIANTS PASSED 100%!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
