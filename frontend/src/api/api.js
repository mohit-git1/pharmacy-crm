import axios from "axios";

const API = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api"
});

export function fetchDashboardSummary() {
    return API.get("/dashboard/summary").then((r) => r.data);
}

export function fetchRecentSales() {
    return API.get("/sales/recent").then((r) => r.data);
}

export function fetchInventory(params = {}) {
    return API.get("/inventory", { params }).then((r) => r.data);
}

export function fetchInventorySummary() {
    return API.get("/inventory/summary").then((r) => r.data);
}

export function createMedicine(data) {
    return API.post("/inventory", data).then((r) => r.data);
}

export function updateMedicine(id, data) {
    return API.put(`/inventory/${id}`, data).then((r) => r.data);
}

export function patchMedicineStatus(id, status) {
    return API.patch(`/inventory/${id}/status`, { status }).then((r) => r.data);
}

export function deleteMedicine(id) {
    return API.delete(`/inventory/${id}`).then((r) => r.data);
}

export function createSale(data) {
    return API.post("/sales", data).then((r) => r.data);
}
