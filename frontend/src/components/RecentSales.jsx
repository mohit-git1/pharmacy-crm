function RecentSales({ sales }) {
    if (!sales.length) {
        return <p className="empty-msg">No recent sales.</p>;
    }

    return (
        <div className="recent-sales">
            {sales.map((s) => (
                <div className="sale-row" key={s.invoice_no}>
                    <span className="sale-icon">🛒</span>
                    <div className="sale-details">
                        <span className="sale-invoice">{s.invoice_no}</span>
                        <span className="sale-meta">
                            {s.patient_name} • {s.items_count} items • {s.payment_method}
                        </span>
                    </div>
                    <div className="sale-right">
                        <span className="sale-amount">₹{s.total_amount.toLocaleString("en-IN")}</span>
                        <span className="sale-date">{new Date(s.created_at).toLocaleDateString("en-IN")}</span>
                        <span className="status-badge" style={{ background: "#10b9811a", color: "#10b981" }}>
                            {s.status}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default RecentSales;
