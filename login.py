import streamlit as st
import sqlite3
from db import DB_PATH

def login():
    # Login-specific layout overrides
    st.markdown("""
    <style>
    [data-testid="stSidebar"] { display: none !important; }
    .block-container {
        max-width: 500px !important;
        padding-top: 90px !important;
        margin: 0 auto !important;
    }
    </style>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="login-card">
        <span class="login-icon">⚖️</span>
        <h1 class="login-brand">Resolve<span class="accent">AI</span></h1>
        <p class="login-tagline">Legal Intelligence Platform</p>
        <div class="login-strip"></div>
        <div class="login-divider"></div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown('<div class="login-wrap">', unsafe_allow_html=True)
    username = st.text_input("Username", placeholder="Enter your username")
    password = st.text_input("Password", type="password", placeholder="Enter your password")

    if st.button("Sign In →", use_container_width=True):
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT role FROM users WHERE username=? AND password=?", (username, password))
            result = cursor.fetchone()

            if result:
                st.session_state.user = username
                st.session_state.role = result[0]
                st.session_state.view = "Dashboard"
                st.experimental_rerun()
            else:
                st.error("Invalid credentials. Please check your username and password.")

    st.markdown('</div>', unsafe_allow_html=True)
    st.markdown("""
    <div style="text-align:center; margin-top:24px; color:#94a3b8; font-size:12px; letter-spacing:0.3px;">
        © 2025 Resolve AI &nbsp;·&nbsp; Legal Intelligence Platform
    </div>
    """, unsafe_allow_html=True)
