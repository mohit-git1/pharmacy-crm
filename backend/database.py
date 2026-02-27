import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "pharmacy.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            generic_name TEXT,
            category TEXT,
            batch_no TEXT,
            expiry_date TEXT,
            quantity INTEGER DEFAULT 0,
            cost_price REAL,
            mrp REAL,
            supplier TEXT,
            status TEXT DEFAULT 'Active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_no TEXT UNIQUE,
            patient_name TEXT,
            items_count INTEGER,
            total_amount REAL,
            payment_method TEXT,
            status TEXT DEFAULT 'Completed',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS purchase_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medicine_id INTEGER,
            quantity INTEGER,
            status TEXT DEFAULT 'Pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    if cur.execute("SELECT COUNT(*) FROM medicines").fetchone()[0] == 0:
        medicines = [
            ("Paracetamol 500mg", "Acetaminophen", "Analgesic", "BT-2025-001", "2026-12-31", 120, 8.50, 15.00, "Sun Pharma"),
            ("Amoxicillin 250mg", "Amoxicillin", "Antibiotic", "BT-2025-002", "2026-06-30", 45, 22.00, 38.00, "Cipla Ltd"),
            ("Cetirizine 10mg", "Cetirizine HCl", "Antihistamine", "BT-2025-003", "2027-03-15", 200, 5.00, 12.00, "Dr. Reddy's"),
            ("Metformin 500mg", "Metformin HCl", "Antidiabetic", "BT-2025-004", "2026-09-20", 8, 14.00, 25.00, "Lupin Ltd"),
            ("Omeprazole 20mg", "Omeprazole", "Antacid", "BT-2025-005", "2025-01-15", 0, 18.00, 32.00, "Torrent Pharma"),
            ("Azithromycin 500mg", "Azithromycin", "Antibiotic", "BT-2025-006", "2026-11-30", 75, 45.00, 72.00, "Zydus Cadila"),
        ]
        cur.executemany(
            "INSERT INTO medicines (name, generic_name, category, batch_no, expiry_date, quantity, cost_price, mrp, supplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            medicines,
        )
        cur.execute("UPDATE medicines SET status = 'Low Stock' WHERE quantity > 0 AND quantity <= 10")
        cur.execute("UPDATE medicines SET status = 'Out of Stock' WHERE quantity = 0")
        cur.execute("UPDATE medicines SET status = 'Expired' WHERE expiry_date < date('now')")

    if cur.execute("SELECT COUNT(*) FROM sales").fetchone()[0] == 0:
        sales = [
            ("INV-20260227-001", "Rajesh Kumar", 3, 1250.00, "Cash", "Completed"),
            ("INV-20260227-002", "Priya Sharma", 2, 860.00, "UPI", "Completed"),
            ("INV-20260227-003", "Amit Patel", 5, 2340.00, "Card", "Completed"),
        ]
        cur.executemany(
            "INSERT INTO sales (invoice_no, patient_name, items_count, total_amount, payment_method, status) VALUES (?, ?, ?, ?, ?, ?)",
            sales,
        )

    if cur.execute("SELECT COUNT(*) FROM purchase_orders").fetchone()[0] == 0:
        cur.execute("INSERT INTO purchase_orders (medicine_id, quantity, status) VALUES (4, 100, 'Pending')")
        cur.execute("INSERT INTO purchase_orders (medicine_id, quantity, status) VALUES (5, 50, 'Pending')")

    conn.commit()
    conn.close()
