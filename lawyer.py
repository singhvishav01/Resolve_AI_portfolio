import streamlit as st
import sqlite3
from ai_access import ai_generate_ruling  # your AI ruling function
DB_PATH = "cases.db"

def lawyer_dashboard():
    if "view" not in st.session_state:
        st.session_state.view = "Dashboard"

    # Logout button CSS (you can put this once in your app, no need every rerun)
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

    # Place logout button inside a container to apply CSS
    with st.container():
        if st.button("Logout", key="logout_button"):
            for key in list(st.session_state.keys()):
                del st.session_state[key]
            st.experimental_rerun()

    # Main dashboard UI starts here
    if st.session_state.view == "Dashboard":
        st.title("👩‍⚖️ Lawyer Dashboard")
        st.markdown('<div class="decorative-line"></div>', unsafe_allow_html=True)
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("Ongoing Cases"):
                st.session_state.view = "Ongoing Cases"
                st.experimental_rerun()
        with col2:
            if st.button("Cases with Ruling Completed"):
                st.session_state.view = "Cases with Ruling Completed"
                st.experimental_rerun()
        with col3:
            if st.button("Personal Case Archive"):
                st.session_state.view = "Personal Case Archive"
                st.experimental_rerun()
        return

    # Sidebar navigation
    st.sidebar.markdown("### Lawyer Navigation")
    if st.sidebar.button("Back to Dashboard"):
        st.session_state.view = "Dashboard"
        st.experimental_rerun()

    options = ["Ongoing Cases", "Cases with Ruling Completed", "Personal Case Archive"]
    choice = st.sidebar.radio(
        "Go to:", 
        options, 
        index=options.index(st.session_state.view) if st.session_state.view in options else 0
    )
    if choice != st.session_state.view:
        st.session_state.view = choice
        st.experimental_rerun()

    if st.session_state.view in options:
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
                '<div class="custom-info-box">No cases found.</div>',
                unsafe_allow_html=True
            )
            return

        case_ids = [r[0] for r in rows]
        selected_case = st.selectbox("Select a case to view or add arguments", case_ids)

        case = next((r for r in rows if r[0] == selected_case), None)

        if case is not None:
            if st.session_state.view == "Personal Case Archive":
                st.markdown(f"### Case ID: {case[0]}")
                st.write(f"**Client:** {case[1]}")
                st.write(f"**Judge:** {case[5]}")
                st.markdown("### Final Verdict")
                st.write(case[2])
            else:
                st.markdown(f"### Case ID: {case[0]} | Client: {case[1]} | Status: {'Ruled' if case[2] else 'Pending'}")
                st.code(case[3][:300] + ("..." if len(case[3]) > 300 else ""))

                if not case[2]:
                    new_arguments = st.text_area("Add or update Legal Arguments", value=case[4])

                    if st.button("Update Arguments"):
                        if not new_arguments.strip():
                            st.error("Arguments cannot be empty.")
                        else:
                            ai_ruling = ai_generate_ruling(new_arguments)
                            with sqlite3.connect(DB_PATH) as conn:
                                cursor = conn.cursor()
                                cursor.execute(
                                    "UPDATE cases SET arguments=?, ai_ruling=? WHERE case_id=?",
                                    (new_arguments, ai_ruling, selected_case)
                                )
                                conn.commit()
                            st.success("Arguments updated and AI ruling generated.")
                            st.experimental_rerun()

                else:
                    st.text_area("Legal Arguments", value=case[4].replace("[ARCHIVED]", ""), disabled=True)

                if case[2] and not case[4].endswith("[ARCHIVED]"):
                    st.markdown("### Final Ruling")
                    st.write(case[2])

                    appeal_choice = st.radio(
                        "Do you want to accept the ruling or appeal?", 
                        ["Accept", "Appeal"], 
                        key=case[0] + "_appeal_choice"
                    )

                    if st.button("Submit Decision", key=case[0] + "_submit_decision"):
                        with sqlite3.connect(DB_PATH) as conn:
                            cursor = conn.cursor()
                            if appeal_choice == "Accept":
                                archived_args = case[4] + "[ARCHIVED]"
                            cursor.execute(
        "UPDATE cases SET arguments=?, lawyer_accepted=? WHERE case_id=?",
        (archived_args, 1, selected_case)
    )
                            conn.commit()

                            st.success("You accepted the ruling. Case archived.")
                    else:
                                st.success("Appeal submitted. The case will be reviewed.")
        else:
            st.warning("Selected case not found.")

            
