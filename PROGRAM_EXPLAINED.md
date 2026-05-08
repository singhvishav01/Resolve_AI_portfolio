# Resolve AI — Complete Program Breakdown
### A plain-English guide to every file, function, and key line of code

---

## Table of Contents

1. [What the app does in one paragraph](#1-what-the-app-does)
2. [How the app is structured](#2-how-the-app-is-structured)
3. [The database — cases.db](#3-the-database)
4. [db.py — database setup](#4-dbpy)
5. [app.py — the entry point](#5-apppy)
6. [login.py — authentication](#6-loginpy)
7. [lawyer.py — lawyer dashboard](#7-lawyerpy)
8. [judge.py — judge dashboard](#8-judgepy)
9. [admin.py — admin dashboard](#9-adminpy)
10. [ai_access.py — AI ruling engine](#10-ai_accesspy)
11. [style.css — design system](#11-stylecss)
12. [Key concepts explained](#12-key-concepts-explained)
13. [The full case lifecycle](#13-the-full-case-lifecycle)
14. [Recruiter Q&A — likely questions and answers](#14-recruiter-qa)

---

## 1. What the app does

Resolve AI is a legal case management platform with three types of users: **Admins**, **Lawyers**, and **Judges**. An Admin opens a case by entering the client details and assigning a Lawyer and a Judge. The Lawyer reads the case facts and writes their legal arguments inside the app. When the Lawyer saves those arguments, the app sends them to the **OpenAI GPT-4o model**, which reads the facts and arguments and generates a suggested ruling — citing actual Canadian law, federal acts, and case precedents from CanLII. The Judge then opens the case, reads everything, and either accepts the AI's suggestion or types their own verdict. Once the Judge submits a final ruling, the Lawyer sees it and can either accept it (which archives the case) or appeal it.

---

## 2. How the app is structured

The app is built with **Streamlit**, a Python library that lets you build web apps entirely in Python — no HTML forms or JavaScript needed for interactivity. Every time the user clicks a button or types something, Streamlit re-runs the entire Python script from top to bottom. That is the core behaviour of Streamlit and explains many design decisions in this codebase.

```
app.py          ← runs first every time, decides which dashboard to show
├── login.py    ← shown if no user is logged in
├── lawyer.py   ← shown if logged-in user's role is "Lawyer"
├── judge.py    ← shown if logged-in user's role is "Judge"
└── admin.py    ← shown if logged-in user's role is "Admin"

db.py           ← creates the database tables and default users
ai_access.py    ← sends arguments to OpenAI and returns a ruling
style.css       ← all visual styling loaded into the browser
cases.db        ← the SQLite database file (auto-created on first run)
uploaded_files/ ← folder where case documents are saved (auto-created)
```

---

## 3. The database

The app uses **SQLite**, a file-based database — no server required. Everything is stored in a single file called `cases.db`. SQLite is accessed through Python's built-in `sqlite3` module.

There are two tables:

### `users` table

| Column | Type | What it stores |
|--------|------|----------------|
| username | TEXT (primary key) | Login username, e.g. `lawyer1` |
| password | TEXT | Plain-text password (prototype only — production would hash this) |
| role | TEXT | Either `"Lawyer"`, `"Judge"`, or `"Admin"` |

### `cases` table

| Column | Type | What it stores |
|--------|------|----------------|
| case_id | TEXT (primary key) | 8-character random ID, e.g. `"a1b2c3d4"` |
| client | TEXT | Client's full name |
| case_type | TEXT | `"Traffic Court"`, `"Housing Court"`, or `"Other"` |
| city | TEXT | City where the case takes place |
| province | TEXT | Province, used to determine applicable provincial law |
| facts | TEXT | The full written facts of the case, entered by the Admin |
| arguments | TEXT | The lawyer's legal arguments — updated by the Lawyer |
| ai_ruling | TEXT | The AI-generated suggestion, filled in when arguments are saved |
| final_ruling | TEXT | The judge's final verdict — NULL until the judge acts |
| created_by | TEXT | The username of the Lawyer assigned to this case |
| assigned_judge | TEXT | The username of the Judge assigned to this case |
| created_at | TEXT | Timestamp of when the case was created |
| lawyer_accepted | INTEGER | `0` = not accepted, `1` = lawyer accepted the ruling and case is archived |

**Important design note about archiving:** When a lawyer accepts a ruling, the app does not delete or move the case. Instead it appends the string `"[ARCHIVED]"` to the end of the `arguments` field and sets `lawyer_accepted = 1`. The app then uses `.endswith("[ARCHIVED]")` to decide whether to show the case in the archive or the active list. This is a simple flag-based approach — there is no separate archive table.

---

## 4. db.py

```python
import sqlite3
DB_PATH = "cases.db"
```
`DB_PATH` is a constant — a fixed string that holds the filename of the database. Every other file imports this so they all connect to the same database file.

---

```python
def init_db():
    with sqlite3.connect(DB_PATH) as conn:
```
`sqlite3.connect(DB_PATH)` opens a connection to the database file. If `cases.db` does not exist yet, SQLite creates it automatically. The `with` keyword is a **context manager** — it automatically closes the connection when the block finishes, even if an error occurs.

```python
        cursor = conn.cursor()
```
A cursor is an object you use to run SQL commands. Think of the connection as the phone line and the cursor as the person speaking.

```python
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users ( ... )
        """)
```
`CREATE TABLE IF NOT EXISTS` means "create this table, but only if it doesn't already exist." This is safe to run every time the app starts — it won't wipe existing data.

---

```python
def seed_users():
    ...
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
```
`seed_users` only inserts the default accounts if the users table is completely empty. `fetchone()[0]` gets the first column of the first returned row — which is the count. If it is `0`, no users exist yet, so it inserts the defaults.

```python
        users = [
            ("lawyer1", "pass123", "Lawyer"),
            ("judge1", "pass123", "Judge"),
            ("admin", "adminpass", "Admin")
        ]
        cursor.executemany("INSERT INTO users ...", users)
```
`executemany` is more efficient than calling `execute` three times — it inserts all rows in a single database operation.

---

## 5. app.py

This is the **entry point** — the file Streamlit runs. Everything starts here.

```python
init_db()
seed_users()
```
These run every time the app loads. Because of the `IF NOT EXISTS` and empty-check guards in `db.py`, they are safe to call repeatedly without duplicating data.

---

```python
st.set_page_config(page_title="Resolve AI — Legal Intelligence Platform", layout="wide", page_icon="⚖️")
```
This must be the **first Streamlit call** in the script. It sets the browser tab title, the favicon, and `layout="wide"` removes the default narrow centre column and uses the full browser width.

---

```python
with open("style.css", encoding="utf-8") as f:
    st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
```
Streamlit does not have a built-in way to load an external CSS file, so this is a workaround. It reads `style.css` as a plain string, wraps it in a `<style>` tag, and injects it into the page as raw HTML. `encoding="utf-8"` is required because the CSS file contains special Unicode characters (like `—`) that Windows cannot read with its default encoding.

---

```python
_user_badge = ""
if "user" in st.session_state:
    _role_icon = {"Lawyer": "👩‍⚖️", "Judge": "⚖️", "Admin": "🛠️"}.get(st.session_state.role, "👤")
    _user_badge = f'<span class="header-user-badge">{_role_icon} {st.session_state.user}</span>'
```
`st.session_state` is a dictionary that persists between reruns for the same user session. Before login it is empty, so `"user" in st.session_state` is False and the badge stays blank. After login it holds the username and role, so the header shows who is logged in. The `.get(st.session_state.role, "👤")` looks up the emoji for the role, defaulting to a generic person emoji if the role is unrecognised.

---

```python
if "user" not in st.session_state:
    login()
elif st.session_state.role == "Lawyer":
    lawyer_dashboard()
elif st.session_state.role == "Judge":
    judge_dashboard()
elif st.session_state.role == "Admin":
    admin_dashboard()
```
This is the entire routing system. There is no URL router or page navigation library — just an `if/elif` chain that checks what is stored in session state and calls the right function. Only one dashboard function runs per page load.

---

## 6. login.py

```python
def login():
```
This function renders the entire login page. It is called from `app.py` when no user is in session state.

---

```python
    st.markdown("""
    <style>
    [data-testid="stSidebar"] { display: none !important; }
    .block-container { max-width: 500px !important; ... }
    </style>
    """, unsafe_allow_html=True)
```
Injects page-specific CSS overrides. `[data-testid="stSidebar"]` is Streamlit's internal HTML attribute for the sidebar — hiding it on the login page because there is no navigation needed there. `max-width: 500px` constrains the main column to create a centred card layout.

---

```python
    username = st.text_input("Username", placeholder="Enter your username")
    password = st.text_input("Password", type="password", placeholder="Enter your password")
```
`st.text_input` renders a labelled input field. `type="password"` masks the characters. Both return their current value as a Python string on every rerun.

---

```python
    if st.button("Sign In →", use_container_width=True):
```
`st.button` returns `True` only on the specific rerun triggered by clicking it — on all other reruns it returns `False`. `use_container_width=True` stretches the button to the full width of its container.

---

```python
        cursor.execute("SELECT role FROM users WHERE username=? AND password=?", (username, password))
        result = cursor.fetchone()
```
The `?` placeholders are **parameterised queries** — they prevent SQL injection. If someone types `' OR '1'='1` into the username box, it is treated as a literal string, not as SQL code. `fetchone()` returns the first matching row as a tuple, or `None` if no match.

---

```python
            if result:
                st.session_state.user = username
                st.session_state.role = result[0]
                st.session_state.view = "Dashboard"
                st.experimental_rerun()
```
On a successful login, three values are written to `session_state`: the username, the role (pulled from the database result), and the initial view. `st.experimental_rerun()` immediately restarts the script from the top — this time `"user" in st.session_state` is True, so `app.py` routes to the correct dashboard instead of showing the login page again.

---

## 7. lawyer.py

```python
def lawyer_dashboard():
    if "view" not in st.session_state:
        st.session_state.view = "Dashboard"
```
Guards against the case where `view` was never set. On first load after login, `app.py` sets `view = "Dashboard"`, so this guard rarely fires — but it is defensive programming.

---

### Logout

```python
    st.markdown('<div class="logout-btn-container">', unsafe_allow_html=True)
    if st.button("Logout", key="logout_button"):
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.experimental_rerun()
    st.markdown('</div>', unsafe_allow_html=True)
```
The `<div class="logout-btn-container">` wrapper is pure HTML injected into the page. The CSS for that class uses `position: fixed` to pin the button to the top-right corner of the screen regardless of scroll position. The logout logic iterates over a **copy** of the session state keys (`list(...)` makes a copy) because you cannot delete from a dictionary while iterating over it directly. Clearing all keys effectively logs the user out — the next rerun finds no `"user"` in session state and shows the login page.

---

### Sidebar

```python
    if st.session_state.view != "Dashboard":
        ...
        if st.session_state.view == "Case Detail":
            current = st.session_state.get("prev_list_view", options[0])
        else:
            current = st.session_state.view if st.session_state.view in options else options[0]
        choice = st.sidebar.radio("Go to:", options, index=options.index(current))
        if choice != current:
            st.session_state.view = choice
            st.session_state.pop("selected_case_id", None)
            st.experimental_rerun()
```
The sidebar only appears when not on the Dashboard — there is no need for navigation when you are already at the top level. The `current` variable tracks which list the user is viewing so the radio button shows the correct item highlighted. The special `"Case Detail"` check is critical: when viewing a case detail, the view is `"Case Detail"` which is not in the radio options list. Without this check, `current` would default to `options[0]` ("Ongoing Cases"), the radio would show it selected, and the comparison `choice != current` would immediately fire — sending the user back to Ongoing Cases the moment they open any case. The fix stores `prev_list_view` when navigating to Case Detail, and uses that to correctly show which list the user came from. `st.session_state.pop("selected_case_id", None)` removes the stored case ID when switching lists — the `None` argument means it won't raise an error if the key doesn't exist.

---

### Dashboard stats

```python
        cursor.execute(
            "SELECT final_ruling, arguments FROM cases WHERE created_by=?",
            (st.session_state.user,)
        )
        all_cases = cursor.fetchall()

        n_ongoing  = sum(1 for c in all_cases if not c[0])
        n_ruled    = sum(1 for c in all_cases if c[0] and not c[1].endswith("[ARCHIVED]"))
        n_archived = sum(1 for c in all_cases if c[0] and c[1].endswith("[ARCHIVED]"))
```
Fetches only the two columns needed for counting — not the full case data. `c[0]` is `final_ruling`, `c[1]` is `arguments`. The three counts use **generator expressions** inside `sum()`:
- `n_ongoing`: cases where `final_ruling` is empty/None (no ruling yet)
- `n_ruled`: cases where a ruling exists but `arguments` does not end with `"[ARCHIVED]"` (ruling received, lawyer has not acted yet)
- `n_archived`: cases where a ruling exists AND arguments end with `"[ARCHIVED]"` (fully closed)

---

### Case list

```python
        preview = facts[:140] + ("..." if len(facts) > 140 else "")
```
Takes the first 140 characters of the facts string for the card preview. The ternary expression appends `"..."` only if the string was actually cut short.

```python
        col_card, col_btn = st.columns([5, 1], gap="small")
```
`st.columns([5, 1])` splits the row into two columns where the left is 5 units wide and the right is 1 unit wide — so the card takes up most of the space and the button is a narrow strip on the right.

```python
            if st.button("View", key=f"view_{case_id}"):
                st.session_state.selected_case_id = case_id
                st.session_state.prev_list_view = st.session_state.view
                st.session_state.view = "Case Detail"
                st.experimental_rerun()
```
Each "View" button needs a unique `key` — if two buttons shared the same key Streamlit would throw an error. `f"view_{case_id}"` makes each key unique using the case ID. When clicked: stores which case was selected, stores which list we came from (so the Back button works), changes view to "Case Detail", and reruns.

---

### Case detail — arguments section

```python
        if not final_ruling:
            new_arguments = st.text_area(
                "Write or update your legal arguments below:",
                value=arguments, height=220, ...
            )
            if st.button("Save Arguments & Generate AI Ruling", use_container_width=True):
                if not new_arguments.strip():
                    st.error("Arguments cannot be empty.")
                else:
                    ai_ruling = ai_generate_ruling(new_arguments)
                    with sqlite3.connect(DB_PATH) as conn:
                        cursor.execute(
                            "UPDATE cases SET arguments=?, ai_ruling=? WHERE case_id=?",
                            (new_arguments, ai_ruling, case_id)
                        )
```
The textarea is only shown if `final_ruling` is empty — once a judge has ruled, the lawyer can no longer edit arguments (it shows as read-only text instead). `new_arguments.strip()` removes whitespace and checks the string is not blank. `ai_generate_ruling(new_arguments)` calls the OpenAI API (see section 10). The `UPDATE` statement saves both the lawyer's arguments and the AI's ruling in a single database write.

---

### Accept or appeal

```python
            if appeal_choice == "Accept":
                archived_args = arguments + "[ARCHIVED]"
            cursor.execute(
                "UPDATE cases SET arguments=?, lawyer_accepted=? WHERE case_id=?",
                (archived_args, 1, case_id)
            )
```
When the lawyer accepts, the string `"[ARCHIVED]"` is appended to the existing arguments text, and `lawyer_accepted` is set to `1`. There is no separate archive table — the presence of `"[ARCHIVED]"` at the end of the arguments string is what moves the case into the archive view. This is a deliberate simplification for a prototype.

---

## 8. judge.py

### Case filtering

```python
    if st.session_state.view == "New Cases":
        cases = [c for c in cases if not c[8]]
    elif st.session_state.view == "Ongoing Cases":
        cases = [c for c in cases if not c[8] and c[6]]
    elif st.session_state.view == "Personal Case Archive":
        cases = [c for c in cases if c[8] and c[12] == 1]
```
`c[8]` is `final_ruling` (column index 8 from `SELECT *`). `c[6]` is `arguments`. `c[12]` is `lawyer_accepted`.

- **New Cases**: `final_ruling` is empty — no judge has acted yet
- **Ongoing Cases**: `final_ruling` is empty AND `arguments` is non-empty — lawyer has submitted arguments, judge can now rule
- **Personal Case Archive**: ruling exists AND `lawyer_accepted = 1` — fully resolved

---

### Status labelling

```python
        has_args = arguments and arguments.strip()
        status_label = "Ruling Submitted" if final_ruling else ("Ready for Ruling" if has_args else "Awaiting Arguments")
        status_cls   = "ruled" if final_ruling else ("updated" if has_args else "pending")
```
This is a **nested ternary** — Python evaluates it left to right. If `final_ruling` exists: label is "Ruling Submitted". Otherwise, if arguments exist: label is "Ready for Ruling". Otherwise: "Awaiting Arguments". `status_cls` maps each state to a CSS class name that controls the badge colour.

---

### Verdict submission

```python
        judge_choice = st.radio(
            "Ruling source:",
            ["Accept AI Ruling", "Override with My Own"],
            key=f"{cid}_choice"
        )
        custom_ruling = (
            ai_ruling if judge_choice == "Accept AI Ruling"
            else st.text_area("Enter your ruling:", key=f"{cid}_text", height=120)
        )
```
`custom_ruling` is set with a ternary. If the judge chose "Accept AI Ruling", `custom_ruling` is just the AI's text. If they chose to override, `st.text_area` renders an input and its current value is used. The unique keys (`f"{cid}_choice"`, `f"{cid}_text"`) are necessary because there may be multiple cases visible at the same time in the expander list — each needs its own independent widget state.

```python
        if st.button(f"Submit Ruling", key=f"{cid}_submit"):
            ...
            cursor2.execute(
                "UPDATE cases SET final_ruling=? WHERE case_id=?",
                (custom_ruling, cid)
            )
```
Writes the final ruling to the database. Once this runs, the Lawyer will see the ruling appear in their "Cases with Ruling Completed" list.

---

## 9. admin.py

```python
        case_id = str(uuid.uuid4())[:8]
```
`uuid.uuid4()` generates a random UUID like `"550e8400-e29b-41d4-a716-446655440000"`. `str(...)[:8]` takes just the first 8 characters — `"550e8400"`. This is the case's unique ID. There is a small theoretical chance of collision with 8 hex characters, but it is negligible for a prototype.

```python
        cursor.execute("""
            INSERT INTO cases
            (case_id, client, case_type, ..., created_at, lawyer_accepted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
        """, (case_id, client, case_type, ...))
```
`datetime('now')` is a SQLite function that inserts the current UTC timestamp as a string. `lawyer_accepted` starts at `0` — the case is not archived. The `arguments`, `ai_ruling`, and `final_ruling` fields are all inserted as empty strings or `None` — they get filled in later as the case progresses.

```python
        if uploaded_files:
            for uploaded_file in uploaded_files:
                file_path = os.path.join(UPLOAD_FOLDER, f"{case_id}_{uploaded_file.name}")
                with open(file_path, "wb") as f:
                    f.write(uploaded_file.getbuffer())
```
`uploaded_file.getbuffer()` returns the file's binary content as a memory buffer. `"wb"` opens the file in write-binary mode. The file is saved as `{case_id}_{original_filename}` so multiple cases can upload files with the same name without overwriting each other. The files are stored on disk, not in the database — the database only stores case metadata.

---

## 10. ai_access.py

```python
openai.api_key = os.getenv("OPENAI_API_KEY")
```
`os.getenv` reads an environment variable. The API key is never hard-coded in the source file — it must be set in the system environment before running the app. This is a security best practice: if the code is uploaded to GitHub, the key is not exposed.

---

```python
def ai_generate_ruling(arguments: str) -> str:
```
The `: str` and `-> str` are **type hints** — they document that this function expects a string input and returns a string. Python does not enforce them at runtime, but they help any developer reading the code understand how to use the function.

---

```python
    prompt = f"""
You are an AI judge reviewing a legal case...
Look through Constitutional acts, laws, Legal precedent (ONLY CANADA and then further the PROVINCE mentioned)...
    """
```
This is the **system prompt** — the instructions given to the AI before it sees the actual case. The critical instruction is to look at Canadian law specifically, and then the province mentioned in the arguments. This is why the Admin enters the province — it gets included in the arguments, and the AI uses it to find applicable provincial statutes (e.g., Ontario's Highway Traffic Act for a traffic case in Toronto).

---

```python
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a legal assistant AI trained to generate official legal rulings."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=300
    )
```
- `model="gpt-4o"` — uses OpenAI's most capable model at the time of writing
- `messages` — the Chat API takes a list of messages. `"system"` sets the AI's persona and behaviour. `"user"` is the actual request
- `temperature=0.3` — controls randomness. `0` is fully deterministic, `1` is very creative. `0.3` keeps the ruling consistent and factual — you do not want a legal AI being creative
- `max_tokens=300` — caps the response length to control cost and keep rulings concise

```python
    result = response.choices[0].message.content.strip()
```
`response.choices` is a list — the API can return multiple completions if asked, but here only one is requested. `[0]` gets the first (and only) result. `.content` is the text. `.strip()` removes leading/trailing whitespace.

```python
    except Exception as e:
        return f"Error generating AI ruling: {e}"
```
If the API call fails for any reason (network error, invalid key, rate limit), the function returns a readable error string instead of crashing the whole app.

---

## 11. style.css

The CSS is organised as a **design system** using CSS custom properties (variables).

```css
:root {
    --navy-900: #0b1f3a;
    --navy-800: #0f2b4c;
    --gold:     #c9a227;
    --bg:       #f0f3f8;
    ...
}
```
`:root` is the top-level element of the page. Variables defined here are available everywhere in the stylesheet using `var(--name)`. This means the entire colour palette can be changed in one place.

---

```css
#MainMenu            { visibility: hidden !important; }
footer               { visibility: hidden !important; }
[data-testid="stHeader"] { display: none !important; }
```
Streamlit adds its own hamburger menu, footer ("Made with Streamlit"), and top toolbar to every app. These rules hide them so the UI looks like a custom product rather than a generic Streamlit app. `[data-testid="stHeader"]` targets Streamlit's internal element using its test ID attribute.

---

```css
.nav-cards-section div.stButton > button {
    height: 120px !important;
    white-space: pre-line !important;
    ...
}
```
Streamlit renders all buttons as `<button>` elements inside a `<div class="stButton">`. To style only the dashboard navigation buttons (not every button), they are wrapped in a `<div class="nav-cards-section">` in Python, and the CSS selector `.nav-cards-section div.stButton > button` specifically targets buttons inside that wrapper.

The `white-space: pre-line` property is what makes the emoji and text appear on two lines — the button labels in Python use `\n\n` to insert a line break, and `pre-line` tells the browser to respect those newlines.

---

```css
.logout-btn-container {
    position: fixed !important;
    top: 14px !important;
    right: 28px !important;
    z-index: 99999 !important;
}
```
`position: fixed` takes the element out of the normal page flow and positions it relative to the browser window — it stays in the same spot even when you scroll. `z-index: 99999` ensures it appears on top of every other element including Streamlit's own overlays.

---

## 12. Key concepts explained

### What is `st.session_state`?
Streamlit reruns the entire Python script on every user interaction. Normally this would reset all variables to their initial values. `st.session_state` is a special dictionary that survives across reruns for the same browser session. It is how the app "remembers" that you are logged in, which view you are on, and which case you selected.

### What is `st.experimental_rerun()` / `st.rerun()`?
Forces Streamlit to immediately re-run the script from the top. This is used after changing session state — for example, after login you set the user in session state and then call rerun so the new state takes effect immediately and the correct dashboard appears.

### Why does the app use `unsafe_allow_html=True`?
By default Streamlit escapes all HTML for security. `unsafe_allow_html=True` disables that escaping and injects raw HTML into the page. It is used throughout for custom layouts, cards, badges, and the fixed header — things Streamlit's built-in components cannot easily produce.

### What is a parameterised SQL query?
```python
cursor.execute("SELECT role FROM users WHERE username=? AND password=?", (username, password))
```
The `?` marks are placeholders. The actual values are passed separately in a tuple. This prevents **SQL injection** — a common attack where a user types SQL code into a form field to manipulate the database. With parameterised queries, whatever the user types is always treated as data, never as SQL commands.

### What is a context manager (`with` statement)?
```python
with sqlite3.connect(DB_PATH) as conn:
```
The `with` statement guarantees that `conn.close()` is called when the block ends, even if an error occurs inside it. Without this, a crash mid-block could leave the database connection open and locked.

---

## 13. The full case lifecycle

```
1. ADMIN logs in
   → Fills in: client name, case type, city, province, facts
   → Assigns a Lawyer and a Judge from the users in the database
   → Optionally uploads supporting documents
   → Clicks "Open Case" → case_id is generated, row inserted into cases table
      (arguments = "", ai_ruling = "", final_ruling = NULL, lawyer_accepted = 0)

2. LAWYER logs in
   → Dashboard shows stat cards: how many ongoing, ruled, archived
   → Clicks "Ongoing Cases" → sees a card list of their assigned cases
   → Clicks "View" on a case → goes to Case Detail page
   → Reads the facts
   → Types legal arguments into the text area
   → Clicks "Save Arguments & Generate AI Ruling"
      → arguments saved to DB
      → ai_access.py sends arguments to GPT-4o
      → AI returns ruling + legal citations
      → ai_ruling saved to DB

3. JUDGE logs in
   → Dashboard shows stat cards: new cases, awaiting ruling, archived
   → Clicks "Ongoing Cases" → sees all cases that have lawyer arguments
   → Opens an expander for a case
   → Reads: facts, arguments, and the AI recommendation card
   → Chooses: "Accept AI Ruling" OR "Override with My Own"
   → Clicks "Submit Ruling"
      → final_ruling written to DB

4. LAWYER logs back in
   → "Cases with Ruling Completed" now shows this case
   → Opens the case → sees the judge's ruling in a green verdict card
   → Chooses: Accept or Appeal
   → Clicks "Submit Decision"
      If Accept:
         → arguments field gets "[ARCHIVED]" appended
         → lawyer_accepted set to 1
         → Case moves to Personal Case Archive
      If Appeal:
         → (prototype: currently logs the appeal — full appeal workflow not yet implemented)
```

---

## 14. Recruiter Q&A

**Q: Why did you use Streamlit instead of Flask or Django?**
Streamlit lets you build a fully functional multi-user web app in pure Python with no HTML, CSS framework, or JavaScript required for interactivity. For a prototype focused on demonstrating the AI and case management logic, it was the fastest path to a working product. The tradeoff is less fine-grained layout control compared to a full web framework.

**Q: How does the AI integration work?**
When a lawyer saves their arguments, the app calls the OpenAI Chat Completions API with a carefully written system prompt. The prompt instructs GPT-4o to act as a legal judge, reference only Canadian law, and produce output in a specific format: 1–2 lines of reasoning, a final ruling starting with "Ruling:", and a citation. The `temperature=0.3` setting keeps the output factual and consistent rather than creative.

**Q: How is the database structured?**
SQLite with two tables: `users` (username, password, role) and `cases` (13 columns covering the full case lifecycle). The app uses raw SQL with parameterised queries — no ORM — which keeps the data layer simple and explicit.

**Q: How does authentication work?**
The login form queries the database for a matching username and password. If found, the username and role are stored in Streamlit's session state. Every page load checks for the presence of `"user"` in session state to decide whether to show the login page or the dashboard. There is no JWT, no cookie management, and no session timeout — these would be added before any real deployment.

**Q: What would you change for a production version?**
At minimum: password hashing (bcrypt), HTTPS, moving from SQLite to PostgreSQL, proper session expiry, a real appeal workflow, and an audit log of all rulings. The AI prompt would also be refined with real legal review.

**Q: What was the hardest technical problem you solved?**
The sidebar navigation bug. Streamlit reruns the entire script on every interaction. When a user navigated to "Case Detail", the sidebar radio button had no matching option in its list and defaulted to index 0 ("Ongoing Cases"). On that same rerun, the code detected a mismatch between the radio selection and the current view and immediately redirected back — making it impossible to open any case. The fix was to store `prev_list_view` in session state when entering Case Detail, and use that stored value to set the radio's current selection so no mismatch fires.

**Q: How does the archive work?**
There is no separate archive table. When a lawyer accepts a ruling, the string `"[ARCHIVED]"` is appended to the end of their arguments text in the database, and `lawyer_accepted` is set to 1. The case list views filter using `.endswith("[ARCHIVED]")` to separate archived from active cases. It is a simple flag-based approach suited to the prototype scope.
