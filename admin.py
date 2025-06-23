import streamlit as st
import sqlite3
import os
import uuid
from db import DB_PATH

UPLOAD_FOLDER = "uploaded_files"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def admin_dashboard():
    # Top bar with Logout button on the right
    st.markdown(
        """
        <style>
        .top-right-button {
            position: fixed;
            top: 10px;
            right: 20px;
            z-index: 1000;
        }
        </style>
        """,
        unsafe_allow_html=True
    )
    if st.button("Logout", key="logout_admin", help="Logout", args=None):
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.experimental_rerun()
    st.markdown('<div class="decorative-line"></div>', unsafe_allow_html=True)
    st.title("🛠️ Admin Dashboard - Add New Case")

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM users WHERE role='Lawyer'")
        lawyers = [row[0] for row in cursor.fetchall()]
        cursor.execute("SELECT username FROM users WHERE role='Judge'")
        judges = [row[0] for row in cursor.fetchall()]

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

    if st.button("Add Case"):
        if not client or not facts or not assigned_lawyer or not assigned_judge:
            st.error("Please fill all required fields and assign both lawyer and judge.")
        else:
            case_id = str(uuid.uuid4())[:8]
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO cases 
                    (case_id, client, case_type, city, province, facts, arguments, ai_ruling, final_ruling, created_by, assigned_judge, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                """, (case_id, client, case_type, city, province, facts, "", "", None, assigned_lawyer, assigned_judge))
                conn.commit()

            # Save uploaded files with unique filenames
            if uploaded_files:
                for uploaded_file in uploaded_files:
                    file_path = os.path.join(UPLOAD_FOLDER, f"{case_id}_{uploaded_file.name}")
                    with open(file_path, "wb") as f:
                        f.write(uploaded_file.getbuffer())
                st.success(f"Uploaded {len(uploaded_files)} file(s) and case created successfully!")
            else:
                st.success("Case created successfully (no files uploaded).")
