import streamlit as st
import sqlite3
from db import DB_PATH

def judge_dashboard():
    if "view" not in st.session_state:
        st.session_state.view = "Dashboard"

    # Top-right Logout Button
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

    if "logout" in st.session_state or st.session_state.get("logout_clicked", False):
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.experimental_rerun()

    if st.session_state.view == "Dashboard":
        st.title("⚖️ Judge Dashboard")
        st.markdown('<div class="decorative-line"></div>', unsafe_allow_html=True)

        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("New Cases"):
                st.session_state.view = "New Cases"
                st.rerun()
        with col2:
            if st.button("Ongoing Cases"):
                st.session_state.view = "Ongoing Cases"
                st.rerun()
        with col3:
            if st.button("Personal Case Archive"):
                st.session_state.view = "Personal Case Archive"
                st.rerun()
        return

    st.sidebar.markdown("### Judge Navigation")
    if st.sidebar.button("Back to Dashboard"):
        st.session_state.view = "Dashboard"
        st.rerun()

    options = ["New Cases", "Ongoing Cases", "Personal Case Archive"]
    choice = st.sidebar.radio("Go to:", options, index=options.index(st.session_state.view))
    if choice != st.session_state.view:
        st.session_state.view = choice
        st.rerun()

    with sqlite3.connect(DB_PATH, timeout=10) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM cases")
        cases = cursor.fetchall()

    if st.session_state.view == "New Cases":
        cases = [c for c in cases if not c[8]]
    elif st.session_state.view == "Ongoing Cases":
        cases = [c for c in cases if not c[8] and c[6]]
    elif st.session_state.view == "Personal Case Archive":
        cases = [c for c in cases if c[8] and c[12] == 1]  # lawyer_accepted = 1

        

    st.markdown(
    '<div class="custom-info-box">No cases found.</div>',
    unsafe_allow_html=True
)

    for case in cases:
        (cid, client, case_type, city, province, facts, arguments, ai_ruling,
         final_ruling, created_by, assigned_judge, created_at, lawyer_accepted) = case

        if st.session_state.view == "Personal Case Archive":
            with st.expander(f"Case ID: {cid} | Defendant: {client}"):
                st.write(f"**Lawyer:** {created_by}")
                st.write(f"**Final Verdict:** {final_ruling}")
        else:
            with st.expander(f"Case ID: {cid} | Client: {client}"):
                st.write(f"**Location:** {city}, {province}")
                st.write(f"**Type:** {case_type}")
                st.code(facts[:300] + ("..." if len(facts) > 300 else ""))
                st.write("**Arguments:**")
                st.write(arguments)

                if arguments.strip() == "":
                    st.warning("Awaiting lawyer arguments before AI ruling can be shown.")
                else:
                    st.markdown(f"<div class='ai-ruling'>AI Suggests: {ai_ruling}</div>", unsafe_allow_html=True)

                if not final_ruling:
                    judge_choice = st.radio(
                        f"Judge's Ruling for {cid}",
                        ["Accept AI Ruling", "Override with My Own"],
                        key=f"{cid}_choice"
                    )
                    custom_ruling = (
                        ai_ruling if judge_choice == "Accept AI Ruling"
                        else st.text_area("Your Ruling", key=f"{cid}_text")
                    )

                    if st.button(f"Submit Ruling for {cid}", key=f"{cid}_submit"):
                        with sqlite3.connect(DB_PATH, timeout=10) as conn2:
                            cursor2 = conn2.cursor()
                            cursor2.execute(
                                "UPDATE cases SET final_ruling=? WHERE case_id=?",
                                (custom_ruling, cid)
                            )
                            conn2.commit()
                        st.success("Ruling submitted.")
                else:
                    st.success(f"Final Ruling Already Submitted:\n{final_ruling}")
