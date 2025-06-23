import sqlite3
import streamlit as st
from db import init_db, seed_users, DB_PATH
from login import login
from lawyer import lawyer_dashboard
from judge import judge_dashboard
import random
import uuid
from datetime import datetime
from ai_access import ai_generate_ruling

st.set_page_config(page_title="Legal AI Platform", layout="wide")

# Global Styling applied here (you can import from a css file or write inline)
st.markdown("""
<style>
/* Overall page background and font */
body, .main, .block-container {
    background-color: #ffffff !important;
    color: #000000 !important;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
    color: #1a1a1a !important;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

/* Sidebar */
[data-testid="stSidebar"] {
    background-color: #f9f9f9 !important;
    color: #000000 !important;
    font-weight: 600;
}

/* Sidebar text and labels */
[data-testid="stSidebar"] label,
[data-testid="stSidebar"] div,
[data-testid="stSidebar"] span,
[data-testid="stSidebar"] button {
    color: #000000 !important;
    font-weight: 600;
}

/* Labels in main area */
label {
    color: #000000 !important;
    font-weight: 600;
}

/* Text inputs and textareas */
.stTextInput > div > div > input,
.stTextArea > div > textarea,
.stSelectbox > div > div {
    background-color: #ffffff !important;
    color: #000000 !important;
    font-weight: 600;
    border: 1px solid #888888;
    border-radius: 4px;
    padding: 6px 10px;
}

/* Buttons */
div.stButton > button {
    background-color: #004085 !important;
    color: #ffffff !important;
    font-weight: 700;
    padding: 10px 22px;
    border: none;
    border-radius: 6px;
    transition: background-color 0.3s ease;
}
div.stButton > button:hover {
    background-color: #002752 !important;
    cursor: pointer;
}

/* Decorative line */
.decorative-line {
    height: 4px;
    background-color: #004085;
    margin: 20px 0;
    border-radius: 2px;
}

/* Code blocks */
.stCodeBlock pre {
    background-color: #f0f0f0 !important;
    color: #212529 !important;
}

/* Radio buttons and checkboxes labels */
div[role="radiogroup"] label,
div[role="checkbox"] label {
    color: #000000 !important;
    font-weight: 600;
}

/* Remove any default Streamlit link color to black */
a {
    color: #000000 !important;
}

/* Scrollbars for sidebar and main content */
[data-testid="stSidebar"]::-webkit-scrollbar,
.main::-webkit-scrollbar {
    width: 8px;
}
[data-testid="stSidebar"]::-webkit-scrollbar-thumb,
.main::-webkit-scrollbar-thumb {
    background-color: #cccccc;
    border-radius: 4px;
}

/* Fix placeholder text color */
input::placeholder,
textarea::placeholder {
    color: #666666 !important;
    font-style: italic;
}
</style>
""", unsafe_allow_html=True)

# Initialize DB and seed users if not present
init_db()
seed_users()


def generate_random_cases_every_run(lawyer_username="lawyer1", judge_username="judge1", num_cases=5):
    from ai_access import ai_generate_ruling

    with sqlite3.connect(DB_PATH, timeout=10) as conn:
        cursor = conn.cursor()

        dummy_clients = ["John Doe", "Jane Smith", "Alice Johnson", "Bob Brown", "Charlie Davis"]
        dummy_facts_traffic = "The client was allegedly speeding over the limit on a highway."
        dummy_facts_housing = "The client is disputing eviction notice from landlord."
        court_types = ["Traffic Court", "Housing Court"]

        for _ in range(num_cases):
            case_id = str(uuid.uuid4())[:8]
            client = random.choice(dummy_clients)
            case_type = random.choice(court_types)
            city = "Sample City"
            province = "Ontario"
            facts = dummy_facts_traffic if case_type == "Traffic Court" else dummy_facts_housing

            # Simulate the lawyer having added arguments
            arguments = ""

            # Generate AI ruling ONLY if arguments exist
            ai_ruling =""
            final_ruling = None
            created_at = datetime.now().isoformat()

            print(f"AI ruling generated: {ai_ruling}")  # Confirm it in terminal

            cursor.execute("""
    INSERT INTO cases (case_id, client, case_type, city, province, facts, arguments, ai_ruling, final_ruling, created_by, assigned_judge, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (case_id, client, case_type, city, province, facts, "", "", None, lawyer_username, judge_username, created_at))

        conn.commit()

if "cases_generated" not in st.session_state:
    generate_random_cases_every_run("lawyer1", "judge1")
    st.session_state.cases_generated = True

if "user" not in st.session_state:
    login()
elif st.session_state.role == "Lawyer":
    lawyer_dashboard()
elif st.session_state.role == "Judge":
    judge_dashboard()

