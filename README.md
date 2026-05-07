# ResolveAI — Legal Intelligence Platform

A role-based legal case management platform powered by OpenAI. Lawyers submit arguments, an AI generates rulings, and judges review and deliver verdicts — all through a clean, professional web interface built with Streamlit.

---

## Features

- **Role-based access** — separate dashboards for Lawyers, Judges, and Admins
- **AI-generated rulings** — GPT-4o analyses legal arguments and produces reasoned verdicts with Canadian legal citations
- **Full case lifecycle** — from case creation through arguments, ruling, appeal/acceptance, and archiving
- **Document uploads** — attach PDFs, DOCX, and image files to any case
- **Live stat dashboard** — each user sees their caseload counts at a glance

---

## Roles

| Role | Responsibilities |
|------|-----------------|
| **Admin** | Creates cases, assigns lawyers and judges, uploads documents |
| **Lawyer** | Submits legal arguments, receives AI-assisted rulings, accepts or appeals verdicts |
| **Judge** | Reviews facts and arguments, accepts AI ruling or overrides with a custom verdict |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Streamlit + custom CSS (Inter font, CSS variables) |
| Backend | Python 3.11 |
| Database | SQLite |
| AI | OpenAI GPT-4o via `openai` SDK |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/singhvishav01/Resolve_AI_portfolio.git
cd Resolve_AI_portfolio
```

### 2. Install dependencies

```bash
pip install streamlit openai
```

### 3. Set your OpenAI API key

```bash
# Windows
set OPENAI_API_KEY=your-key-here

# macOS / Linux
export OPENAI_API_KEY=your-key-here
```

### 4. Run the app

```bash
streamlit run app.py
```

The app opens at `http://localhost:8501`.

---

## Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| `lawyer1` | `pass123` | Lawyer |
| `judge1` | `pass123` | Judge |
| `admin` | `adminpass` | Admin |

> Change these in `db.py` before any real-world deployment.

---

## Project Structure

```
.
├── app.py          # Entry point — routing, header, CSS injection
├── login.py        # Authentication
├── lawyer.py       # Lawyer dashboard — case list, arguments, decisions
├── judge.py        # Judge dashboard — case review, verdict submission
├── admin.py        # Admin dashboard — case creation, assignments
├── ai_access.py    # OpenAI integration — ruling generation
├── db.py           # SQLite schema and seed data
├── style.css       # Full design system (CSS variables, components)
└── uploaded_files/ # Uploaded case documents (auto-created)
```

---

## Case Workflow

```
Admin creates case
      ↓
Lawyer reviews facts → submits legal arguments
      ↓
AI generates a suggested ruling
      ↓
Judge reviews arguments + AI ruling → submits final verdict
      ↓
Lawyer accepts verdict (case archived) or appeals
```

---

## Screenshots

> Coming soon.

---

## License

This project is a portfolio prototype. Not intended for production legal use.
