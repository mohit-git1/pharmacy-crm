from pydantic import BaseModel, field_validator
from typing import Optional


class MedicineCreate(BaseModel):
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    batch_no: Optional[str] = None
    expiry_date: Optional[str] = None
    quantity: int = 0
    cost_price: Optional[float] = None
    mrp: float
    supplier: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Medicine name is required")
        return v.strip()

    @field_validator("quantity")
    @classmethod
    def quantity_non_negative(cls, v):
        if v < 0:
            raise ValueError("Quantity must be >= 0")
        return v

    @field_validator("mrp")
    @classmethod
    def mrp_positive(cls, v):
        if v <= 0:
            raise ValueError("MRP must be > 0")
        return v


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    category: Optional[str] = None
    batch_no: Optional[str] = None
    expiry_date: Optional[str] = None
    quantity: Optional[int] = None
    cost_price: Optional[float] = None
    mrp: Optional[float] = None
    supplier: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def valid_status(cls, v):
        allowed = {"Active", "Low Stock", "Expired", "Out of Stock"}
        if v not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return v


class SaleItem(BaseModel):
    medicine_id: int
    quantity: int
    price: float

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v):
        if v <= 0:
            raise ValueError("Quantity must be > 0")
        return v


class SaleCreate(BaseModel):
    patient_name: str
    payment_method: str = "Cash"
    items: list[SaleItem]

    @field_validator("patient_name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Patient name is required")
        return v.strip()

    @field_validator("items")
    @classmethod
    def items_not_empty(cls, v):
        if not v:
            raise ValueError("At least one item is required")
        return v
