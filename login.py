import streamlit as st
import sqlite3
from db import DB_PATH

def login():
    st.title("🔐 Legal AI Platform Login")
    username = st.text_input("Username")
    password = st.text_input("Password", type="password")
    if st.button("Login"):
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
                st.error("Invalid credentials")
