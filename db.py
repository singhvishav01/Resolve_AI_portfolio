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
    """Ensure default users exist."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, role TEXT)")
        default_users = [
            ("lawyer1", "pass", "Lawyer"),
            ("judge1", "pass", "Judge"),
            ("admin1", "pass", "Admin")
        ]
        for user in default_users:
            cursor.execute("INSERT OR IGNORE INTO users VALUES (?, ?, ?)", user)
        conn.commit()
