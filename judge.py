import streamlit as st
import sqlite3
from db import DB_PATH

def judge_dashboard():
    if "view" not in st.session_state:
        st.session_state.view = "Dashboard"

    # Logout — fixed top-right
    st.markdown('<div class="logout-btn-container">', unsafe_allow_html=True)
    if st.button("Logout", key="logout_button"):
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.experimental_rerun()
    st.markdown('</div>', unsafe_allow_html=True)

    # ── Sidebar (non-dashboard) ──────────────────────────────────
    if st.session_state.view != "Dashboard":
        st.sidebar.markdown("### Navigation")
        if st.sidebar.button("← Back to Dashboard"):
            st.session_state.view = "Dashboard"
            st.rerun()

        options = ["New Cases", "Ongoing Cases", "Personal Case Archive"]
        current = st.session_state.view if st.session_state.view in options else options[0]
        choice = st.sidebar.radio("Go to:", options, index=options.index(current))
        if choice != st.session_state.view:
            st.session_state.view = choice
            st.rerun()

    # ════════════════════════════════════════════════════════════
    #  DASHBOARD
    # ════════════════════════════════════════════════════════════
    if st.session_state.view == "Dashboard":
        with sqlite3.connect(DB_PATH, timeout=10) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT final_ruling, arguments, lawyer_accepted FROM cases")
            all_cases = cursor.fetchall()

        n_new      = sum(1 for c in all_cases if not c[0])
        n_ongoing  = sum(1 for c in all_cases if not c[0] and c[1])
        n_archived = sum(1 for c in all_cases if c[0] and c[2] == 1)

        st.markdown(f"""
        <div class="page-title-section">
            <div class="role-badge">&#9878; Judge Portal</div>
            <h1>Welcome back, {st.session_state.user}</h1>
            <p>Review pending cases, evaluate AI recommendations, and submit your verdicts.</p>
        </div>
        """, unsafe_allow_html=True)
        st.markdown('<div class="decorative-line"></div>', unsafe_allow_html=True)

        st.markdown(f"""
        <div class="stat-row">
            <div class="stat-card">
                <span class="stat-icon">&#128196;</span>
                <div class="stat-value">{n_new}</div>
                <div class="stat-label">New Cases</div>
            </div>
            <div class="stat-card">
                <span class="stat-icon">&#9878;</span>
                <div class="stat-value">{n_ongoing}</div>
                <div class="stat-label">Awaiting Ruling</div>
            </div>
            <div class="stat-card">
                <span class="stat-icon">&#128451;</span>
                <div class="stat-value">{n_archived}</div>
                <div class="stat-label">Closed & Archived</div>
            </div>
        </div>
        <p class="section-label">Quick Access</p>
        """, unsafe_allow_html=True)

        st.markdown('<div class="nav-cards-section">', unsafe_allow_html=True)
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("&#128196;\n\nNew Cases"):
                st.session_state.view = "New Cases"
                st.rerun()
        with col2:
            if st.button("&#9878;\n\nOngoing Cases"):
                st.session_state.view = "Ongoing Cases"
                st.rerun()
        with col3:
            if st.button("&#128451;\n\nPersonal Case Archive"):
                st.session_state.view = "Personal Case Archive"
                st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)
        return

    # ════════════════════════════════════════════════════════════
    #  CASE LIST VIEWS
    # ════════════════════════════════════════════════════════════
    _icons = {"New Cases": "&#128196;", "Ongoing Cases": "&#9878;", "Personal Case Archive": "&#128451;"}
    st.markdown(f"""
    <div class="page-title-section">
        <div class="role-badge">&#9878; Judge Portal</div>
        <h1>{_icons.get(st.session_state.view, "")} {st.session_state.view}</h1>
    </div>
    """, unsafe_allow_html=True)
    st.markdown('<div class="decorative-line"></div>', unsafe_allow_html=True)

    with sqlite3.connect(DB_PATH, timeout=10) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM cases")
        cases = cursor.fetchall()

    if st.session_state.view == "New Cases":
        cases = [c for c in cases if not c[8]]
    elif st.session_state.view == "Ongoing Cases":
        cases = [c for c in cases if not c[8] and c[6]]
    elif st.session_state.view == "Personal Case Archive":
        cases = [c for c in cases if c[8] and c[12] == 1]

    if not cases:
        st.markdown(
            '<div class="custom-info-box">&#128194; No cases found in this category.</div>',
            unsafe_allow_html=True
        )
        return

    for case in cases:
        (cid, client, case_type, city, province, facts, arguments, ai_ruling,
         final_ruling, created_by, assigned_judge, created_at, lawyer_accepted) = case

        # ── Archive view ─────────────────────────────────────────
        if st.session_state.view == "Personal Case Archive":
            with st.expander(f"#{cid}  —  {client}  |  {case_type}"):
                col_l, col_r = st.columns([3, 2])
                with col_l:
                    st.markdown('<div class="section-header">Case Summary</div>', unsafe_allow_html=True)
                    st.markdown(f"""
                    <div class="info-item"><div class="info-label">Client</div><div class="info-value">{client}</div></div>
                    <div class="info-item"><div class="info-label">Lawyer</div><div class="info-value">{created_by}</div></div>
                    <div class="info-item"><div class="info-label">Location</div><div class="info-value">{city}, {province}</div></div>
                    <div class="info-item"><div class="info-label">Case Type</div><div class="info-value">{case_type}</div></div>
                    """, unsafe_allow_html=True)
                with col_r:
                    st.markdown('<div class="section-header">Final Verdict</div>', unsafe_allow_html=True)
                    st.markdown(f"""
                    <div class="verdict-card">
                        <div class="verdict-label">&#9878; Ruling</div>
                        <div class="verdict-text">{final_ruling}</div>
                    </div>
                    """, unsafe_allow_html=True)
            continue

        # ── Active case view ─────────────────────────────────────
        has_args = arguments and arguments.strip()
        status_label = "Ruling Submitted" if final_ruling else ("Ready for Ruling" if has_args else "Awaiting Arguments")
        status_cls   = "ruled" if final_ruling else ("updated" if has_args else "pending")

        with st.expander(f"#{cid}  —  {client}  |  {case_type}  |  {city}, {province}"):
            col_main, col_side = st.columns([3, 2], gap="large")

            with col_main:
                st.markdown('<div class="section-header">Facts of the Case</div>', unsafe_allow_html=True)
                st.markdown(f'<div class="facts-box">{facts[:600] + ("..." if len(facts) > 600 else "")}</div>', unsafe_allow_html=True)

                if has_args:
                    st.markdown('<div class="section-header">Lawyer\'s Arguments</div>', unsafe_allow_html=True)
                    st.markdown(f'<div class="facts-box">{arguments}</div>', unsafe_allow_html=True)
                else:
                    st.warning("Awaiting lawyer arguments before a ruling can be issued.")

            with col_side:
                # Case meta
                st.markdown(f"""
                <div class="action-panel">
                    <div class="action-panel-title">Case Details</div>
                    <div class="info-item"><div class="info-label">Case ID</div><div class="info-value">{cid}</div></div>
                    <div class="info-item"><div class="info-label">Lawyer</div><div class="info-value">{created_by}</div></div>
                    <div class="info-item"><div class="info-label">Status</div><div class="info-value"><span class="case-tag {status_cls}">{status_label}</span></div></div>
                </div>
                """, unsafe_allow_html=True)

                # AI ruling card
                if has_args and ai_ruling:
                    st.markdown(f"""
                    <div class="ai-card">
                        <div class="ai-card-label">&#129302; AI Recommendation</div>
                        <div class="ai-card-text">{ai_ruling}</div>
                    </div>
                    """, unsafe_allow_html=True)

                # Verdict submission
                if not final_ruling and has_args:
                    st.markdown('<div class="action-panel"><div class="action-panel-title">Submit Ruling</div>', unsafe_allow_html=True)
                    judge_choice = st.radio(
                        "Ruling source:",
                        ["Accept AI Ruling", "Override with My Own"],
                        key=f"{cid}_choice"
                    )
                    custom_ruling = (
                        ai_ruling if judge_choice == "Accept AI Ruling"
                        else st.text_area("Enter your ruling:", key=f"{cid}_text", height=120)
                    )
                    if st.button(f"Submit Ruling", key=f"{cid}_submit"):
                        with sqlite3.connect(DB_PATH, timeout=10) as conn2:
                            cursor2 = conn2.cursor()
                            cursor2.execute(
                                "UPDATE cases SET final_ruling=? WHERE case_id=?",
                                (custom_ruling, cid)
                            )
                            conn2.commit()
                        st.success("Ruling submitted successfully.")
                    st.markdown('</div>', unsafe_allow_html=True)

                elif final_ruling:
                    st.markdown(f"""
                    <div class="verdict-card">
                        <div class="verdict-label">&#9878; Ruling Submitted</div>
                        <div class="verdict-text">{final_ruling}</div>
                    </div>
                    """, unsafe_allow_html=True)
