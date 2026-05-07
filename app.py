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

st.set_page_config(page_title="Resolve AI — Legal Intelligence Platform", layout="wide", page_icon="⚖️")

# ✅ Google Fonts
st.markdown(
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">',
    unsafe_allow_html=True
)

# ✅ Load external CSS
with open("style.css", encoding="utf-8") as f:
    st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

# ✅ Header
_user_badge = ""
if "user" in st.session_state:
    _role_icon = {"Lawyer": "👩‍⚖️", "Judge": "⚖️", "Admin": "🛠️"}.get(st.session_state.role, "👤")
    _user_badge = f'<span class="header-user-badge">{_role_icon} {st.session_state.user}</span>'

st.markdown(f"""
<div class="app-header">
    <div class="app-header-left">
        <div class="app-header-logo">⚖️ &nbsp;Resolve<span class="accent">AI</span></div>
        <div class="app-header-divider"></div>
        <div class="app-header-subtitle">Legal Intelligence Platform</div>
    </div>
    {_user_badge}
</div>
<div class="page-content"></div>
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
