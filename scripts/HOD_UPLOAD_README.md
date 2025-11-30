HOD Upload - Sample File & Upload Instructions
=============================================

This repository includes a small helper to generate a sample Excel file used by the HOD upload endpoint.

1) Generate the sample Excel

Install `openpyxl` if you don't have it:

```bash
pip install openpyxl
```

Then run:

```bash
python3 scripts/generate_hod_sample.py
```

This creates `scripts/hod_sample.xlsx` with headers:

- `name`, `usn`, `email`, `role`, `semester`, `proctor name`, `proctor email`

It contains one student row and one proctor row as examples.

Example rows you can paste into the sheet (CSV-style):

- Student row:
  Alice Rao,1BM20CS001,alice.rao@college.edu,student,5,Rajesh Sharma,sharma@college.edu
- Proctor row:
  Rajesh Sharma,,sharma@college.edu,proctor,,,

2) Uploading the file to the server

The HOD upload endpoint expects a multipart form field named `file` and is mounted at:

`POST /api/hod/:dept_id/users/upload`

When testing locally with the dev auth middleware, include these headers:

- `X-User-Id`: numeric staff id (e.g. `2`)
- `X-User-Role`: `hod`

Example curl command (replace PORT/base URL if different):

```bash
curl -v -X POST "http://localhost:5000/api/hod/1/users/upload" \
  -H "X-User-Id: 2" \
  -H "X-User-Role: hod" \
  -F "file=@scripts/hod_sample.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
```

3) Verify results

After upload, check the DB for the created users and student details. Example psql queries:

```bash
# check proctor user
psql -c "SELECT user_id, email, role, is_active FROM users WHERE email = 'sharma@college.edu';"

# check student details
psql -c "SELECT * FROM student_details WHERE usn = '1BM20CS001';"

# compatibility table
psql -c "SELECT * FROM students WHERE student_usn = '1BM20CS001';"
```

If you want, I can run the generate+upload+verification steps here and report back the DB rows. Say "run it" and I will proceed.
