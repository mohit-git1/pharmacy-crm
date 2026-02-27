from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, get_connection
from models import MedicineCreate, MedicineUpdate, StatusUpdate, SaleCreate
from datetime import date

app = FastAPI(title="Pharmacy CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


def row_to_dict(row):
    return dict(row) if row else None


def compute_status(quantity, expiry_date):
    if quantity == 0:
        return "Out of Stock"
    if expiry_date and expiry_date < date.today().isoformat():
        return "Expired"
    if quantity <= 10:
        return "Low Stock"
    return "Active"


@app.get("/api/dashboard/summary")
def dashboard_summary():
    conn = get_connection()
    cur = conn.cursor()
    today = date.today().isoformat()

    row = cur.execute(
        "SELECT COALESCE(SUM(total_amount), 0) AS today_sales, COALESCE(SUM(items_count), 0) AS items_sold_today FROM sales WHERE DATE(created_at) = ?",
        (today,),
    ).fetchone()

    low_stock = cur.execute(
        "SELECT COUNT(*) FROM medicines WHERE status = 'Low Stock'"
    ).fetchone()[0]

    pending = cur.execute(
        "SELECT COUNT(*) AS cnt, COALESCE(SUM(po.quantity * m.cost_price), 0) AS val FROM purchase_orders po LEFT JOIN medicines m ON po.medicine_id = m.id WHERE po.status = 'Pending'"
    ).fetchone()

    conn.close()
    return {
        "today_sales": row["today_sales"],
        "items_sold_today": row["items_sold_today"],
        "low_stock_count": low_stock,
        "purchase_orders_pending": pending["cnt"],
        "purchase_orders_total_value": pending["val"],
    }


@app.get("/api/sales/recent")
def recent_sales():
    conn = get_connection()
    rows = conn.execute(
        "SELECT invoice_no, patient_name, items_count, total_amount, payment_method, status, created_at FROM sales ORDER BY created_at DESC LIMIT 20"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/inventory")
def list_inventory(
    search: str = Query(default="", alias="search"),
    status: str = Query(default="", alias="status"),
    category: str = Query(default="", alias="category"),
):
    conn = get_connection()
    query = "SELECT id, name, generic_name, category, batch_no, expiry_date, quantity, cost_price, mrp, supplier, status FROM medicines WHERE 1=1"
    params = []

    if search:
        query += " AND name LIKE ?"
        params.append(f"%{search}%")
    if status:
        query += " AND status = ?"
        params.append(status)
    if category:
        query += " AND category = ?"
        params.append(category)

    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/inventory/summary")
def inventory_summary():
    conn = get_connection()
    cur = conn.cursor()

    total = cur.execute("SELECT COUNT(*) FROM medicines").fetchone()[0]
    active = cur.execute("SELECT COUNT(*) FROM medicines WHERE status = 'Active'").fetchone()[0]
    low = cur.execute("SELECT COUNT(*) FROM medicines WHERE status = 'Low Stock'").fetchone()[0]
    value = cur.execute("SELECT COALESCE(SUM(quantity * mrp), 0) FROM medicines").fetchone()[0]

    conn.close()
    return {
        "total_items": total,
        "active_stock": active,
        "low_stock": low,
        "total_value": value,
    }


@app.post("/api/inventory", status_code=201)
def create_medicine(med: MedicineCreate):
    conn = get_connection()
    cur = conn.cursor()

    status = compute_status(med.quantity, med.expiry_date)

    cur.execute(
        "INSERT INTO medicines (name, generic_name, category, batch_no, expiry_date, quantity, cost_price, mrp, supplier, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (med.name, med.generic_name, med.category, med.batch_no, med.expiry_date, med.quantity, med.cost_price, med.mrp, med.supplier, status),
    )
    conn.commit()
    row = cur.execute("SELECT * FROM medicines WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/inventory/{medicine_id}")
def update_medicine(medicine_id: int, med: MedicineUpdate):
    conn = get_connection()
    cur = conn.cursor()

    existing = cur.execute("SELECT * FROM medicines WHERE id = ?", (medicine_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Medicine not found")

    existing = dict(existing)
    updates = med.model_dump(exclude_unset=True)
    for key, val in updates.items():
        existing[key] = val

    status = compute_status(existing["quantity"], existing["expiry_date"])

    cur.execute(
        "UPDATE medicines SET name=?, generic_name=?, category=?, batch_no=?, expiry_date=?, quantity=?, cost_price=?, mrp=?, supplier=?, status=? WHERE id=?",
        (existing["name"], existing["generic_name"], existing["category"], existing["batch_no"], existing["expiry_date"], existing["quantity"], existing["cost_price"], existing["mrp"], existing["supplier"], status, medicine_id),
    )
    conn.commit()
    row = cur.execute("SELECT id, name, generic_name, category, batch_no, expiry_date, quantity, cost_price, mrp, supplier, status FROM medicines WHERE id = ?", (medicine_id,)).fetchone()
    conn.close()
    return dict(row)


@app.patch("/api/inventory/{medicine_id}/status")
def patch_status(medicine_id: int, body: StatusUpdate):
    conn = get_connection()
    cur = conn.cursor()

    existing = cur.execute("SELECT id FROM medicines WHERE id = ?", (medicine_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Medicine not found")

    cur.execute("UPDATE medicines SET status = ? WHERE id = ?", (body.status, medicine_id))
    conn.commit()
    conn.close()
    return {"id": medicine_id, "status": body.status}


@app.delete("/api/inventory/{medicine_id}")
def delete_medicine(medicine_id: int):
    conn = get_connection()
    cur = conn.cursor()

    existing = cur.execute("SELECT id FROM medicines WHERE id = ?", (medicine_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Medicine not found")

    cur.execute("DELETE FROM medicines WHERE id = ?", (medicine_id,))
    conn.commit()
    conn.close()
    return {"message": "Medicine deleted", "id": medicine_id}


@app.post("/api/sales", status_code=201)
def create_sale(sale: SaleCreate):
    conn = get_connection()
    cur = conn.cursor()

    # Validate stock
    for item in sale.items:
        med = cur.execute("SELECT id, name, quantity FROM medicines WHERE id = ?", (item.medicine_id,)).fetchone()
        if not med:
            conn.close()
            raise HTTPException(status_code=404, detail=f"Medicine ID {item.medicine_id} not found")
        if med["quantity"] < item.quantity:
            conn.close()
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {med['name']}. Available: {med['quantity']}")

    # Generate invoice number
    today = date.today().isoformat().replace("-", "")
    count = cur.execute("SELECT COUNT(*) FROM sales WHERE invoice_no LIKE ?", (f"INV-{today}-%",)).fetchone()[0]
    invoice_no = f"INV-{today}-{count + 1:03d}"

    items_count = sum(item.quantity for item in sale.items)
    total_amount = sum(item.quantity * item.price for item in sale.items)

    cur.execute(
        "INSERT INTO sales (invoice_no, patient_name, items_count, total_amount, payment_method, status) VALUES (?, ?, ?, ?, ?, ?)",
        (invoice_no, sale.patient_name, items_count, total_amount, sale.payment_method, "Completed"),
    )

    # Decrement stock and recompute status
    for item in sale.items:
        cur.execute("UPDATE medicines SET quantity = quantity - ? WHERE id = ?", (item.quantity, item.medicine_id))
        med = cur.execute("SELECT quantity, expiry_date FROM medicines WHERE id = ?", (item.medicine_id,)).fetchone()
        new_status = compute_status(med["quantity"], med["expiry_date"])
        cur.execute("UPDATE medicines SET status = ? WHERE id = ?", (new_status, item.medicine_id))

    conn.commit()
    conn.close()
    return {"invoice_no": invoice_no, "patient_name": sale.patient_name, "items_count": items_count, "total_amount": total_amount}
