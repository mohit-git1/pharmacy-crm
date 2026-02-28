import { useState, useEffect, useRef } from "react";
import StatCard from "../components/StatCard";
import RecentSales from "../components/RecentSales";
import { fetchDashboardSummary, fetchRecentSales, fetchInventory, createSale } from "../api/api";

function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [sales, setSales] = useState([]);
    const [activeTab, setActiveTab] = useState("Sales");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Sale form state — restored from sessionStorage so navigation doesn't lose data
    const [patientName, setPatientName] = useState(() => sessionStorage.getItem("sale_patient") || "");
    const [paymentMethod, setPaymentMethod] = useState(() => sessionStorage.getItem("sale_payment") || "Cash");
    const [cart, setCart] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem("sale_cart")) || []; }
        catch { return []; }
    });
    const [medSearch, setMedSearch] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [saleError, setSaleError] = useState("");
    const [saleSuccess, setSaleSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const suggestRef = useRef(null);

    // Persist sale form to sessionStorage on change
    useEffect(() => { sessionStorage.setItem("sale_patient", patientName); }, [patientName]);
    useEffect(() => { sessionStorage.setItem("sale_payment", paymentMethod); }, [paymentMethod]);
    useEffect(() => { sessionStorage.setItem("sale_cart", JSON.stringify(cart)); }, [cart]);

    function loadData() {
        setLoading(true);
        Promise.all([fetchDashboardSummary(), fetchRecentSales()])
            .then(([sum, s]) => {
                setSummary(sum);
                setSales(s);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, []);

    // Medicine autocomplete search
    useEffect(() => {
        if (!medSearch.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        const timer = setTimeout(() => {
            fetchInventory({ search: medSearch })
                .then((data) => {
                    // Only show medicines that are in stock
                    var available = data.filter(function (m) { return m.quantity > 0; });
                    setSuggestions(available);
                    setShowSuggestions(available.length > 0);
                })
                .catch(() => setSuggestions([]));
        }, 300);
        return () => clearTimeout(timer);
    }, [medSearch]);

    // Close suggestions on outside click
    useEffect(() => {
        function handleClick(e) {
            if (suggestRef.current && !suggestRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    function addToCart(medicine) {
        // Check if already in cart
        var exists = cart.find(function (c) { return c.medicine_id === medicine.id; });
        if (exists) {
            setSaleError(medicine.name + " is already in the cart");
            setTimeout(() => setSaleError(""), 3000);
        } else {
            setCart([...cart, {
                medicine_id: medicine.id,
                name: medicine.name,
                generic_name: medicine.generic_name || "",
                batch_no: medicine.batch_no || "",
                expiry_date: medicine.expiry_date || "",
                mrp: medicine.mrp,
                available: medicine.quantity,
                quantity: 1,
            }]);
        }
        setMedSearch("");
        setSuggestions([]);
        setShowSuggestions(false);
    }

    function updateCartQty(index, newQty) {
        if (newQty < 1) return;
        if (newQty > cart[index].available) {
            setSaleError("Only " + cart[index].available + " units available for " + cart[index].name);
            setTimeout(() => setSaleError(""), 3000);
            return;
        }
        var updated = [...cart];
        updated[index] = { ...updated[index], quantity: newQty };
        setCart(updated);
    }

    function removeFromCart(index) {
        setCart(cart.filter(function (_, i) { return i !== index; }));
    }

    function getTotal() {
        return cart.reduce(function (sum, item) { return sum + item.quantity * item.mrp; }, 0);
    }

    async function handleBill() {
        setSaleError("");
        setSaleSuccess("");
        if (!patientName.trim()) {
            setSaleError("Please enter patient name");
            return;
        }
        if (cart.length === 0) {
            setSaleError("Please add at least one medicine");
            return;
        }
        setSubmitting(true);
        try {
            var result = await createSale({
                patient_name: patientName.trim(),
                payment_method: paymentMethod,
                items: cart.map(function (c) {
                    return { medicine_id: c.medicine_id, quantity: c.quantity, price: c.mrp };
                }),
            });
            setSaleSuccess("Sale completed! Invoice: " + result.invoice_no + " — Total: ₹" + result.total_amount.toFixed(2));
            setPatientName("");
            setPaymentMethod("Cash");
            setCart([]);
            sessionStorage.removeItem("sale_patient");
            sessionStorage.removeItem("sale_payment");
            sessionStorage.removeItem("sale_cart");
            loadData();
        } catch (err) {
            var msg = "Sale failed";
            if (err.response && err.response.data && err.response.data.detail) {
                msg = err.response.data.detail;
            }
            setSaleError(msg);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return <div className="page-content"><p>Loading...</p></div>;
    if (error) return <div className="page-content"><p className="error-msg">Failed to load data. Try again.</p></div>;

    var formatCurrency = function (v) { return "₹" + Number(v).toLocaleString("en-IN"); };

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">Pharmacy CRM</h1>
                    <p className="page-subtitle">Overview of today's activity and recent transactions</p>
                </div>
            </div>

            <div className="stat-cards-row">
                <StatCard title="Today's Sales" value={formatCurrency(summary.today_sales)} badge="+12.5%" badgeColor="#10b981" icon="💰" iconBg="#d1fae5" accentColor="#10b981" />
                <StatCard title="Items Sold Today" value={summary.items_sold_today} badge="32 Orders" badgeColor="#3b82f6" icon="📦" iconBg="#dbeafe" accentColor="#3b82f6" />
                <StatCard title="Low Stock Items" value={summary.low_stock_count} badge="Action Needed" badgeColor="#f59e0b" icon="⚠️" iconBg="#fef3c7" accentColor="#f59e0b" />
                <StatCard title="Purchase Orders" value={formatCurrency(summary.purchase_orders_total_value)} badge={`${summary.purchase_orders_pending} Pending`} badgeColor="#8b5cf6" icon="🛍️" iconBg="#ede9fe" accentColor="#8b5cf6" />
            </div>

            <div className="tabs-row">
                <div className="tabs">
                    {["Sales", "Purchase", "Inventory"].map((tab) => (
                        <button key={tab} className={activeTab === tab ? "tab active" : "tab"} onClick={() => setActiveTab(tab)}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === "Sales" && (
                <>
                    <div className="card make-sale-section">
                        <h3>Make a Sale</h3>

                        {saleError && <div className="sale-alert sale-alert-error">{saleError}</div>}
                        {saleSuccess && <div className="sale-alert sale-alert-success">{saleSuccess}</div>}

                        <div className="sale-form-row">
                            <div className="sale-field">
                                <label className="sale-label">Patient Name *</label>
                                <input
                                    className="input"
                                    placeholder="Enter patient name"
                                    value={patientName}
                                    onChange={(e) => setPatientName(e.target.value)}
                                />
                            </div>
                            <div className="sale-field">
                                <label className="sale-label">Payment Method</label>
                                <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Card">Card</option>
                                </select>
                            </div>
                            <div className="sale-field autocomplete-field" ref={suggestRef}>
                                <label className="sale-label">Search Medicine</label>
                                <input
                                    className="input"
                                    placeholder="Type to search medicines..."
                                    value={medSearch}
                                    onChange={(e) => setMedSearch(e.target.value)}
                                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                                />
                                {showSuggestions && (
                                    <div className="autocomplete-dropdown">
                                        {suggestions.map((m) => (
                                            <div
                                                key={m.id}
                                                className="autocomplete-item"
                                                onClick={() => addToCart(m)}
                                            >
                                                <div className="ac-item-name">{m.name}</div>
                                                <div className="ac-item-details">
                                                    <span>Batch: {m.batch_no}</span>
                                                    <span>Stock: {m.quantity}</span>
                                                    <span>₹{m.mrp}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Medicine Name</th>
                                        <th>Generic Name</th>
                                        <th>Batch No</th>
                                        <th>Expiry Date</th>
                                        <th>MRP</th>
                                        <th>Quantity</th>
                                        <th>Subtotal</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.length === 0 ? (
                                        <tr><td colSpan="8" className="empty-cell">No items added — search and add medicines above</td></tr>
                                    ) : (
                                        cart.map((item, i) => (
                                            <tr key={item.medicine_id}>
                                                <td className="td-bold">{item.name}</td>
                                                <td>{item.generic_name}</td>
                                                <td>{item.batch_no}</td>
                                                <td>{item.expiry_date}</td>
                                                <td>₹{item.mrp.toFixed(2)}</td>
                                                <td>
                                                    <div className="qty-controls">
                                                        <button className="qty-btn" onClick={() => updateCartQty(i, item.quantity - 1)}>−</button>
                                                        <span className="qty-value">{item.quantity}</span>
                                                        <button className="qty-btn" onClick={() => updateCartQty(i, item.quantity + 1)}>+</button>
                                                    </div>
                                                </td>
                                                <td className="td-bold">₹{(item.quantity * item.mrp).toFixed(2)}</td>
                                                <td>
                                                    <button className="btn-action btn-action-delete" title="Remove" onClick={() => removeFromCart(i)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {cart.length > 0 && (
                            <div className="sale-footer">
                                <div className="sale-total">
                                    <span>Total Amount:</span>
                                    <span className="sale-total-value">₹{getTotal().toFixed(2)}</span>
                                </div>
                                <button className="btn-bill" onClick={handleBill} disabled={submitting}>
                                    {submitting ? "Processing..." : "Generate Bill"}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <h3>Recent Sales</h3>
                        <RecentSales sales={sales} />
                    </div>
                </>
            )}

            {activeTab === "Purchase" && (
                <div className="card"><p>Purchase orders section</p></div>
            )}

            {activeTab === "Inventory" && (
                <div className="card"><p>Inventory quick view</p></div>
            )}
        </div>
    );
}

export default Dashboard;
