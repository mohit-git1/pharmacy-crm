# Pharmacy CRM

A pharmacy management web application built with **FastAPI** (Python) and **React**.

## How to Run

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
The SQLite database (`pharmacy.db`) is created automatically on first run with seed data.

### Frontend

```bash
cd frontend
npm install
npm start
```

The app will open at `http://localhost:3000`.

---

## API Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/dashboard/summary` | Dashboard statistics | — | `{ today_sales, items_sold_today, low_stock_count, purchase_orders_pending, purchase_orders_total_value }` |
| GET | `/api/sales/recent` | Recent sales list | — | `[{ invoice_no, patient_name, items_count, total_amount, payment_method, status, created_at }]` |
| GET | `/api/inventory` | List medicines (filterable) | Query: `search`, `status`, `category` | `[{ id, name, generic_name, category, batch_no, expiry_date, quantity, cost_price, mrp, supplier, status }]` |
| GET | `/api/inventory/summary` | Inventory statistics | — | `{ total_items, active_stock, low_stock, total_value }` |
| POST | `/api/inventory` | Add a new medicine | `{ name*, generic_name, category, batch_no, expiry_date, quantity, cost_price, mrp*, supplier }` | Created medicine object (201) |
| PUT | `/api/inventory/{id}` | Update a medicine | Same as POST (all optional) | Updated medicine object |
| PATCH | `/api/inventory/{id}/status` | Change medicine status | `{ status }` | `{ id, status }` |

---

## Data Consistency — PUT `/api/inventory/{id}`

The PUT endpoint ensures data consistency by automatically recalculating the medicine's status after every update. When a medicine is updated, the server evaluates three conditions in order: if the quantity is zero, the status is set to "Out of Stock"; if the expiry date is earlier than the current date, the status becomes "Expired"; if the quantity is 10 or fewer, the status is set to "Low Stock"; otherwise, the status defaults to "Active". This means the status field always reflects the actual state of the medicine, regardless of what was previously stored, preventing stale or contradictory data from persisting in the database.
