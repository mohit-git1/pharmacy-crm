# Pharmacy CRM
## Live Demo

| Service | URL |
|---------|-----|
| Frontend | https://pharmacy-crm-psi.vercel.app/ |
| Backend API | https://pharmacy-crm-1.onrender.com |

## Project Structure
```
/backend     → Python REST API (FastAPI + SQLite)
/frontend    → React application
README.md    → Documentation and API contracts
```

---

## Running the Project Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API runs at `http://localhost:8000`. SQLite database is auto-created with seed data on first run.

### Frontend
```bash
cd frontend
npm install
npm start
```

App runs at `http://localhost:3000`. Backend must be running on port 8000.

---

## REST API Structure

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Today's sales, items sold, low stock count, pending purchase orders |
| GET | `/api/sales/recent` | Recent sales list |

### Inventory

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/api/inventory` | List all medicines. Supports `?search=`, `?status=`, `?category=` | — |
| GET | `/api/inventory/summary` | Total items, active stock, low stock count, total value | — |
| POST | `/api/inventory` | Add a new medicine | `name`, `generic_name`, `category`, `batch_no`, `expiry_date`, `quantity`, `cost_price`, `mrp`, `supplier` |
| PUT | `/api/inventory/{id}` | Update a medicine (all fields optional) | Any subset of POST fields |
| PATCH | `/api/inventory/{id}/status` | Manually override status | `{ "status": "Active" \| "Low Stock" \| "Expired" \| "Out of Stock" }` |

---

## Data Consistency on Update

Every time a medicine is created or updated via `POST /api/inventory` or `PUT /api/inventory/{id}`, 
the backend automatically recomputes its status using this priority order:

1. `quantity == 0` → **Out of Stock**
2. `expiry_date < today` → **Expired**
3. `quantity <= 10` → **Low Stock**
4. Otherwise → **Active**

This logic runs inside a single SQLite transaction, so partial updates never leave 
a medicine in an inconsistent state.