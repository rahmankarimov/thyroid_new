"""Send a test ultrasound study to Orthanc over DICOM C-STORE.

Takes the sample .dcm files, rewrites the identity tags so the study looks like it
came off a real machine for a specific patient, and sends it. Every run gets fresh
UIDs, so the same source files can be sent repeatedly without Orthanc deduplicating.

Usage
-----
  # Study that ThyroAI will auto-match to the patient with this FIN
  py tools/send_test_study.py --src ./images --fin 4KJ8N2P --name "ALIYEV^SAMIR"

  # Study that will land UNMATCHED in the admin DICOM inbox
  py tools/send_test_study.py --src ./images --unmatched

Requires: pip install pynetdicom pydicom
"""
import argparse
import datetime
import os
import sys
import tempfile

import pydicom
from pydicom.uid import generate_uid
from pynetdicom import AE
from pynetdicom.sop_class import CTImageStorage, UltrasoundImageStorage, SecondaryCaptureImageStorage

SERIES_LABELS = ["Transverse", "Longitudinal", "Doppler"]


def parse_args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--src", default="./images", help="Directory holding the source .dcm files")
    p.add_argument("--fin", default="4KJ8N2P", help="FIN to put in PatientID (must exist in the hospital)")
    p.add_argument("--name", default="ALIYEV^SAMIR", help="PatientName in DICOM form: FAMILY^GIVEN")
    p.add_argument("--birth", default="19850311", help="PatientBirthDate, yyyyMMdd")
    p.add_argument("--sex", default="M", choices=["M", "F", "O"])
    p.add_argument("--unmatched", action="store_true",
                   help="Send a deliberately unidentifiable PatientID so the study lands in the inbox")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=14242,
                   help="Host DICOM port (ORTHANC_DICOM_PORT in .env; maps to container 4242)")
    p.add_argument("--calling-ae", default="US_SIM", help="Must be registered as a hospital modality in ThyroAI")
    p.add_argument("--called-ae", default="ORTHANC", help="Must match DicomAet in orthanc.json")
    return p.parse_args()


def main():
    args = parse_args()

    if not os.path.isdir(args.src):
        sys.exit(f"Source directory not found: {args.src}")

    sources = sorted(f for f in os.listdir(args.src) if f.endswith(".dcm"))
    if not sources:
        sys.exit(f"No .dcm files in {args.src}")

    patient_id = "NOTAFIN-99" if args.unmatched else args.fin
    patient_name = "HUSEYNOV^KAMRAN" if args.unmatched else args.name

    # One study UID shared by every image => one ThyroAI examination holding them all.
    study_uid = generate_uid()
    today = datetime.date.today().strftime("%Y%m%d")

    ae = AE(ae_title=args.calling_ae)
    # Offer common classes: bundled samples may be CT/SC; a real probe sends Ultrasound.
    ae.add_requested_context(CTImageStorage)
    ae.add_requested_context(UltrasoundImageStorage)
    ae.add_requested_context(SecondaryCaptureImageStorage)

    print(f"Associating with {args.called_ae}@{args.host}:{args.port} as {args.calling_ae}…")
    assoc = ae.associate(args.host, args.port, ae_title=args.called_ae)
    if not assoc.is_established:
        sys.exit(
            "Association failed.\n"
            "  • Is the stack up?            docker compose ps\n"
            f"  • Is '{args.calling_ae}' listed in services/orthanc/orthanc.json.template DicomModalities?\n"
            "    (DicomAlwaysAllowStore is false, so unregistered devices are rejected.)"
        )

    tmpdir = tempfile.mkdtemp(prefix="thyroai-dicom-")
    sent = 0
    try:
        for i, filename in enumerate(sources, start=1):
            ds = pydicom.dcmread(os.path.join(args.src, filename))

            ds.PatientID = patient_id
            ds.PatientName = patient_name
            ds.PatientBirthDate = args.birth
            ds.PatientSex = args.sex

            ds.StudyInstanceUID = study_uid
            ds.SeriesInstanceUID = generate_uid()
            ds.SOPInstanceUID = generate_uid()
            ds.file_meta.MediaStorageSOPInstanceUID = ds.SOPInstanceUID

            ds.StudyDate = today
            ds.StudyDescription = "Thyroid US"
            ds.SeriesDescription = SERIES_LABELS[(i - 1) % len(SERIES_LABELS)]
            ds.InstanceNumber = i

            # Round-trip through disk so the rewritten file meta is what gets sent.
            path = os.path.join(tmpdir, f"study-{i}.dcm")
            ds.save_as(path, enforce_file_format=True)

            status = assoc.send_c_store(pydicom.dcmread(path))
            ok = status and status.Status == 0x0000
            print(f"  {'OK ' if ok else 'ERR'} {ds.SeriesDescription:<13} status=0x{status.Status:04x}"
                  if status else f"  ERR {ds.SeriesDescription} — no response")
            sent += 1 if ok else 0
    finally:
        assoc.release()

    print(f"\nSent {sent}/{len(sources)} image(s).")
    print(f"  PatientID        {patient_id}")
    print(f"  StudyInstanceUID {study_uid}")
    print("\nOrthanc holds the study for 30s (StableAge) before publishing the event.")
    print("Watch the pipeline log for 'Pushed study … to ThyroAI'.")
    if args.unmatched:
        print("This study will land in the admin panel DICOM Inbox for reconciliation.")
    else:
        print(f"If a patient with FIN {patient_id} exists in the hospital mapped to "
              f"AE Title '{args.calling_ae}', it becomes an examination automatically.")


if __name__ == "__main__":
    main()
