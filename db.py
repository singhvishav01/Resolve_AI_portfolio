import sqlite3

DB_PATH = "cases.db"

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password TEXT,
                role TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cases (
                case_id TEXT PRIMARY KEY,
                client TEXT,
                case_type TEXT,
                city TEXT,
                province TEXT,
                facts TEXT,
                arguments TEXT,
                ai_ruling TEXT,
                final_ruling TEXT,
                created_by TEXT,
                assigned_judge TEXT,
                created_at TEXT,
                lawyer_accepted INTEGER DEFAULT 0
            )
        """)
        conn.commit()


def seed_users():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            users = [
                ("lawyer1", "pass123", "Lawyer"),
                ("judge1", "pass123", "Judge"),
                ("admin", "adminpass", "Admin")
            ]
            cursor.executemany("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", users)
            conn.commit()
