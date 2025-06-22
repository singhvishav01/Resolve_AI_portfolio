import streamlit as st
from db import init_db, seed_users
from login import login
from lawyer import lawyer_dashboard
from judge import judge_dashboard

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

if "user" not in st.session_state:
    login()
elif st.session_state.role == "Lawyer":
    lawyer_dashboard()
elif st.session_state.role == "Judge":
    judge_dashboard()
