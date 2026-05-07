import streamlit as st
import sqlite3
from ai_access import ai_generate_ruling
DB_PATH = "cases.db"

def lawyer_dashboard():
    if "view" not in st.session_state:
        st.session_state.view = "Dashboard"

    # Logout — fixed top-right
    st.markdown('<div class="logout-btn-container">', unsafe_allow_html=True)
    if st.button("Logout", key="logout_button"):
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.experimental_rerun()
    st.markdown('</div>', unsafe_allow_html=True)

    # ── Sidebar (non-dashboard views) ───────────────────────────
    if st.session_state.view != "Dashboard":
        st.sidebar.markdown("### Navigation")
        if st.sidebar.button("← Back to Dashboard"):
            st.session_state.view = "Dashboard"
            st.session_state.pop("selected_case_id", None)
            st.experimental_rerun()

        options = ["Ongoing Cases", "Cases with Ruling Completed", "Personal Case Archive"]
        # When in Case Detail, highlight whichever list we came from — don't default to index 0
        if st.session_state.view == "Case Detail":
            current = st.session_state.get("prev_list_view", options[0])
        else:
            current = st.session_state.view if st.session_state.view in options else options[0]
        choice = st.sidebar.radio("Go to:", options, index=options.index(current))
        if choice != current:
            st.session_state.view = choice
            st.session_state.pop("selected_case_id", None)
            st.experimental_rerun()

    # ════════════════════════════════════════════════════════════
    #  DASHBOARD
    # ════════════════════════════════════════════════════════════
    if st.session_state.view == "Dashboard":
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT final_ruling, arguments FROM cases WHERE created_by=?",
                (st.session_state.user,)
            )
            all_cases = cursor.fetchall()

        n_ongoing  = sum(1 for c in all_cases if not c[0])
        n_ruled    = sum(1 for c in all_cases if c[0] and not c[1].endswith("[ARCHIVED]"))
        n_archived = sum(1 for c in all_cases if c[0] and c[1].endswith("[ARCHIVED]"))

        st.markdown(f"""
        <div class="page-title-section">
            <div class="role-badge">👩‍⚖️ Lawyer Portal</div>
            <h1>Welcome back, {st.session_state.user}</h1>
            <p>Here is an overview of your caseload and current status.</p>
        </div>
        """, unsafe_allow_html=True)
        st.markdown('<div class="decorative-line"></div>', unsafe_allow_html=True)

        st.markdown(f"""
        <div class="stat-row">
            <div class="stat-card">
                <span class="stat-icon">📋</span>
                <div class="stat-value">{n_ongoing}</div>
                <div class="stat-label">Ongoing Cases</div>
            </div>
            <div class="stat-card">
                <span class="stat-icon">⚖️</span>
                <div class="stat-value">{n_ruled}</div>
                <div class="stat-label">Rulings Received</div>
            </div>
            <div class="stat-card">
                <span class="stat-icon">🗄️</span>
                <div class="stat-value">{n_archived}</div>
                <div class="stat-label">Archived</div>
            </div>
        </div>
        <p class="section-label">Quick Access</p>
        """, unsafe_allow_html=True)

        st.markdown('<div class="nav-cards-section">', unsafe_allow_html=True)
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("📋\n\nOngoing Cases"):
                st.session_state.view = "Ongoing Cases"
                st.experimental_rerun()
        with col2:
            if st.button("✅\n\nCases with Ruling Completed"):
                st.session_state.view = "Cases with Ruling Completed"
                st.experimental_rerun()
        with col3:
            if st.button("🗄️\n\nPersonal Case Archive"):
                st.session_state.view = "Personal Case Archive"
                st.experimental_rerun()
        st.markdown('</div>', unsafe_allow_html=True)
        return

    # ════════════════════════════════════════════════════════════
    #  CASE DETAIL
    # ════════════════════════════════════════════════════════════
    if st.session_state.view == "Case Detail":
        back_label = st.session_state.get("prev_list_view", "Ongoing Cases")
        if st.button(f"← Back to {back_label}"):
            st.session_state.view = back_label
            st.session_state.pop("selected_case_id", None)
            st.experimental_rerun()

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT case_id, client, final_ruling, facts, arguments, created_by FROM cases WHERE case_id=? AND created_by=?",
                (st.session_state.get("selected_case_id"), st.session_state.user)
            )
            case = cursor.fetchone()

        if not case:
            st.error("Case not found.")
            return

        case_id, client, final_ruling, facts, arguments, created_by = case
        status = "Ruled" if final_ruling else "Pending"
        status_cls = "ruled" if final_ruling else "pending"

        st.markdown(f"""
        <div class="page-title-section">
            <div class="role-badge">👩‍⚖️ Case Detail</div>
            <h1>{client}</h1>
            <p>Case ID: <strong>{case_id}</strong> &nbsp;&nbsp;
               <span class="case-tag {status_cls}">{status}</span></p>
        </div>
        """, unsafe_allow_html=True)
        st.markdown('<div class="decorative-line"></div>', unsafe_allow_html=True)

        # ── Meta strip (always shown) ────────────────────────────
        st.markdown(f"""
        <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
            <div class="info-item" style="flex:1;min-width:130px;">
                <div class="info-label">Client</div>
                <div class="info-value">{client}</div>
            </div>
            <div class="info-item" style="flex:1;min-width:130px;">
                <div class="info-label">Case ID</div>
                <div class="info-value">{case_id}</div>
            </div>
            <div class="info-item" style="flex:1;min-width:130px;">
                <div class="info-label">Status</div>
                <div class="info-value"><span class="case-tag {status_cls}">{status}</span></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # ── Archive read-only ────────────────────────────────────
        if back_label == "Personal Case Archive":
            if final_ruling:
                st.markdown('<div class="section-header">Final Verdict</div>', unsafe_allow_html=True)
                st.markdown(f"""
                <div class="verdict-card">
                    <div class="verdict-label">&#9878; Judge\'s Ruling</div>
                    <div class="verdict-text">{final_ruling}</div>
                </div>
                """, unsafe_allow_html=True)
            return

        # ── Facts ────────────────────────────────────────────────
        st.markdown('<div class="section-header">Facts of the Case</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="facts-box">{facts}</div>', unsafe_allow_html=True)

        # ── Arguments ────────────────────────────────────────────
        st.markdown('<div class="section-header">Legal Arguments</div>', unsafe_allow_html=True)

        if not final_ruling:
            new_arguments = st.text_area(
                "Write or update your legal arguments below:",
                value=arguments,
                height=220,
                placeholder="Present your legal arguments, cite relevant statutes, and reference applicable case law..."
            )
            if st.button("Save Arguments & Generate AI Ruling", use_container_width=True):
                if not new_arguments.strip():
                    st.error("Arguments cannot be empty.")
                else:
                    ai_ruling = ai_generate_ruling(new_arguments)
                    with sqlite3.connect(DB_PATH) as conn:
                        cursor = conn.cursor()
                        cursor.execute(
                            "UPDATE cases SET arguments=?, ai_ruling=? WHERE case_id=?",
                            (new_arguments, ai_ruling, case_id)
                        )
                        conn.commit()
                    st.success("Arguments saved. AI ruling has been generated and sent to the judge.")
                    st.experimental_rerun()
        else:
            clean = arguments.replace("[ARCHIVED]", "")
            st.markdown(f'<div class="facts-box">{clean}</div>', unsafe_allow_html=True)

        # ── Judge's ruling + decision ─────────────────────────────
        if final_ruling and not arguments.endswith("[ARCHIVED]"):
            st.markdown('<div class="section-header">Judge\'s Ruling</div>', unsafe_allow_html=True)
            st.markdown(f"""
            <div class="verdict-card">
                <div class="verdict-label">&#9878; Final Ruling</div>
                <div class="verdict-text">{final_ruling}</div>
            </div>
            """, unsafe_allow_html=True)

            st.markdown('<div class="section-header">Your Decision</div>', unsafe_allow_html=True)
            appeal_choice = st.radio(
                "How would you like to respond to this ruling?",
                ["Accept", "Appeal"],
                key=case_id + "_appeal_choice"
            )
            if st.button("Submit Decision", key=case_id + "_submit_decision", use_container_width=True):
                with sqlite3.connect(DB_PATH) as conn:
                    cursor = conn.cursor()
                    if appeal_choice == "Accept":
                        archived_args = arguments + "[ARCHIVED]"
                    cursor.execute(
    "UPDATE cases SET arguments=?, lawyer_accepted=? WHERE case_id=?",
    (archived_args, 1, case_id)
)
                    conn.commit()
                    st.success("You accepted the ruling. Case archived.")
            else:
                        st.success("Appeal submitted. The case will be reviewed.")
        return

    # ════════════════════════════════════════════════════════════
    #  CASE LIST  (Ongoing / Ruled / Archive)
    # ════════════════════════════════════════════════════════════
    _icons = {
        "Ongoing Cases": "📋",
        "Cases with Ruling Completed": "✅",
        "Personal Case Archive": "🗄️"
    }
    st.markdown(f"""
    <div class="page-title-section">
        <div class="role-badge">👩‍⚖️ Lawyer Portal</div>
        <h1>{_icons.get(st.session_state.view, "")} {st.session_state.view}</h1>
    </div>
    """, unsafe_allow_html=True)
    st.markdown('<div class="decorative-line"></div>', unsafe_allow_html=True)

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT case_id, client, final_ruling, facts, arguments, created_by FROM cases WHERE created_by=?",
            (st.session_state.user,)
        )
        rows = cursor.fetchall()

    if st.session_state.view == "Ongoing Cases":
        rows = [r for r in rows if not r[2]]
    elif st.session_state.view == "Cases with Ruling Completed":
        rows = [r for r in rows if r[2] and not r[4].endswith("[ARCHIVED]")]
    elif st.session_state.view == "Personal Case Archive":
        rows = [r for r in rows if r[2] and r[4].endswith("[ARCHIVED]")]

    if not rows:
        st.markdown(
            '<div class="custom-info-box">&#128194; No cases found in this category.</div>',
            unsafe_allow_html=True
        )
        return

    for row in rows:
        case_id, client, final_ruling, facts, arguments, created_by = row
        status = "Ruled" if final_ruling else "Pending"
        status_cls = "ruled" if final_ruling else "pending"
        preview = facts[:140] + ("..." if len(facts) > 140 else "")

        col_card, col_btn = st.columns([5, 1], gap="small")
        with col_card:
            st.markdown(f"""
            <div class="case-list-card">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                    <span class="case-id-tag">#{case_id}</span>
                    <span class="case-tag {status_cls}">{status}</span>
                </div>
                <div class="case-client-name">{client}</div>
                <div class="case-facts-preview">{preview}</div>
            </div>
            """, unsafe_allow_html=True)
        with col_btn:
            st.markdown('<div class="case-view-btn" style="padding-top:20px;">', unsafe_allow_html=True)
            if st.button("View", key=f"view_{case_id}"):
                st.session_state.selected_case_id = case_id
                st.session_state.prev_list_view = st.session_state.view
                st.session_state.view = "Case Detail"
                st.experimental_rerun()
            st.markdown('</div>', unsafe_allow_html=True)
