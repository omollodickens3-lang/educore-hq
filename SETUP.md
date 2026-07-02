# EduCore — Stage 1 Setup Guide
# Follow these steps exactly to get the system running on your computer

## ─── WHAT YOU NEED FIRST ───────────────────────────────────────────────────

1. A computer running Windows, Mac, or Linux
2. Node.js 18 or newer  →  download at https://nodejs.org  (choose LTS version)
3. A PostgreSQL database — choose ONE of these FREE options:
   - Option A (easiest): Supabase free cloud DB → https://supabase.com (recommended)
   - Option B (local):   Install PostgreSQL → https://www.postgresql.org/download

## ─── STEP 1: GET A DATABASE ────────────────────────────────────────────────

### Option A — Supabase (Recommended, free, no install needed)
1. Go to https://supabase.com and create a free account
2. Click "New project" and name it "educore"
3. Choose a region close to Kenya (e.g. eu-west-1)
4. Set a database password and save it
5. Once created, go to Settings → Database → Connection string
6. Copy the "URI" connection string — it looks like:
   postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

### Option B — Local PostgreSQL
1. Install PostgreSQL from https://www.postgresql.org/download
2. Open pgAdmin or psql and create a database called "educore"
3. Note your username (usually "postgres") and password

## ─── STEP 2: CONFIGURE THE BACKEND ────────────────────────────────────────

1. Open the educore/backend folder
2. Copy .env.example to .env:
   - On Windows: copy .env.example .env
   - On Mac/Linux: cp .env.example .env

3. Open .env in any text editor (Notepad, VS Code, etc.)
4. Fill in these values:

   # If using Supabase:
   DATABASE_URL=postgresql://postgres:[your-password]@db.[your-ref].supabase.co:5432/postgres

   # If using local PostgreSQL:
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=educore
   DB_USER=postgres
   DB_PASSWORD=your_local_password

   # Required — make this long and random (any 40+ character string):
   JWT_SECRET=myschool_educore_very_secret_key_2026_westside_kenya

   # School details — change to your school:
   SCHOOL_NAME=Your School Name Here
   SCHOOL_COUNTY=Nairobi County
   SCHOOL_PHONE=0700000000
   SCHOOL_EMAIL=info@yourschool.ac.ke

5. Save the .env file

## ─── STEP 3: INSTALL DEPENDENCIES ─────────────────────────────────────────

Open a terminal (Command Prompt on Windows, Terminal on Mac/Linux):

```bash
# Go into the backend folder
cd educore/backend

# Install all packages
npm install

# Go into the frontend folder
cd ../frontend

# Install all packages
npm install
```

## ─── STEP 4: CREATE THE DATABASE TABLES ───────────────────────────────────

```bash
# From the backend folder:
cd educore/backend

# This creates all tables (learners, teachers, scores, attendance, etc.)
npm run migrate
```

You should see:
✅ Done: 001_initial_schema.sql
🎉 All migrations complete.

## ─── STEP 5: SEED DEMO DATA ────────────────────────────────────────────────

```bash
# Still in the backend folder:
npm run seed
```

You should see:
✅ School created
✅ Users created (admin, teacher, parent)
✅ Teachers and subject assignments created
✅ Classes created (PP1–Grade 9, Streams A & B)
✅ 352 learners created with CBC strand data
✅ Exams and scores seeded
✅ Attendance records seeded (last 3 weeks)
✅ Assignments and submissions seeded
✅ Term dates configured
✅ Sample notification created
🎉 EduCore database seeded successfully!

## ─── STEP 6: START THE SERVERS ─────────────────────────────────────────────

You need TWO terminal windows open at the same time:

### Terminal 1 — Backend API:
```bash
cd educore/backend
npm run dev
```
You should see: 🚀 EduCore API running on port 5000

### Terminal 2 — Frontend:
```bash
cd educore/frontend
npm run dev
```
You should see: Local: http://localhost:3000

## ─── STEP 7: OPEN IN BROWSER ───────────────────────────────────────────────

Open your browser and go to:  http://localhost:3000

You will see the EduCore login page.

### Login credentials:
| Role    | Email                      | Password     |
|---------|----------------------------|--------------|
| Admin   | admin@westside.ac.ke       | Admin@2026   |
| Teacher | teacher@westside.ac.ke     | Teacher@2026 |
| Parent  | parent@westside.ac.ke      | Parent@2026  |

Click "Use" next to any role on the login page to fill credentials automatically.

## ─── WHAT WORKS IN STAGE 1 ─────────────────────────────────────────────────

✅ Login with JWT authentication
✅ Role-based access control (admin / teacher / parent)
✅ Dashboard with live stats from database
✅ Learner Management — full CRUD (add, edit, delete, view)
✅ CBC strand tracking per learner
✅ Remediation flags (auto-triggered)
✅ Attendance alerts (absent today + chronic absentees)
✅ Database with ALL 8 modules' data structures
✅ API health check at http://localhost:5000/api/health

## ─── WHAT COMES IN STAGE 2 ─────────────────────────────────────────────────

- Full teacher management UI connected to API
- Examinations score entry with live CBC grading
- Report form generation and PDF download
- Attendance register UI
- Assignments grading UI
- AI content generation (lesson plans, schemes)
- Parent portal with SMS/email sending
- Deployment to the internet (Vercel + Railway)

## ─── TROUBLESHOOTING ────────────────────────────────────────────────────────

Problem: "Cannot connect to database"
Solution: Check your DATABASE_URL or DB_* settings in .env

Problem: "Port 5000 already in use"
Solution: Change PORT=5001 in .env and update VITE_API_URL in frontend/.env

Problem: "npm: command not found"
Solution: Install Node.js from https://nodejs.org first

Problem: Login says "Invalid credentials"
Solution: Make sure you ran "npm run seed" first

## ─── NEED HELP? ─────────────────────────────────────────────────────────────

Come back to Claude and say exactly what error message you see.
We will fix it together and move to Stage 2.
