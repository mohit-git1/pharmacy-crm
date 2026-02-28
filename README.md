# Pharmacy CRM

A full-stack pharmacy management application built with **FastAPI** (Python) and **React** (JavaScript).

## Project Structure

```
/backend     → Python REST API (FastAPI + SQLite)
/frontend    → React application (Create React App)
README.md    → Documentation and API contracts
```

---

## Setup & Running

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- API runs at `http://localhost:8000`
- SQLite database (`pharmacy.db`) is auto-created on first run with seed data

### Frontend

```bash
cd frontend
npm install
npm start
```

- App runs at `http://localhost:3000`
- Requires backend to be running on port 8000

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | Python, FastAPI, SQLite, Pydantic   |
| Frontend | React, React Router, Axios          |
| Styling  | Vanilla CSS with CSS variables      |

---

## Database Schema

### medicines

| Column       | Type    | Description                         |
|-------------|---------|-------------------------------------|
| id          | INTEGER | Primary key, auto-increment         |
| name        | TEXT    | Medicine name (required)            |
| generic_name| TEXT    | Generic/chemical name               |
| category    | TEXT    | Category (Analgesic, Antibiotic, etc.) |
| batch_no    | TEXT    | Batch number                        |
| expiry_date | TEXT    | Expiry date (YYYY-MM-DD)            |
| quantity    | INTEGER | Stock quantity                      |
| cost_price  | REAL    | Cost price per unit                 |
| mrp         | REAL    | Maximum retail price                |
| supplier    | TEXT    | Supplier name                       |
| status      | TEXT    | Auto-computed: Active, Low Stock, Expired, Out of Stock |
| created_at  | TEXT    | Timestamp                           |

### sales

| Column         | Type    | Description              |
|---------------|---------|--------------------------|
| id            | INTEGER | Primary key              |
| invoice_no    | TEXT    | Unique invoice number    |
| patient_name  | TEXT    | Patient name             |
| items_count   | INTEGER | Total items in sale      |
| total_amount  | REAL    | Total bill amount        |
| payment_method| TEXT    | Cash / UPI / Card        |
| status        | TEXT    | Completed                |
| created_at    | TEXT    | Timestamp                |

### purchase_orders

| Column      | Type    | Description             |
|------------|---------|-------------------------|
| id         | INTEGER | Primary key             |
| medicine_id| INTEGER | FK to medicines         |
| quantity   | INTEGER | Order quantity          |
| status     | TEXT    | Pending / Completed     |
| created_at | TEXT    | Timestamp               |

---

## API Contracts

### Dashboard

| Method | Endpoint                | Description          |
|--------|------------------------|----------------------|
| GET    | `/api/dashboard/summary` | Dashboard statistics |

**Response:**
```json
{
  "today_sales": 4450,
  "items_sold_today": 10,
  "low_stock_count": 1,
  "purchase_orders_pending": 2,
  "purchase_orders_total_value": 2300
}
```

---

### Sales

| Method | Endpoint            | Description         |
|--------|---------------------|---------------------|
| GET    | `/api/sales/recent` | Recent sales list   |
| POST   | `/api/sales`        | Create a new sale   |

**GET /api/sales/recent — Response:**
```json
[
  {
    "invoice_no": "INV-20260227-001",
    "patient_name": "Rajesh Kumar",
    "items_count": 3,
    "total_amount": 1250.00,
    "payment_method": "Cash",
    "status": "Completed",
    "created_at": "2026-02-27 10:00:00"
  }
]
```

**POST /api/sales — Request Body:**
```json
{
  "patient_name": "John Doe",
  "payment_method": "Cash",
  "items": [
    { "medicine_id": 1, "quantity": 2, "price": 15.00 },
    { "medicine_id": 3, "quantity": 1, "price": 12.00 }
  ]
}
```

**POST /api/sales — Response (201):**
```json
{
  "invoice_no": "INV-20260227-004",
  "patient_name": "John Doe",
  "items_count": 3,
  "total_amount": 42.00
}
```

> This endpoint validates stock availability, generates an invoice number, decrements medicine quantities, and recomputes medicine status automatically.

---

### Inventory

| Method | Endpoint                       | Description              |
|--------|-------------------------------|--------------------------|
| GET    | `/api/inventory`              | List medicines (filterable) |
| GET    | `/api/inventory/summary`      | Inventory statistics     |
| POST   | `/api/inventory`              | Add a new medicine       |
| PUT    | `/api/inventory/{id}`         | Update a medicine        |
| PATCH  | `/api/inventory/{id}/status`  | Change medicine status   |
| DELETE | `/api/inventory/{id}`         | Delete a medicine        |

**GET /api/inventory — Query Parameters:**

| Param    | Type   | Description                     |
|----------|--------|---------------------------------|
| search   | string | Filter by medicine name (LIKE)  |
| status   | string | Filter by status                |
| category | string | Filter by category              |

**GET /api/inventory — Response:**
```json
[
  {
    "id": 1,
    "name": "Paracetamol 500mg",
    "generic_name": "Acetaminophen",
    "category": "Analgesic",
    "batch_no": "BT-2025-001",
    "expiry_date": "2026-12-31",
    "quantity": 120,
    "cost_price": 8.50,
    "mrp": 15.00,
    "supplier": "Sun Pharma",
    "status": "Active"
  }
]
```

**GET /api/inventory/summary — Response:**
```json
{
  "total_items": 6,
  "active_stock": 4,
  "low_stock": 1,
  "total_value": 11510
}
```

**POST /api/inventory — Request Body:**
```json
{
  "name": "Aspirin 75mg",
  "generic_name": "Acetylsalicylic Acid",
  "category": "Analgesic",
  "batch_no": "BT-2025-010",
  "expiry_date": "2027-06-30",
  "quantity": 100,
  "cost_price": 3.50,
  "mrp": 8.00,
  "supplier": "Cipla Ltd"
}
```

**PUT /api/inventory/{id} — Request Body:**
```json
{
  "quantity": 50,
  "mrp": 9.00
}
```
> All fields are optional. Status is auto-recomputed after update.

**PATCH /api/inventory/{id}/status — Request Body:**
```json
{
  "status": "Active"
}
```
> Allowed values: Active, Low Stock, Expired, Out of Stock

**DELETE /api/inventory/{id} — Response:**
```json
{
  "message": "Medicine deleted",
  "id": 1
}
```

---

## Auto Status Logic

The backend automatically computes medicine status on every create/update:

| Condition                    | Status        |
|-----------------------------|---------------|
| quantity == 0               | Out of Stock  |
| expiry_date < today         | Expired       |
| quantity <= 10              | Low Stock     |
| Otherwise                   | Active        |

---

## Frontend Pages

### Dashboard (`/`)
- Summary stat cards (sales, items sold, low stock, purchase orders)
- Make a Sale form with medicine autocomplete and multi-item cart
- Recent sales list

### Inventory (`/inventory`)
- Inventory overview cards
- Complete medicine table with search, filter panel, and sortable columns
- Add / Edit / Delete medicine functionality
- Export to CSV, PDF, DOC
