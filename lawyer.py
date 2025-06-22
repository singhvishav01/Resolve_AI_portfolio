import streamlit as st
import sqlite3
import uuid
from datetime import datetime
from ai_access import ai_generate_ruling
from db import DB_PATH

def lawyer_dashboard():
    if "view" not in st.session_state:
        st.session_state.view = "Dashboard"

    if st.session_state.view == "Dashboard":
        st.title("👩‍⚖️ Lawyer Dashboard")
        st.markdown('<div class="decorative-line"></div>', unsafe_allow_html=True)
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            if st.button("File New Case"):
                st.session_state.view = "File New Case"
                st.experimental_rerun()
        with col2:
            if st.button("Ongoing Cases"):
                st.session_state.view = "Ongoing Cases"
                st.experimental_rerun()
        with col3:
            if st.button("Cases with Ruling Completed"):
                st.session_state.view = "Cases with Ruling Completed"
                st.experimental_rerun()
        with col4:
            if st.button("Personal Case Archive"):
                st.session_state.view = "Personal Case Archive"
                st.experimental_rerun()

        if st.button("Logout"):
            for key in list(st.session_state.keys()):
                del st.session_state[key]
            st.experimental_rerun()
        return

    st.sidebar.markdown("### Lawyer Navigation")
    if st.sidebar.button("Back to Dashboard"):
        st.session_state.view = "Dashboard"
        st.experimental_rerun()

    options = ["File New Case", "Ongoing Cases", "Cases with Ruling Completed", "Personal Case Archive"]
    choice = st.sidebar.radio("Go to:", options, index=options.index(st.session_state.view) if st.session_state.view in options else 0)
    if choice != st.session_state.view:
        st.session_state.view = choice
        st.experimental_rerun()

    if st.session_state.view == "File New Case":
        st.title("File New Case")
        client_name = st.text_input("Client Name")
        city = st.text_input("City")
        province = st.selectbox("Province", ["Ontario", "Quebec", "Alberta", "Other"])
        uploaded_fact_file = st.file_uploader("Upload facts (e.g., ticket or document)")

        if st.button("Submit Case"):
            if not client_name or not uploaded_fact_file:
                st.error("Client name and facts file are required.")
            else:
                try:
                    fact_content = uploaded_fact_file.read().decode("utf-8", errors="ignore")
                except Exception:
                    fact_content = "[Non-text file uploaded]"

                case_id = str(uuid.uuid4())[:8]
                case_type = "General"
                ai_ruling = ai_generate_ruling(fact_content)
                created_at = datetime.now().isoformat()

                with sqlite3.connect(DB_PATH) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT INTO cases VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (case_id, client_name, case_type, city, province, fact_content, "", ai_ruling, None, st.session_state.user, created_at))
                    conn.commit()
                st.success(f"Case submitted. Case ID: {case_id}")

    elif st.session_state.view in ["Ongoing Cases", "Cases with Ruling Completed", "Personal Case Archive"]:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            query = "SELECT case_id, client, final_ruling, facts, arguments FROM cases WHERE created_by=?"
            cursor.execute(query, (st.session_state.user,))
            rows = cursor.fetchall()

        if st.session_state.view == "Ongoing Cases":
            rows = [r for r in rows if not r[2]]
        elif st.session_state.view == "Cases with Ruling Completed":
            rows = [r for r in rows if r[2]]
        elif st.session_state.view == "Personal Case Archive":
            rows = [r for r in rows if r[2]]

        if not rows:
            st.info("No cases found.")
            return

        case_ids = [r[0] for r in rows]
        selected_case = st.selectbox("Select a case to view or add arguments", case_ids)

        case = next((r for r in rows if r[0] == selected_case), None)
        if case:
            st.markdown(f"### Case ID: {case[0]} | Client: {case[1]} | Status: {'Ruled' if case[2] else 'Pending'}")
            st.code(case[3][:300] + ("..." if len(case[3]) > 300 else ""))
            new_arguments = st.text_area("Add or update Legal Arguments", value=case[4])
            if st.button("Update Arguments"):
                with sqlite3.connect(DB_PATH) as conn:
                    cursor = conn.cursor()
                    cursor.execute("UPDATE cases SET arguments=? WHERE case_id=?", (new_arguments, selected_case))
                    conn.commit()
                st.success("Arguments updated.")
            if case[2]:
                st.markdown("### Final Ruling")
                st.write(case[2])

                appeal_choice = st.radio("Do you want to accept the ruling or appeal?", ["Accept", "Appeal"], key=case[0] + "_appeal_choice")

                if appeal_choice == "Appeal":
                    appeal_reason = st.text_area("Enter reason for appeal", key=case[0] + "_appeal_reason")
                    if st.button("Submit Appeal", key=case[0] + "_submit_appeal"):
                        st.success("Appeal submitted. The case will be reviewed.")
