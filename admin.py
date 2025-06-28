import streamlit as st
import sqlite3
import os
import uuid
from db import DB_PATH

UPLOAD_FOLDER = "uploaded_files"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def admin_dashboard():
    # ✅ Load the logout button in top-right corner
    st.markdown("""
    <style>
    .logout-button {
        position: fixed;
        top: 10px;
        right: 20px;
        z-index: 1000;
    }
    .logout-button button {
        background-color: #4f589b;
        color: white;
        border: none;
        padding: 8px 16px;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
    }
    .logout-button button:hover {
        background-color: #373f78;
    }
    </style>
    """, unsafe_allow_html=True)

    # ✅ Logout Button (top-right)
    logout_container = st.empty()
    with logout_container.container():
        if st.button("Logout", key="logout_button"):
            for key in list(st.session_state.keys()):
                del st.session_state[key]
            st.experimental_rerun()

    # ✅ Dashboard Title
    st.title("🛠️ Admin Dashboard - Add New Case")
    st.markdown('<div class="decorative-line"></div>', unsafe_allow_html=True)

    # ✅ Optional: show who is logged in
    st.info(f"Logged in as: **{st.session_state.get('user', 'unknown')}** (Admin)")

    # ✅ Load Lawyers and Judges from database
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM users WHERE role='Lawyer'")
        lawyers = [row[0] for row in cursor.fetchall()]
        cursor.execute("SELECT username FROM users WHERE role='Judge'")
        judges = [row[0] for row in cursor.fetchall()]

    # ✅ Case Form Fields
    client = st.text_input("Client Name")
    case_type = st.selectbox("Case Type", ["Traffic Court", "Housing Court", "Other"])
    city = st.text_input("City")
    province = st.text_input("Province")
    facts = st.text_area("Facts of the Case")
    assigned_lawyer = st.selectbox("Assign Lawyer", lawyers)
    assigned_judge = st.selectbox("Assign Judge", judges)

    uploaded_files = st.file_uploader(
        "Upload related case files (PDF, DOCX, images etc.)",
        accept_multiple_files=True,
        type=["pdf", "docx", "doc", "png", "jpg", "jpeg"]
    )

    # ✅ Add Case Button
    if st.button("Add Case"):
        if not client or not facts or not assigned_lawyer or not assigned_judge:
            st.error("Please fill all required fields and assign both lawyer and judge.")
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

            # ✅ Save Uploaded Files
            if uploaded_files:
                for uploaded_file in uploaded_files:
                    file_path = os.path.join(UPLOAD_FOLDER, f"{case_id}_{uploaded_file.name}")
                    with open(file_path, "wb") as f:
                        f.write(uploaded_file.getbuffer())
                st.success(f"Case created and {len(uploaded_files)} file(s) uploaded!")
            else:
                st.success("Case created successfully (no files uploaded).")