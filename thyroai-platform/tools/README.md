# DICOM test tools

See the main [README — Send a sample study](../README.md#send-a-sample-study-local) for full instructions.

Quick reminder:

```bash
py -m pip install pynetdicom pydicom
# put .dcm files in tools/images/
py tools/send_test_study.py --src tools/images --unmatched
```

Host DICOM port defaults to `14242` (`ORTHANC_DICOM_PORT` in `.env`).
