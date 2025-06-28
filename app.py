import streamlit as st

# 🚨 This must come immediately after importing streamlit and before anything else!

import sqlite3
from db import init_db, seed_users, DB_PATH
from login import login
from lawyer import lawyer_dashboard
from judge import judge_dashboard
from admin import admin_dashboard

# ✅ Initialize DB
init_db()
seed_users()

st.set_page_config(page_title="Legal AI Platform", layout="wide")

# ✅ Load external CSS
with open("style.css") as f:
    st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

# ✅ Header that stays visible
st.markdown("""
<div class="header">
    AI Legal Assistant
</div>
""", unsafe_allow_html=True)




# ✅ Routing logic
if "user" not in st.session_state:
    login()
elif st.session_state.role == "Lawyer":
    lawyer_dashboard()
elif st.session_state.role == "Judge":
    judge_dashboard()
elif st.session_state.role == "Admin":
    admin_dashboard()
