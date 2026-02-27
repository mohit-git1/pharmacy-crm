import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import StatCard from "../components/StatCard";
import MedicineTable from "../components/MedicineTable";
import AddMedicineModal from "../components/AddMedicineModal";
import EditMedicineModal from "../components/EditMedicineModal";
import { fetchDashboardSummary, fetchInventory, fetchInventorySummary, deleteMedicine } from "../api/api";

const EXPORT_COLUMNS = [
    "Medicine Name", "Generic Name", "Category", "Batch No", "Expiry Date",
    "Quantity", "Cost Price", "MRP", "Supplier", "Status",
];
const EXPORT_KEYS = [
    "name", "generic_name", "category", "batch_no", "expiry_date",
    "quantity", "cost_price", "mrp", "supplier", "status",
];

function Inventory() {
    const [dashSummary, setDashSummary] = useState(null);
    const [invSummary, setInvSummary] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editMedicine, setEditMedicine] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Export dropdown
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportRef = useRef(null);

    // Filter panel
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const filterRef = useRef(null);
    const [filterStatus, setFilterStatus] = useState([]);
    const [filterCategory, setFilterCategory] = useState([]);
    const [filterQtyMin, setFilterQtyMin] = useState("");
    const [filterQtyMax, setFilterQtyMax] = useState("");
    const [filterExpiry, setFilterExpiry] = useState([]);
    // Applied filters (only applied when "Apply Filters" is clicked)
    const [appliedFilters, setAppliedFilters] = useState({
        status: [], category: [], qtyMin: "", qtyMax: "", expiry: [],
    });

    // Sort
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState(null); // 'asc' | 'desc' | null

    const loadData = useCallback(() => {
        setLoading(true);
        Promise.all([fetchDashboardSummary(), fetchInventorySummary(), fetchInventory()])
            .then(([ds, is, meds]) => {
                setDashSummary(ds);
                setInvSummary(is);
                setMedicines(meds);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchInventory({ search }).then(setMedicines).catch(() => { });
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (exportRef.current && !exportRef.current.contains(e.target)) {
                setShowExportMenu(false);
            }
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setShowFilterPanel(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Unique categories from data
    const uniqueCategories = useMemo(() => {
        const cats = new Set();
        medicines.forEach((m) => { if (m.category) cats.add(m.category); });
        return Array.from(cats).sort();
    }, [medicines]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (appliedFilters.status.length) count++;
        if (appliedFilters.category.length) count++;
        if (appliedFilters.qtyMin !== "" || appliedFilters.qtyMax !== "") count++;
        if (appliedFilters.expiry.length) count++;
        return count;
    }, [appliedFilters]);

    // Data pipeline: raw → search (already done by API) → filter → sort
    const processedMedicines = useMemo(() => {
        let result = [...medicines];

        // Apply filters
        const f = appliedFilters;
        if (f.status.length) {
            result = result.filter((m) => f.status.includes(m.status));
        }
        if (f.category.length) {
            result = result.filter((m) => f.category.includes(m.category));
        }
        if (f.qtyMin !== "") {
            result = result.filter((m) => m.quantity >= Number(f.qtyMin));
        }
        if (f.qtyMax !== "") {
            result = result.filter((m) => m.quantity <= Number(f.qtyMax));
        }
        if (f.expiry.length) {
            const today = new Date();
            const in30 = new Date(today.getTime() + 30 * 86400000).toISOString().split("T")[0];
            const in90 = new Date(today.getTime() + 90 * 86400000).toISOString().split("T")[0];
            const todayStr = today.toISOString().split("T")[0];
            result = result.filter((m) => {
                if (!m.expiry_date) return false;
                const exp = m.expiry_date;
                if (f.expiry.includes("expired") && exp < todayStr) return true;
                if (f.expiry.includes("30days") && exp >= todayStr && exp <= in30) return true;
                if (f.expiry.includes("90days") && exp >= todayStr && exp <= in90) return true;
                return false;
            });
        }

        // Apply sort
        if (sortColumn && sortDirection) {
            const numericCols = ["quantity", "cost_price", "mrp"];
            const isNumeric = numericCols.includes(sortColumn);
            const isDate = sortColumn === "expiry_date";
            result.sort((a, b) => {
                let va = a[sortColumn] ?? "";
                let vb = b[sortColumn] ?? "";
                let cmp;
                if (isNumeric) {
                    cmp = Number(va) - Number(vb);
                } else if (isDate) {
                    cmp = String(va).localeCompare(String(vb));
                } else {
                    cmp = String(va).toLowerCase().localeCompare(String(vb).toLowerCase());
                }
                return sortDirection === "desc" ? -cmp : cmp;
            });
        }

        return result;
    }, [medicines, appliedFilters, sortColumn, sortDirection]);

    // Sort handler
    function handleSort(column) {
        if (sortColumn !== column) {
            setSortColumn(column);
            setSortDirection("asc");
        } else if (sortDirection === "asc") {
            setSortDirection("desc");
        } else {
            setSortColumn(null);
            setSortDirection(null);
        }
    }

    // Filter helpers
    function toggleFilterArray(arr, setArr, val) {
        setArr((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
    }

    function applyFilters() {
        setAppliedFilters({
            status: [...filterStatus],
            category: [...filterCategory],
            qtyMin: filterQtyMin,
            qtyMax: filterQtyMax,
            expiry: [...filterExpiry],
        });
        setShowFilterPanel(false);
    }

    function clearFilters() {
        setFilterStatus([]);
        setFilterCategory([]);
        setFilterQtyMin("");
        setFilterQtyMax("");
        setFilterExpiry([]);
        setAppliedFilters({ status: [], category: [], qtyMin: "", qtyMax: "", expiry: [] });
        setShowFilterPanel(false);
    }

    // Export functions — directly use medicines array
    function exportCSV() {
        const data = processedMedicines.length > 0 ? processedMedicines : medicines;
        if (!data || data.length === 0) {
            alert("No data to export");
            setShowExportMenu(false);
            return;
        }
        let csv = "Medicine Name,Generic Name,Category,Batch No,Expiry Date,Quantity,Cost Price,MRP,Supplier,Status\n";
        data.forEach(function (m) {
            csv += '"' + (m.name || '') + '","' + (m.generic_name || '') + '","' + (m.category || '') + '","' + (m.batch_no || '') + '","' + (m.expiry_date || '') + '","' + (m.quantity || '') + '","' + (m.cost_price || '') + '","' + (m.mrp || '') + '","' + (m.supplier || '') + '","' + (m.status || '') + '"\n';
        });
        var blob = new Blob([csv], { type: "text/csv" });
        triggerDownload(blob, "inventory.csv");
        setShowExportMenu(false);
    }

    function exportPDF() {
        const data = processedMedicines.length > 0 ? processedMedicines : medicines;
        if (!data || data.length === 0) {
            alert("No data to export");
            setShowExportMenu(false);
            return;
        }
        try {
            var jsPDF = window.jspdf.jsPDF;
            var doc = new jsPDF();
            doc.setFontSize(16);
            doc.text("Pharmacy CRM - Inventory Report", 14, 18);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("Export Date: " + new Date().toLocaleDateString("en-IN"), 14, 25);
            var head = [["Medicine Name", "Generic Name", "Category", "Batch No", "Expiry Date", "Quantity", "Cost Price", "MRP", "Supplier", "Status"]];
            var body = [];
            data.forEach(function (m) {
                body.push([
                    m.name || "", m.generic_name || "", m.category || "",
                    m.batch_no || "", m.expiry_date || "", String(m.quantity || 0),
                    String(m.cost_price || 0), String(m.mrp || 0),
                    m.supplier || "", m.status || ""
                ]);
            });
            doc.autoTable({ startY: 32, head: head, body: body, styles: { fontSize: 8 }, headStyles: { fillColor: [99, 102, 241] } });
            doc.save("inventory.pdf");
        } catch (e) {
            alert("PDF export error: " + e.message);
        }
        setShowExportMenu(false);
    }

    function exportDOC() {
        const data = processedMedicines.length > 0 ? processedMedicines : medicines;
        if (!data || data.length === 0) {
            alert("No data to export");
            setShowExportMenu(false);
            return;
        }
        var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Inventory</title></head><body>';
        html += '<h2>Pharmacy CRM - Inventory Report</h2>';
        html += '<p>Export Date: ' + new Date().toLocaleDateString("en-IN") + '</p>';
        html += '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">';
        html += '<tr><th>Medicine Name</th><th>Generic Name</th><th>Category</th><th>Batch No</th><th>Expiry Date</th><th>Quantity</th><th>Cost Price</th><th>MRP</th><th>Supplier</th><th>Status</th></tr>';
        data.forEach(function (m) {
            html += '<tr><td>' + (m.name || '') + '</td><td>' + (m.generic_name || '') + '</td><td>' + (m.category || '') + '</td><td>' + (m.batch_no || '') + '</td><td>' + (m.expiry_date || '') + '</td><td>' + (m.quantity || '') + '</td><td>' + (m.cost_price || '') + '</td><td>' + (m.mrp || '') + '</td><td>' + (m.supplier || '') + '</td><td>' + (m.status || '') + '</td></tr>';
        });
        html += '</table></body></html>';
        var blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-word" });
        triggerDownload(blob, "inventory.doc");
        setShowExportMenu(false);
    }

    function triggerDownload(blob, filename) {
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 5000);
    }

    function handleDelete(medicine) {
        setDeleteTarget(medicine);
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        try {
            await deleteMedicine(deleteTarget.id);
            setDeleteTarget(null);
            loadData();
        } catch {
            setDeleteTarget(null);
        }
    }

    if (loading) return <div className="page-content"><p>Loading...</p></div>;
    if (error) return <div className="page-content"><p className="error-msg">Failed to load data. Try again.</p></div>;

    const formatCurrency = (v) => "₹" + Number(v).toLocaleString("en-IN");

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">Inventory</h1>
                    <p className="page-subtitle">Manage your medicine stock and track inventory levels</p>
                </div>
            </div>

            <div className="stat-cards-row">
                <StatCard title="Today's Sales" value={formatCurrency(dashSummary.today_sales)} badge="+12.5%" badgeColor="#10b981" icon="💰" iconBg="#d1fae5" accentColor="#10b981" />
                <StatCard title="Items Sold Today" value={dashSummary.items_sold_today} badge="32 Orders" badgeColor="#3b82f6" icon="📦" iconBg="#dbeafe" accentColor="#3b82f6" />
                <StatCard title="Low Stock Items" value={dashSummary.low_stock_count} badge="Action Needed" badgeColor="#f59e0b" icon="⚠️" iconBg="#fef3c7" accentColor="#f59e0b" />
                <StatCard title="Purchase Orders" value={formatCurrency(dashSummary.purchase_orders_total_value)} badge={`${dashSummary.purchase_orders_pending} Pending`} badgeColor="#8b5cf6" icon="🛍️" iconBg="#ede9fe" accentColor="#8b5cf6" />
            </div>

            <div className="inventory-overview-gradient">
                <h3>Inventory Overview</h3>
                <div className="overview-stats">
                    <div className="overview-stat">
                        <span className="overview-icon" style={{ background: "#dbeafe", color: "#3b82f6" }}>📋</span>
                        <div>
                            <span className="overview-label">Total Items</span>
                            <span className="overview-value">{invSummary.total_items}</span>
                        </div>
                    </div>
                    <div className="overview-stat">
                        <span className="overview-icon" style={{ background: "#d1fae5", color: "#10b981" }}>✅</span>
                        <div>
                            <span className="overview-label">Active Stock</span>
                            <span className="overview-value">{invSummary.active_stock}</span>
                        </div>
                    </div>
                    <div className="overview-stat">
                        <span className="overview-icon" style={{ background: "#fef3c7", color: "#f59e0b" }}>⚠️</span>
                        <div>
                            <span className="overview-label">Low Stock</span>
                            <span className="overview-value">{invSummary.low_stock}</span>
                        </div>
                    </div>
                    <div className="overview-stat">
                        <span className="overview-icon" style={{ background: "#ede9fe", color: "#8b5cf6" }}>💵</span>
                        <div>
                            <span className="overview-label">Total Value</span>
                            <span className="overview-value">{formatCurrency(invSummary.total_value)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="inventory-header">
                    <h3>Complete Inventory</h3>
                    <div className="inventory-actions">
                        {/* Filter button */}
                        <div className="dropdown-wrapper" ref={filterRef}>
                            <button
                                className="btn-outline btn-sm"
                                onClick={() => { setShowFilterPanel((p) => !p); setShowExportMenu(false); }}
                            >
                                Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
                            </button>
                            {showFilterPanel && (
                                <div className="filter-panel">
                                    <div className="filter-section">
                                        <div className="filter-section-title">Status</div>
                                        {["Active", "Low Stock", "Expired", "Out of Stock"].map((s) => (
                                            <label className="filter-checkbox" key={s}>
                                                <input type="checkbox" checked={filterStatus.includes(s)} onChange={() => toggleFilterArray(filterStatus, setFilterStatus, s)} />
                                                <span>{s}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="filter-section">
                                        <div className="filter-section-title">Category</div>
                                        {uniqueCategories.length === 0 && <span className="filter-empty">No categories</span>}
                                        {uniqueCategories.map((c) => (
                                            <label className="filter-checkbox" key={c}>
                                                <input type="checkbox" checked={filterCategory.includes(c)} onChange={() => toggleFilterArray(filterCategory, setFilterCategory, c)} />
                                                <span>{c}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="filter-section">
                                        <div className="filter-section-title">Quantity Range</div>
                                        <div className="filter-range-row">
                                            <input type="number" className="filter-input" placeholder="Min" value={filterQtyMin} onChange={(e) => setFilterQtyMin(e.target.value)} />
                                            <input type="number" className="filter-input" placeholder="Max" value={filterQtyMax} onChange={(e) => setFilterQtyMax(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="filter-section">
                                        <div className="filter-section-title">Expiry</div>
                                        <label className="filter-checkbox">
                                            <input type="checkbox" checked={filterExpiry.includes("30days")} onChange={() => toggleFilterArray(filterExpiry, setFilterExpiry, "30days")} />
                                            <span>Expiring within 30 days</span>
                                        </label>
                                        <label className="filter-checkbox">
                                            <input type="checkbox" checked={filterExpiry.includes("90days")} onChange={() => toggleFilterArray(filterExpiry, setFilterExpiry, "90days")} />
                                            <span>Expiring within 90 days</span>
                                        </label>
                                        <label className="filter-checkbox">
                                            <input type="checkbox" checked={filterExpiry.includes("expired")} onChange={() => toggleFilterArray(filterExpiry, setFilterExpiry, "expired")} />
                                            <span>Already Expired</span>
                                        </label>
                                    </div>
                                    <div className="filter-actions">
                                        <button className="btn-outline btn-sm" onClick={clearFilters}>Clear Filters</button>
                                        <button className="btn-primary btn-sm" onClick={applyFilters}>Apply Filters</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Export button */}
                        <div className="dropdown-wrapper" ref={exportRef}>
                            <button
                                className="btn-outline btn-sm"
                                onClick={() => { setShowExportMenu((p) => !p); setShowFilterPanel(false); }}
                            >
                                Export
                            </button>
                            {showExportMenu && (
                                <div className="export-dropdown">
                                    <button className="export-option" onClick={exportCSV}>📊 Export as CSV</button>
                                    <button className="export-option" onClick={exportPDF}>📄 Export as PDF</button>
                                    <button className="export-option" onClick={exportDOC}>📝 Export as DOC</button>
                                </div>
                            )}
                        </div>

                        <button className="btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Add Medicine</button>
                    </div>
                </div>
                <div className="search-wrapper">
                    <input
                        className="input"
                        placeholder="Search by medicine name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <MedicineTable
                    medicines={processedMedicines}
                    onEdit={(m) => setEditMedicine(m)}
                    onDelete={handleDelete}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                />
            </div>

            {showModal && (
                <AddMedicineModal
                    onClose={() => setShowModal(false)}
                    onSaved={() => {
                        setShowModal(false);
                        loadData();
                    }}
                />
            )}

            {editMedicine && (
                <EditMedicineModal
                    medicine={editMedicine}
                    onClose={() => setEditMedicine(null)}
                    onSaved={() => {
                        setEditMedicine(null);
                        loadData();
                    }}
                />
            )}

            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Delete Medicine</h2>
                            <button className="modal-close-btn" onClick={() => setDeleteTarget(null)} type="button">✕</button>
                        </div>
                        <div className="modal-body">
                            <p className="confirm-text">
                                Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
                            </p>
                            <div className="modal-actions">
                                <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
                                <button className="btn-danger" onClick={confirmDelete}>Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Inventory;
