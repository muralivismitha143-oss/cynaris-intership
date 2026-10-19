# Cynaris Internship

This repository contains my Cynaris internship projects and assignments.

## Week 2 — Interview Status Pipeline

The app uses the repository's Express API and a Vue 3 frontend. The frontend is served from `backend/public` and groups applicants into pipeline columns. Updating a candidate's stage calls the API and refreshes today's dashboard counts.

### Run locally

```powershell
cd backend
npm start
```

Open `http://localhost:3000`. Vue 3 is loaded from unpkg, so the browser needs internet access to load the frontend framework.

### API endpoints

- `GET /api/health`
- `GET /api/applicants`
- `PATCH /api/applicants/:applicant_id/stage`
- `GET /api/dashboard/stages-today`

### Verify with curl.exe

```powershell
curl.exe http://localhost:3000/api/applicants
curl.exe http://localhost:3000/api/dashboard/stages-today
curl.exe -X PATCH http://localhost:3000/api/applicants/1/stage -H "Content-Type: application/json" -d "{\"stage\":\"Technical Round 1\"}"
```

This repository does not contain a Frappe app or `Interview` doctype. The existing in-memory Express API provides the equivalent pipeline stages and validation.
