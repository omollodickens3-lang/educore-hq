# EduCore — CBC School Management Platform

A full-stack web application for Kenyan CBC schools covering PP1 to Grade 9 (Primary + Junior Secondary).

## Modules
1. Learner Management
2. Teacher Management
3. Examinations & Results (Primary 4-level · JS 8-level CBC grading)
4. Report Forms (auto-signed, print-ready)
5. Attendance Register
6. Assignments
7. Content Generation (AI-powered, CBC-aligned)
8. Parent Portal (SMS/email notifications)

## Tech stack
- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Auth**: JWT (JSON Web Tokens)
- **SMS**: Africa's Talking API
- **Email**: SendGrid
- **AI**: Anthropic Claude API
- **Hosting**: Vercel (frontend) · Railway (backend) · Supabase (DB)

## Quick start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or a free Supabase account)
- npm or yarn

### 1. Clone and install
```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure environment variables
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database URL, JWT secret, API keys

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your API base URL
```

### 3. Set up the database
```bash
cd backend
npm run migrate        # Run all migrations (creates all tables)
npm run seed           # Seed demo data (optional)
```

### 4. Start development servers
```bash
# Terminal 1 — backend (port 5000)
cd backend && npm run dev

# Terminal 2 — frontend (port 3000)
cd frontend && npm run dev
```

Open http://localhost:3000

### Default login credentials (after seeding)
| Role | Email | Password |
|------|-------|----------|
| Admin / Principal | admin@westside.ac.ke | Admin@2026 |
| Class teacher | teacher@westside.ac.ke | Teacher@2026 |
| Parent | parent@westside.ac.ke | Parent@2026 |

## Project structure
```
educore/
├── backend/
│   ├── src/
│   │   ├── config/        # DB connection, env config
│   │   ├── controllers/   # Business logic per module
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── models/        # Database query functions
│   │   ├── routes/        # API route definitions
│   │   └── utils/         # CBC grading, helpers
│   ├── migrations/        # SQL migration files
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # One page per module
│   │   ├── hooks/         # Custom React hooks
│   │   ├── context/       # Auth context, global state
│   │   └── utils/         # API calls, CBC grade helpers
│   ├── .env.example
│   └── package.json
└── README.md
```
