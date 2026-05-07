import streamlit as st
import sqlite3
import os
import uuid
from db import DB_PATH

UPLOAD_FOLDER = "uploaded_files"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def admin_dashboard():
    # Logout — fixed top-right
    st.markdown('<div class="logout-btn-container">', unsafe_allow_html=True)
    if st.button("Logout", key="logout_button"):
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.experimental_rerun()
    st.markdown('</div>', unsafe_allow_html=True)

    # ── Page header ─────────────────────────────────────────────
    st.markdown(f"""
    <div class="page-title-section">
        <div class="role-badge">&#128295; Admin Portal</div>
        <h1>Create New Case</h1>
        <p>Logged in as <strong>{st.session_state.get('user', 'unknown')}</strong> &nbsp;&middot;&nbsp; Fill in all sections below to open a new case.</p>
    </div>
    """, unsafe_allow_html=True)
    st.markdown('<div class="decorative-line"></div>', unsafe_allow_html=True)

    # ── Load lawyers and judges ──────────────────────────────────
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM users WHERE role='Lawyer'")
        lawyers = [row[0] for row in cursor.fetchall()]
        cursor.execute("SELECT username FROM users WHERE role='Judge'")
        judges = [row[0] for row in cursor.fetchall()]

    # ══════════════════════════════════════════════════════════════
    #  SECTION 1 — Client Information
    # ══════════════════════════════════════════════════════════════
    st.markdown('<div class="form-section"><div class="form-section-title">&#128100; Client Information</div>', unsafe_allow_html=True)
    col1, col2 = st.columns(2)
    with col1:
        client = st.text_input("Client Full Name", placeholder="e.g. John Smith")
        city   = st.text_input("City", placeholder="e.g. Toronto")
    with col2:
        case_type = st.selectbox("Case Type", ["Traffic Court", "Housing Court", "Other"])
        province  = st.text_input("Province", placeholder="e.g. Ontario")
    st.markdown('</div>', unsafe_allow_html=True)

    # ══════════════════════════════════════════════════════════════
    #  SECTION 2 — Case Facts
    # ══════════════════════════════════════════════════════════════
    st.markdown('<div class="form-section"><div class="form-section-title">&#128196; Facts of the Case</div>', unsafe_allow_html=True)
    facts = st.text_area(
        "Describe the facts of the case in detail:",
        height=180,
        placeholder="Provide a complete, factual account of the case circumstances..."
    )
    st.markdown('</div>', unsafe_allow_html=True)

    # ══════════════════════════════════════════════════════════════
    #  SECTION 3 — Case Assignment
    # ══════════════════════════════════════════════════════════════
    st.markdown('<div class="form-section"><div class="form-section-title">&#128101; Case Assignment</div>', unsafe_allow_html=True)
    col3, col4 = st.columns(2)
    with col3:
        assigned_lawyer = st.selectbox("Assign Lawyer", lawyers)
    with col4:
        assigned_judge = st.selectbox("Assign Judge", judges)
    st.markdown('</div>', unsafe_allow_html=True)

    # ══════════════════════════════════════════════════════════════
    #  SECTION 4 — Supporting Documents
    # ══════════════════════════════════════════════════════════════
    st.markdown('<div class="form-section"><div class="form-section-title">&#128193; Supporting Documents</div>', unsafe_allow_html=True)
    uploaded_files = st.file_uploader(
        "Upload related case files (PDF, DOCX, images)",
        accept_multiple_files=True,
        type=["pdf", "docx", "doc", "png", "jpg", "jpeg"]
    )
    st.markdown('</div>', unsafe_allow_html=True)

    # ══════════════════════════════════════════════════════════════
    #  SUBMIT
    # ══════════════════════════════════════════════════════════════
    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("&#10010; Open Case", use_container_width=True):
        if not client or not facts or not assigned_lawyer or not assigned_judge:
            st.error("Please fill in all required fields before submitting.")
        else:
            case_id = str(uuid.uuid4())[:8]
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO cases
                    (case_id, client, case_type, city, province, facts, arguments, ai_ruling, final_ruling, created_by, assigned_judge, created_at, lawyer_accepted)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
                """, (case_id, client, case_type, city, province, facts, "", "", None, assigned_lawyer, assigned_judge))
                conn.commit()

            if uploaded_files:
                for uploaded_file in uploaded_files:
                    file_path = os.path.join(UPLOAD_FOLDER, f"{case_id}_{uploaded_file.name}")
                    with open(file_path, "wb") as f:
                        f.write(uploaded_file.getbuffer())
                st.success(f"Case **{case_id}** created successfully with {len(uploaded_files)} document(s) uploaded.")
            else:
                st.success(f"Case **{case_id}** created successfully.")
