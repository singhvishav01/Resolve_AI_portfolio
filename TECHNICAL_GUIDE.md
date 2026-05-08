# ResolveAI — Complete Technical Guide
### Your recruiter-ready explanation of every file, function, and decision

---

## Table of Contents
1. [What the project is (30-second pitch)](#1-what-the-project-is)
2. [How the files are organized](#2-file-structure)
3. [How the app starts up](#3-how-the-app-starts)
4. [File-by-file breakdown](#4-file-by-file-breakdown)
   - [data.js — The Database](#datajs)
   - [auth.js — Login & Permissions](#authjs)
   - [disputes.js — Business Logic](#disputesjs)
   - [ai.js — AI Brief Engine](#aijs)
   - [render.js — The UI](#renderjs)
   - [app.js — The Coordinator](#appjs)
   - [css/main.css — Layout & Variables](#cssmain)
   - [css/components.css — UI Components](#csscomponents)
5. [Key concepts explained simply](#5-key-concepts)
6. [Data flow — what happens when you click something](#6-data-flow)
7. [Features and how they work](#7-features-and-how-they-work)
8. [Design decisions you can defend](#8-design-decisions)
9. [Likely recruiter questions + answers](#9-recruiter-qa)

---

## 1. What the Project Is

**One-sentence pitch:**
> ResolveAI is a web-based platform that simulates the Ontario Landlord and Tenant Board's dispute resolution process, with role-based access, AI-generated legal briefs, encrypted document handling, and a full case lifecycle from filing to appeal.

**What problem does it solve?**
The Ontario LTB handles thousands of disputes a year through paper-heavy, slow processes. ResolveAI simulates a digital version: tenants, landlords, and adjudicators each get their own view of a case, can submit evidence and testimony, ask each other written questions, and receive an AI-generated legal brief before the adjudicator issues a ruling.

**Why it's impressive for a portfolio:**
- It's a real-world domain (Ontario housing law) with real legal terminology
- It has multiple user roles with different permissions (like a real enterprise app)
- It uses the browser's built-in cryptography API (Web Crypto) — the same standard used in banking apps
- Zero external dependencies — everything is vanilla HTML, CSS, and JavaScript
- The code is split into 9 files with a clear separation of concerns

---

## 2. File Structure

```
resolve/
│
├── index.html              ← The only HTML file. Defines the skeleton of the UI.
│
├── css/
│   ├── main.css            ← Design system: variables, layout, login screen, sidebar, topbar
│   └── components.css      ← Every reusable UI component: cards, tables, badges, forms, toasts
│
└── js/
    ├── data.js             ← Mock database: all users, disputes, notifications (loads first)
    ├── auth.js             ← Login, logout, session restore, permission checking
    ├── disputes.js         ← All business logic: submit testimony, generate brief, issue ruling
    ├── ai.js               ← AI brief generation engine (template-based, no external API)
    ├── render.js           ← Everything that draws HTML to the screen
    └── app.js              ← Ties everything together: routing, search, keyboard shortcuts
```

**Why split into so many files?**
This is called **Separation of Concerns** — each file has one job. If a bug happens in the UI, you look in render.js. If permissions are wrong, you look in auth.js. This is the same principle used in frameworks like React (components) and MVC architectures (Model / View / Controller).

---

## 3. How the App Starts

The browser loads `index.html` and reads the `<script>` tags at the bottom **in order**:

```
data.js → auth.js → disputes.js → ai.js → render.js → app.js
```

**Why this order matters:**
- `data.js` must load first because every other file reads from `DB` (the database object it creates)
- `auth.js` needs `DB` to look up users
- `disputes.js` needs `DB`, `Auth`, `AIBrief`, and `UI` — so those must exist first
- `app.js` loads last because it calls functions from all other files

When `app.js` finishes loading, this line runs automatically:

```javascript
document.addEventListener('DOMContentLoaded', () => {
    Auth.restoreSession();
});
```

`DOMContentLoaded` fires when the HTML is fully parsed. `restoreSession()` checks if the user was already logged in (stored in `sessionStorage`) and if so, skips the login screen and goes straight to the app. This means **refreshing the page doesn't log you out**.

---

## 4. File-by-File Breakdown

---

### `data.js`

**What it does:** Creates a global object called `DB` that acts as the entire database.

**How it works:**
```javascript
window.DB = (function () {
    // ... all the data ...
    return { users, disputes, disputeTypes, notifications };
})();
```

This pattern is called an **IIFE** (Immediately Invoked Function Expression). The function runs immediately when the file loads, and the result (the object with users, disputes, etc.) is stored in `window.DB` so every other file can access it.

**`window.` prefix** — In a browser, `window` is the global object. Writing `window.DB = ...` is the same as making `DB` available everywhere. This is how we share data between separate JavaScript files without a bundler like Webpack.

**Key data structures:**

`users` — An object (like a dictionary) where each key is a username:
```javascript
const users = {
    tenant1: { id: 'tenant1', name: 'Sarah Mitchell', role: 'tenant', password: 'pass123', ... },
    landlord1: { id: 'landlord1', name: 'David Park', role: 'landlord', ... },
    // ...
};
```
Why an object instead of an array? Because looking up a user by ID (`DB.users['tenant1']`) is instant — O(1) — whereas searching an array would be O(n) (slower for large datasets).

`disputes` — An array of dispute objects. Each dispute has:
- `id` — unique case number (e.g., "LTB-ON-2024-0047")
- `stage` — where in the lifecycle it is: testimony → questions → answering → aiReview → ruled → appealed
- `testimony` — object with tenant and landlord testimony text
- `questions` — array of questions with answers nested inside
- `evidence` — object with `required` docs (specific to dispute type) and `additional` docs
- `aiBrief` — null until generated, then an object with the full analysis
- `ruling` — null until issued, then the adjudicator's decision
- `auditLog` — array of every action taken on the case with timestamps

`disputeTypes` — Configuration object mapping type codes (AGI, T2, L1, etc.) to their full names and required documents. This means if you add a new dispute type, you only change it in one place.

**localStorage restore at the bottom:**
```javascript
const persisted = loadPersisted();
if (persisted) {
    disputes.length = 0;
    persisted.forEach(d => disputes.push(d));
}
```
When the page loads, it checks if the user had previously saved any changes (like submitting testimony). If yes, it overwrites the default demo data with their saved version. `disputes.length = 0` clears the array without creating a new reference — important because other files might already be holding a reference to the same array.

---

### `auth.js`

**What it does:** Handles login, logout, session persistence, and decides who is allowed to do what.

**The module pattern:**
```javascript
window.Auth = (function () {
    let currentUser = null;  // private — nothing outside can touch this directly
    
    return {
        get currentUser() { return currentUser; },  // read-only getter
        login,
        logout,
        // ...
    };
})();
```

`currentUser` is declared with `let` inside the IIFE, making it **private**. Nothing outside `auth.js` can set `currentUser = something` directly. The only way to change it is through `Auth.login()` or `Auth.logout()`. This is **encapsulation** — the same concept from Object-Oriented Programming.

The `get currentUser()` syntax creates a **getter** — a property that looks like a variable but actually runs a function. So `Auth.currentUser` returns the value without exposing the variable itself.

**Login flow:**
```javascript
function login() {
    const username = document.getElementById('inp-user').value.trim();
    const password = document.getElementById('inp-pass').value;
    
    const user = DB.users[username];  // O(1) lookup
    
    if (!user || user.password !== password) {
        // show error
        return;
    }
    
    currentUser = user;
    sessionStorage.setItem('resolveai_uid', user.id);  // persist session
    // show the app
    App.init();
}
```

`sessionStorage` vs `localStorage`: sessionStorage is cleared when you close the browser tab. localStorage persists indefinitely. We use sessionStorage for the login session because it's more appropriate for authentication (you wouldn't want someone else to open the laptop and be auto-logged-in days later).

**The `can()` function — Role-Based Access Control (RBAC):**
```javascript
function can(action, dispute) {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;  // admin can do everything
    
    const isTenant   = dispute.tenantId   === currentUser.id;
    const isLandlord = dispute.landlordId === currentUser.id;
    const isAdj      = dispute.adjudicatorId === currentUser.id;
    
    switch (action) {
        case 'submitTestimony':
            return dispute.stage === 'testimony' && 
                   ((isTenant && !dispute.testimony.tenant) || 
                    (isLandlord && !dispute.testimony.landlord));
        // ...
    }
}
```

This function is the security layer of the whole app. Before any button renders or any action runs, it calls `Auth.can()`. If it returns false, the button doesn't appear and the function won't execute. This is called **principle of least privilege** — users only get access to exactly what they need.

---

### `disputes.js`

**What it does:** All the business logic — every action that changes a dispute's state.

**The rule:** This file mutates data. `render.js` only reads data. Keeping mutations and rendering separate makes bugs much easier to find.

**Key functions:**

`getVisible()` — Returns only the disputes the current user should see:
```javascript
function getVisible() {
    const u = Auth.currentUser;
    if (u.role === 'admin') return DB.disputes;  // all disputes
    if (u.role === 'adjudicator') return DB.disputes.filter(d => d.adjudicatorId === u.id);
    return DB.disputes.filter(d => d.tenantId === u.id || d.landlordId === u.id);
}
```
`.filter()` creates a new array with only items that pass the test. The original `DB.disputes` is never changed.

`filter()` — The search and filter function:
```javascript
function filter(disputes, { search = '', stage = 'all', type = 'all' } = {}) {
```
The `{ search = '', stage = 'all', type = 'all' } = {}` is **destructuring with defaults**. It means you can call `Disputes.filter(list)` with just one argument and the others default to safe values automatically.

`submitTestimony()`:
```javascript
function submitTestimony(disputeId, text) {
    const d = getById(disputeId);
    const u = Auth.currentUser;
    
    if (u.role === 'tenant')   d.testimony.tenant   = { text, date: now(), userId: u.id };
    if (u.role === 'landlord') d.testimony.landlord  = { text, date: now(), userId: u.id };
    
    // Auto-advance stage when both parties have submitted
    if (d.testimony.tenant && d.testimony.landlord) {
        d.stage = 'questions';
        audit(d, 'Stage advanced to Questions — both testimonies received.');
    }
    
    persist();  // save to localStorage
    UI.toast('Testimony submitted successfully.', 'success');
    App.openDispute(disputeId);  // re-render the panel
}
```

Notice `{ text, date: now(), userId: u.id }` — this is **shorthand property syntax**. `text` is the same as writing `text: text`.

`persist()` — Saves the current state to localStorage:
```javascript
function persist() {
    try {
        localStorage.setItem('resolveai_v3_disputes', JSON.stringify(DB.disputes));
    } catch (e) { /* quota exceeded or private mode */ }
}
```
`JSON.stringify()` converts the JavaScript object into a text string (JSON format) because localStorage can only store strings. When we load it back, `JSON.parse()` converts it back to an object.

The `try/catch` handles edge cases: private browsing mode disables localStorage, and some browsers have a storage quota that can be exceeded.

`audit()` — Adds a timestamped entry to the case's audit log:
```javascript
function audit(dispute, text) {
    dispute.auditLog.push({ text, date: now() });
}
```
Every single action in the app calls this. It creates a permanent paper trail of everything that happened in a case, which is critical for legal applications.

---

### `ai.js`

**What it does:** Generates the AI case brief — a structured legal analysis of the dispute.

**Important clarification for recruiters:** The AI here is **template-based**, not a live API call to OpenAI or Claude. Each dispute type (AGI, T2, L1, etc.) has its own legal template with dynamic content inserted from the actual case data. This was a deliberate decision — in production, you'd swap `ai.js` with an API call, but the structure of the output (the brief object) would be identical.

**How it's structured:**
```javascript
const templates = {
    AGI: {
        summaryFn: (d) => `...uses d.tenantId, d.landlordId...`,
        consistencies: ['Both parties agree...'],
        conflicts: ['Whether capital expenditures meet the threshold...'],
        law: ['s.120 RTA — Guideline Increase', ...],
        outcomeFn: () => `If the landlord's documentation is verified...`,
    },
    T2: { ... },
    // one template per dispute type
};
```

**The `generate()` function:**
```javascript
function generate(dispute) {
    const tpl = templates[dispute.typeCode];
    
    // Dynamically add insights based on actual case data
    const dynamicConflicts = [...tpl.conflicts];  // copy the template array (spread operator)
    
    if (qCount > 0 && aCount < qCount) {
        dynamicConflicts.push(`${qCount - aCount} question(s) remain unanswered...`);
    }
    
    const missingDocs = reqDocs.filter(r => !r.uploaded).map(r => r.name);
    if (missingDocs.length > 0) {
        dynamicGaps.unshift(`Required documents not submitted: ${missingDocs.join(', ')}.`);
    }
    
    return { generatedDate, summary, consistencies, conflicts, evidenceGaps, applicableLaw, suggestedOutcome, metadata };
}
```

`[...tpl.conflicts]` — The **spread operator** creates a shallow copy of the array. We never modify the template directly — we copy it first. This is called **immutability** and prevents bugs where changing one dispute's brief accidentally changes another's.

`.unshift()` adds to the beginning of an array (vs `.push()` which adds to the end). Missing documents appear first in the evidence gaps because they're the most critical issue.

---

### `render.js`

**What it does:** Every single pixel the user sees is generated here. It reads from `DB` and `Auth`, builds HTML strings, and writes them to the DOM.

**The golden rule of this file:** It never changes data. It only reads data and produces HTML.

**The module exposes the `UI` object:**
```javascript
window.UI = (function () {
    function toast(message, type) { ... }
    function renderSidebar() { ... }
    function renderDisputesList() { ... }
    // ...
    return { toast, renderSidebar, renderDisputesList, openDispute, closePanel, ... };
})();
```

**`toast()` — Notification system:**
```javascript
function toast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    // ...
    container.appendChild(el);
    setTimeout(() => el.classList.add('toast-show'), 10);     // trigger CSS transition
    setTimeout(() => el.classList.remove('toast-show'), 4500); // start fade-out
    setTimeout(() => el.remove(), 4800);                       // remove from DOM
}
```
The 10ms delay before adding `toast-show` is necessary because the browser needs one "tick" to register the element exists before a CSS transition can animate it. If you add the class in the same tick as `appendChild`, the transition is skipped.

**Template literals for HTML generation:**
```javascript
const rows = disputes.map(d => `
    <tr class="table-row" onclick="App.openDispute('${d.id}')">
        <td><span class="case-id">${d.id}</span></td>
        <td>${stageBadge(d.stage)}</td>
    </tr>
`).join('');
```
Template literals (backtick strings) allow multi-line strings and `${expression}` interpolation. `.map()` transforms each dispute into an HTML string. `.join('')` combines them into one string with no separator. This is the standard pattern for generating lists in vanilla JavaScript.

**`buildPanelBody()` — The case detail panel:**
This function orchestrates the entire panel by calling smaller builder functions for each section:
```javascript
function buildPanelBody(d) {
    const sections = [];
    sections.push(buildTimeline(d));
    sections.push(buildPartiesSection(d));
    sections.push(buildEvidenceSection(d));
    sections.push(buildTestimonySection(d));
    if (d.questions.length > 0) sections.push(buildQASection(d));
    if (d.aiBrief) sections.push(buildAIBriefSection(d));
    if (d.ruling)  sections.push(buildRulingSection(d));
    if (d.appeal)  sections.push(buildAppealSection(d));
    sections.push(buildAuditLog(d));
    return sections.join('');
}
```
Each section only renders if the data for it exists. `if (d.aiBrief)` — if `aiBrief` is null (the falsy case), that section is skipped entirely. This is called **conditional rendering**.

**`buildActionPanel()` — Smart action buttons:**
```javascript
function buildActionPanel(d) {
    const parts = [];
    
    if (Auth.can('genBrief', d) && d.stage === 'answering') {
        parts.push(`<button onclick="Disputes.generateBrief('${d.id}')">Generate AI Brief</button>`);
    }
    if (Auth.can('submitRuling', d)) {
        parts.push(`<div class="action-form">...</div>`);
    }
    // ...
}
```
Every button checks `Auth.can()` before it appears. A tenant will never see the "Issue Ruling" form. An adjudicator will never see the "Submit Testimony" form. The UI enforces the same rules as the business logic.

---

### `app.js`

**What it does:** The central coordinator. Manages which view is showing, handles search, and sets up keyboard shortcuts.

**Application state:**
```javascript
let currentView   = 'disputes';
let searchQuery   = '';
let filterStage   = 'all';
let filterType    = 'all';
let openDisputeId = null;
```
These `let` variables inside the IIFE are private state. They're exposed as read-only via getters:
```javascript
return {
    get currentView() { return currentView; },
    // ...
};
```
This means `App.currentView` always gives you the current value, but `App.currentView = 'something'` would silently fail (or throw in strict mode). This protects state from being changed in unexpected ways.

**Routing — `showView()`:**
```javascript
function showView(view) {
    currentView = view;
    UI.closePanel();  // always close the panel when switching views
    render();
}

function render() {
    UI.renderSidebar();  // always re-render sidebar (updates active nav item)
    switch (currentView) {
        case 'analytics':     UI.renderAnalytics();      break;
        case 'disputes':      UI.renderDisputesList();   break;
        case 'notifications': UI.renderNotifications();  break;
    }
}
```
This is client-side routing without a framework. Instead of loading a new HTML page, we just replace the content of `#page-content`. This is how all Single Page Applications (SPAs) work — React Router, Vue Router, etc. do the same thing under the hood.

**Keyboard shortcuts:**
```javascript
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!document.getElementById('modal').hidden)         { UI.closeModal(); return; }
        if (!document.getElementById('dispute-panel').hidden) { UI.closePanel(); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();  // stop the browser's default Ctrl+K action
        // focus the search bar
    }
});
```
`e.metaKey` is the Command key on Mac. `e.ctrlKey` is Ctrl on Windows. Supporting both makes the app work correctly on any operating system.

`e.preventDefault()` — Without this, Ctrl+K would trigger the browser's built-in address bar focus. We call this first to "cancel" the browser's default action before doing our own.

---

### `css/main.css`

**What it does:** Defines the design system and all layout-level styles.

**CSS Custom Properties (variables):**
```css
:root {
    --gold: #B8860B;
    --gold-light: #D4A82A;
    --green: #059669;
    --sidebar-w: 260px;
    --shadow-md: 0 4px 12px rgba(0,0,0,.09);
}
```
`:root` is the highest-level element (the `<html>` tag). Variables defined here are available everywhere. If the client wants to change the brand color, you change `--gold` in one place and it updates across the entire app.

**The critical bug fix:**
```css
[hidden] { display: none !important; }
```
The browser's default stylesheet sets `[hidden] { display: none }` but with very low specificity. Any CSS class with `display: flex` would override it, causing panels and modals to show on page load. The `!important` ensures hidden always wins. This is the fix for the initial grey-screen bug.

**The sidebar layout:**
```css
.app-screen {
    display: flex;       /* sidebar and content side by side */
    height: 100vh;       /* fill the full viewport height */
    overflow: hidden;    /* prevent page-level scrolling */
}
.sidebar {
    width: var(--sidebar-w);  /* fixed width */
    flex-shrink: 0;           /* never compress smaller than this */
}
.main-content {
    flex: 1;             /* take all remaining space */
    overflow: hidden;    /* let children handle their own scroll */
}
```
`flex: 1` is shorthand for `flex-grow: 1; flex-shrink: 1; flex-basis: 0`. It means "take up all available space after fixed-width items are accounted for."

**Panel slide animation:**
```css
.panel {
    position: fixed;      /* taken out of normal flow, positioned relative to viewport */
    top: 0; right: 0; bottom: 0;
    width: min(700px, 100vw);  /* max 700px, but never wider than screen on mobile */
    animation: slideIn var(--t-base) cubic-bezier(.4,0,.2,1);
}

@keyframes slideIn {
    from { transform: translateX(40px); opacity: 0; }
    to   { transform: none; opacity: 1; }
}
```
`cubic-bezier(.4,0,.2,1)` is Google's Material Design "standard easing" curve — starts fast, ends slow. More natural than linear. `transform: translateX()` is used for animation instead of changing `right` or `margin` because transforms are GPU-accelerated and don't cause layout recalculation (much smoother at 60fps).

---

### `css/components.css`

**What it does:** Every reusable UI component. If you need to change how all badges look, you only touch this file.

**Badge system:**
```css
.badge { display: inline-flex; padding: 3px 10px; border-radius: 100px; font-size: .73rem; font-weight: 600; }
.badge-green  { background: var(--green-bg); color: var(--green); }
.badge-purple { background: var(--purple-bg); color: var(--purple); }
```
Every stage badge reuses `.badge` as a base and adds a color modifier class. This is the **BEM-inspired modifier pattern** — base class defines shape, modifier class defines color/variant.

**The chart bars (no charting library needed):**
```css
.chart-bar-track { height: 8px; background: var(--ink-100); border-radius: 100px; }
.chart-bar       { height: 100%; border-radius: 100px; transition: width var(--t-slow); }
```
The width is set via inline style: `style="width:75%"`. The `transition` makes it animate from 0 to its value when the page renders. No Chart.js, no D3 — just CSS.

---

## 5. Key Concepts

**IIFE (Immediately Invoked Function Expression)**
```javascript
window.MyModule = (function() {
    let privateVar = 'hidden';
    return { publicMethod: () => privateVar };
})();
```
A function that calls itself immediately. Used to create a private scope — variables inside are not accessible from outside. This is how we simulate modules without a bundler.

**Separation of Concerns**
Each file has one job. Data lives in `data.js`. Permissions live in `auth.js`. Rendering lives in `render.js`. If a bug occurs in the UI, you don't need to read the business logic files to find it.

**Role-Based Access Control (RBAC)**
Users have roles (admin, tenant, landlord, adjudicator). Permissions are checked before any action runs. A tenant literally cannot call `submitRuling()` successfully — `Auth.can('submitRuling', dispute)` will return false and the button won't render in the first place.

**Single Page Application (SPA) pattern**
One HTML page. JavaScript replaces the content of `#page-content` to simulate navigation. No page reloads. This is how Gmail, Twitter, and every modern web app works.

**Event Delegation**
Instead of adding click listeners to each row individually, the entire table re-renders with `onclick="App.openDispute('${d.id}')"` inline. Each time the list is re-rendered, the handlers are fresh. This avoids memory leaks from stale event listeners.

**Immutability (copying before mutating)**
```javascript
const dynamicConflicts = [...tpl.conflicts];  // copy
dynamicConflicts.push('new item');             // mutate the copy
```
We never modify shared template data. This prevents one dispute's brief from corrupting another's.

---

## 6. Data Flow — What Happens When You Click Something

**Example: Tenant clicks "Submit Testimony"**

```
User types text → clicks button
    ↓
onclick="Disputes.submitTestimony('LTB-ON-2024-0047', v)"
    ↓
disputes.js: submitTestimony()
    → Auth.can('submitTestimony', d)  →  auth.js checks role + stage
    → d.testimony.tenant = { text, date, userId }  →  mutates DB.disputes
    → audit(d, '...')  →  adds to auditLog
    → if both testimonies exist → d.stage = 'questions'
    → persist()  →  JSON.stringify → localStorage.setItem
    → UI.toast('Success', 'success')  →  render.js creates toast element
    → App.openDispute(disputeId)  →  app.js calls UI.openDispute()
         ↓
    render.js: openDispute()
         → Disputes.getById(id)  →  reads updated DB.disputes
         → builds all panel HTML sections
         → document.getElementById('panel-body').innerHTML = ...
         → shows the panel
```

The user sees: panel re-renders with testimony visible, stage badge updated to "Questions", a green toast pops up.

---

## 7. Features and How They Work

| Feature | How it works | Files involved |
|---|---|---|
| Demo login buttons | `Auth.fillDemo(username, password)` sets input values then calls `Auth.login()` | auth.js |
| Session restore on refresh | `sessionStorage.getItem('resolveai_uid')` on `DOMContentLoaded` | auth.js, app.js |
| Role-based views | `getVisible()` filters disputes; `Auth.can()` controls buttons | auth.js, disputes.js |
| Live search | `oninput="App.handleSearch(this.value)"` calls `Disputes.filter()` and re-renders | app.js, disputes.js, render.js |
| Stage filters | Dropdown `onchange` sets `App.filterStage` and re-renders | app.js, render.js |
| Auto-advance to Questions | After both testimonies submitted, `d.stage = 'questions'` | disputes.js |
| AI brief generation | `AIBrief.generate(d)` builds legal analysis from templates + live case data | ai.js |
| Toast notifications | DOM elements created, CSS transition triggers, auto-remove after 4.5s | render.js, components.css |
| Keyboard shortcuts | `document.addEventListener('keydown', ...)` in app.js | app.js |
| Persistence | `JSON.stringify(DB.disputes)` → localStorage on every mutation | disputes.js |
| Audit log | Every action calls `audit(dispute, text)` which pushes to `dispute.auditLog` | disputes.js |
| Appeal system | `d.stage = 'appealed'` + `d.appeal = {...}` | disputes.js |
| Create dispute modal | Admin-only, `Auth.can('createDispute')`, builds new dispute object | disputes.js, render.js |

---

## 8. Design Decisions

**"Why not use React/Vue?"**
> For a portfolio piece targeting entry-level roles, vanilla JavaScript demonstrates that you understand the fundamentals — DOM manipulation, event handling, state management — without a framework doing it for you. Any React developer who understands this code can also understand React. The reverse isn't always true.

**"Why localStorage instead of a real database?"**
> This is a frontend-only demo with no backend. localStorage lets actions persist across page refreshes, making it behave like a real app. In production, every `persist()` call would be replaced by a `fetch('/api/disputes', { method: 'PATCH', body: JSON.stringify(data) })` — the rest of the code would be identical.

**"Why is the AI brief template-based?"**
> Calling a real LLM API from a client-side app would expose the API key in the browser (a security vulnerability). In production you'd have a backend endpoint that calls the AI. The template approach produces the same structured output, keeping the frontend architecture intact — just swap `ai.js` for an API call.

**"Why split into so many files for a small project?"**
> This demonstrates software engineering principles used in real teams: each file can be tested independently, each file can be worked on by a different developer without merge conflicts, and bugs are localized to one area of the codebase.

**"Why use CSS custom properties instead of Sass/Less?"**
> Modern browsers support CSS variables natively. No build step, no preprocessor, no tooling. The variables are also readable at runtime — you can change a theme color with JavaScript: `document.documentElement.style.setProperty('--gold', '#ff0000')`.

---

## 9. Recruiter Q&A

**Q: Walk me through how a user submits testimony.**
> When the tenant clicks Submit Testimony, the button's `onclick` calls `Disputes.submitTestimony()` in disputes.js. That function first checks `Auth.can()` to confirm the user is allowed. It then writes the testimony text, date, and user ID into `d.testimony.tenant`. It checks if both parties have now submitted — if yes, it automatically advances the stage to 'questions'. It then calls `persist()` to save to localStorage, `UI.toast()` to show a success message, and `App.openDispute()` to re-render the panel with the new data visible.

**Q: How does the permission system work?**
> Every user has a role. The `Auth.can(action, dispute)` function takes an action name and a dispute, then checks the current user's role and the dispute's current stage. Admin always returns true. For other roles, it checks whether the user is a party to that specific dispute, what stage it's in, and whether they've already performed that action. The function is called both before rendering buttons (so unauthorized buttons never appear) and inside the business logic functions (as a second check).

**Q: What's the difference between localStorage and sessionStorage?**
> Both store key-value string pairs in the browser. sessionStorage is cleared when the tab is closed — we use it for the login session so you stay logged in on page refresh but not forever. localStorage persists until explicitly cleared — we use it for dispute state so that testimony you submitted survives a page refresh.

**Q: How does the live search work?**
> The search input has `oninput="App.handleSearch(this.value)"`. Every keystroke calls `handleSearch()`, which updates `App.searchQuery` and calls `UI.renderDisputesList()`. That function calls `Disputes.filter()` with the current search query, which checks if the query appears in the case ID, type, address, tenant name, or landlord name. The filtered array is then rendered into the table. No debounce is needed since all filtering is local (no network call).

**Q: How would you add a real backend to this?**
> The `persist()` function in disputes.js would be replaced by `await fetch('/api/disputes/' + id, { method: 'PATCH', body: JSON.stringify(changes) })`. The `DB.disputes` initialization in data.js would become `const disputes = await fetch('/api/disputes').then(r => r.json())`. The auth system would use JWTs instead of a hardcoded password object. The rest of the code — all the rendering, business logic, and UI — stays exactly the same.

**Q: What is the IIFE pattern and why did you use it?**
> An IIFE is a function that immediately calls itself. It creates a private scope so variables defined inside can't be accessed or modified from outside. I used it for every module (Auth, Disputes, UI, App, DB) so each module has private state and only exposes what it chooses to return. Without this, all variables would be global and any file could accidentally overwrite any other file's data.

**Q: What was the hardest bug you fixed?**
> The initial grey-screen bug. On page load, elements like the dispute panel and modal had the HTML `hidden` attribute, which should set `display: none`. But the browser's default stylesheet sets `[hidden] { display: none }` with very low specificity (an attribute selector). My CSS classes like `.panel { display: flex }` had equal or higher specificity, so they were overriding `hidden`, causing invisible panels to block the entire page. The fix was one line: `[hidden] { display: none !important; }` — the `!important` ensures hidden always wins regardless of any class rules.

---

*Document generated for ResolveAI v3.1 · Vishavpreet Singh · 2025*
