const STATUS_MAP = {
    Active: "status-active",
    "Low Stock": "status-low-stock",
    Expired: "status-expired",
    "Out of Stock": "status-out-of-stock",
};

const COLUMNS = [
    { key: "name", label: "Medicine Name" },
    { key: "generic_name", label: "Generic Name" },
    { key: "category", label: "Category" },
    { key: "batch_no", label: "Batch No" },
    { key: "expiry_date", label: "Expiry Date" },
    { key: "quantity", label: "Quantity" },
    { key: "cost_price", label: "Cost Price" },
    { key: "mrp", label: "MRP" },
    { key: "supplier", label: "Supplier" },
    { key: "status", label: "Status" },
];

function SortIcon({ column, sortColumn, sortDirection }) {
    if (sortColumn !== column) {
        return <span className="sort-icon sort-icon-neutral">↕</span>;
    }
    if (sortDirection === "asc") {
        return <span className="sort-icon sort-icon-active">↑</span>;
    }
    return <span className="sort-icon sort-icon-active">↓</span>;
}

function MedicineTable({ medicines, onEdit, onDelete, sortColumn, sortDirection, onSort }) {
    if (!medicines.length) {
        return <p className="empty-msg">No medicines found.</p>;
    }

    return (
        <div className="table-wrapper">
            <table className="data-table">
                <thead>
                    <tr>
                        {COLUMNS.map((col) => (
                            <th
                                key={col.key}
                                className={`sortable-th${sortColumn === col.key ? " sorted-active" : ""}`}
                                onClick={() => onSort && onSort(col.key)}
                            >
                                {col.label}
                                <SortIcon column={col.key} sortColumn={sortColumn} sortDirection={sortDirection} />
                            </th>
                        ))}
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {medicines.map((m) => (
                        <tr key={m.id}>
                            <td className="td-bold">{m.name}</td>
                            <td>{m.generic_name}</td>
                            <td>{m.category}</td>
                            <td>{m.batch_no}</td>
                            <td>{m.expiry_date}</td>
                            <td>{m.quantity}</td>
                            <td>₹{m.cost_price?.toFixed(2)}</td>
                            <td>₹{m.mrp?.toFixed(2)}</td>
                            <td>{m.supplier}</td>
                            <td>
                                <span
                                    className={`status-badge ${STATUS_MAP[m.status] || "status-out-of-stock"}`}
                                >
                                    {m.status}
                                </span>
                            </td>
                            <td>
                                <div className="table-actions">
                                    <button
                                        className="btn-action btn-action-edit"
                                        title="Edit"
                                        onClick={() => onEdit && onEdit(m)}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="btn-action btn-action-delete"
                                        title="Delete"
                                        onClick={() => onDelete && onDelete(m)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default MedicineTable;
