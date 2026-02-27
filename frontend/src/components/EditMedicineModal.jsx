import { useState } from "react";
import { updateMedicine } from "../api/api";

function EditMedicineModal({ medicine, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: medicine.name || "",
        generic_name: medicine.generic_name || "",
        category: medicine.category || "",
        batch_no: medicine.batch_no || "",
        expiry_date: medicine.expiry_date || "",
        quantity: medicine.quantity ?? 0,
        cost_price: medicine.cost_price ?? "",
        mrp: medicine.mrp ?? "",
        supplier: medicine.supplier || "",
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    function validate() {
        const errs = {};
        if (!form.name.trim()) errs.name = "Name is required";
        if (Number(form.quantity) < 0) errs.quantity = "Must be >= 0";
        if (!form.mrp || Number(form.mrp) <= 0) errs.mrp = "MRP must be > 0";
        if (!form.cost_price || Number(form.cost_price) <= 0) errs.cost_price = "Cost price is required";
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) {
            setErrors(errs);
            return;
        }
        setSubmitting(true);
        try {
            await updateMedicine(medicine.id, {
                ...form,
                quantity: Number(form.quantity),
                cost_price: Number(form.cost_price),
                mrp: Number(form.mrp),
            });
            onSaved();
        } catch {
            setErrors({ name: "Failed to update. Check your input." });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Medicine</h2>
                    <button className="modal-close-btn" onClick={onClose} type="button">✕</button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="modal-form">
                        <label>
                            Name *
                            <input name="name" value={form.name} onChange={handleChange} />
                            {errors.name && <span className="field-error">{errors.name}</span>}
                        </label>
                        <label>
                            Generic Name
                            <input name="generic_name" value={form.generic_name} onChange={handleChange} />
                        </label>
                        <label>
                            Category
                            <input name="category" value={form.category} onChange={handleChange} />
                        </label>
                        <label>
                            Batch No
                            <input name="batch_no" value={form.batch_no} onChange={handleChange} />
                        </label>
                        <label>
                            Expiry Date
                            <input name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange} />
                        </label>
                        <label>
                            Quantity *
                            <input name="quantity" type="number" value={form.quantity} onChange={handleChange} />
                            {errors.quantity && <span className="field-error">{errors.quantity}</span>}
                        </label>
                        <label>
                            Cost Price *
                            <input name="cost_price" type="number" step="0.01" value={form.cost_price} onChange={handleChange} />
                            {errors.cost_price && <span className="field-error">{errors.cost_price}</span>}
                        </label>
                        <label>
                            MRP *
                            <input name="mrp" type="number" step="0.01" value={form.mrp} onChange={handleChange} />
                            {errors.mrp && <span className="field-error">{errors.mrp}</span>}
                        </label>
                        <label>
                            Supplier
                            <input name="supplier" value={form.supplier} onChange={handleChange} />
                        </label>
                        <div className="modal-actions">
                            <button type="button" className="btn-cancel" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-save" disabled={submitting}>
                                {submitting ? "Updating..." : "Update Medicine"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default EditMedicineModal;
