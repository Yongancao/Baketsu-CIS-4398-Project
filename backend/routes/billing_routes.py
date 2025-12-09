from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
import os

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.file import UserFile, FileStorageHistory
from models.invoice import Invoice, StripeCustomer
from pydantic import BaseModel

router = APIRouter(prefix="/billing", tags=["Billing"])

# Pricing configuration (AWS S3 Standard Storage pricing)
PRICE_PER_GB_CENTS = 2.3  # $0.023 per GB per month (first 50 TB tier)
DAYS_PER_MONTH = 30  # Average days in a month
PRICE_PER_GB_DAY_CENTS = PRICE_PER_GB_CENTS / DAYS_PER_MONTH  # Cost per GB-day


def calculate_gb_days(file_size_bytes: int, days: float) -> float:
    """Calculate GB-days for a file"""
    gb = file_size_bytes / (1024 ** 3)  # Convert bytes to GB
    return gb * days


def calculate_storage_cost(gb_days: float) -> int:
    """Calculate cost in cents for given GB-days"""
    return int(gb_days * PRICE_PER_GB_DAY_CENTS)


def get_billing_period(year: int = None, month: int = None):
    """Get start and end dates for a billing period"""
    if year is None or month is None:
        # Default to previous month
        now = datetime.utcnow()
        if now.month == 1:
            year = now.year - 1
            month = 12
        else:
            year = now.year
            month = now.month - 1
    
    # Start of billing period
    start_date = datetime(year, month, 1)
    
    # End of billing period (start of next month)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    return start_date, end_date


# Pydantic models for responses
class BillingUsageResponse(BaseModel):
    current_month_cost: int  # in cents
    current_month_gb_hours: float  # Keep field name for backward compatibility, but represents GB-days
    active_files: List[dict]
    deleted_files: List[dict]


class InvoiceResponse(BaseModel):
    id: int
    billing_month: int
    billing_year: int
    total_gb_hours: float
    cost_cents: int
    status: str
    due_date: str
    created_at: str
    details: dict = None


@router.get("/test")
def test_billing():
    """Test endpoint to verify billing routes are loaded"""
    return {"status": "ok", "message": "Billing routes are working"}


@router.get("/usage", response_model=BillingUsageResponse)
def get_current_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current month's storage usage and projected cost"""
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    
    # Get all active files
    active_files = db.query(UserFile).filter(
        UserFile.user_id == current_user.id,
        UserFile.deleted_at.is_(None)
    ).all()
    
    # Get files deleted this month
    deleted_files = db.query(UserFile).filter(
        UserFile.user_id == current_user.id,
        UserFile.deleted_at.isnot(None),
        UserFile.deleted_at >= month_start
    ).all()
    
    total_cost_cents = 0
    total_gb_days = 0.0
    active_files_breakdown = []
    deleted_files_breakdown = []
    
    # Calculate cost for active files
    for file in active_files:
        upload_time = file.uploaded_at.replace(tzinfo=None) if file.uploaded_at.tzinfo else file.uploaded_at
        start_time = max(upload_time, month_start)
        days_stored = (now - start_time).total_seconds() / 86400  # 86400 seconds in a day
        
        gb_days = calculate_gb_days(file.file_size, days_stored)
        cost_cents = calculate_storage_cost(gb_days)
        
        total_gb_days += gb_days
        total_cost_cents += cost_cents
        
        active_files_breakdown.append({
            "filename": file.filename,
            "size_gb": file.file_size / (1024 ** 3),
            "days_stored": days_stored,
            "cost_this_month": cost_cents
        })
    
    # Calculate cost for deleted files (pro-rated)
    for file in deleted_files:
        upload_time = file.uploaded_at.replace(tzinfo=None) if file.uploaded_at.tzinfo else file.uploaded_at
        delete_time = file.deleted_at.replace(tzinfo=None) if file.deleted_at.tzinfo else file.deleted_at
        
        start_time = max(upload_time, month_start)
        end_time = min(delete_time, now)
        days_stored = (end_time - start_time).total_seconds() / 86400
        
        if days_stored > 0:
            gb_days = calculate_gb_days(file.file_size, days_stored)
            cost_cents = calculate_storage_cost(gb_days)
            
            total_gb_days += gb_days
            total_cost_cents += cost_cents
            
            deleted_files_breakdown.append({
                "filename": file.filename,
                "size_gb": file.file_size / (1024 ** 3),
                "days_stored": days_stored,
                "cost_this_month": cost_cents
            })
    
    return BillingUsageResponse(
        current_month_cost=total_cost_cents,
        current_month_gb_hours=total_gb_days,  # Field name kept for compatibility
        active_files=active_files_breakdown,
        deleted_files=deleted_files_breakdown
    )


@router.get("/invoices", response_model=List[InvoiceResponse])
def get_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all invoices for the current user"""
    invoices = db.query(Invoice).filter(
        Invoice.user_id == current_user.id
    ).order_by(Invoice.created_at.desc()).limit(12).all()
    
    return [
        InvoiceResponse(
            id=inv.id,
            billing_month=inv.billing_month,
            billing_year=inv.billing_year,
            total_gb_hours=inv.total_gb_hours / 100,  # Stored as integer
            cost_cents=inv.cost_cents,
            status=inv.status,
            due_date=inv.due_date.isoformat(),
            created_at=inv.created_at.isoformat(),
            details=inv.details
        )
        for inv in invoices
    ]


@router.get("/invoices/{invoice_id}")
def get_invoice_detail(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed invoice information"""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {
        "id": invoice.id,
        "billing_month": invoice.billing_month,
        "billing_year": invoice.billing_year,
        "total_gb_hours": invoice.total_gb_hours / 100,
        "cost_cents": invoice.cost_cents,
        "status": invoice.status,
        "due_date": invoice.due_date.isoformat(),
        "created_at": invoice.created_at.isoformat(),
        "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
        "stripe_invoice_id": invoice.stripe_invoice_id,
        "stripe_payment_intent_id": invoice.stripe_payment_intent_id,
        "details": invoice.details
    }


@router.post("/generate-invoice")
def generate_invoice(
    year: int = None,
    month: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate an invoice for a specific billing period.
    Defaults to previous month if no period specified.
    """
    start_date, end_date = get_billing_period(year, month)
    billing_year = start_date.year
    billing_month = start_date.month
    
    # Check if invoice already exists
    existing = db.query(Invoice).filter(
        Invoice.user_id == current_user.id,
        Invoice.billing_year == billing_year,
        Invoice.billing_month == billing_month
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Invoice already exists for this period")
    
    # Get all files (active and deleted) for the billing period
    all_files = db.query(UserFile).filter(
        UserFile.user_id == current_user.id,
        UserFile.uploaded_at < end_date
    ).all()
    
    total_gb_days = 0.0
    total_cost_cents = 0
    file_details = []
    
    for file in all_files:
        upload_time = file.uploaded_at.replace(tzinfo=None) if file.uploaded_at.tzinfo else file.uploaded_at
        
        # Determine when file was deleted (if at all)
        if file.deleted_at:
            delete_time = file.deleted_at.replace(tzinfo=None) if file.deleted_at.tzinfo else file.deleted_at
            # Skip if deleted before billing period
            if delete_time < start_date:
                continue
            end_time = min(delete_time, end_date)
        else:
            end_time = end_date
        
        # Calculate days stored during billing period
        start_time = max(upload_time, start_date)
        if start_time >= end_date:
            continue  # File uploaded after billing period
        
        days_stored = (end_time - start_time).total_seconds() / 86400
        
        if days_stored > 0:
            gb_days = calculate_gb_days(file.file_size, days_stored)
            cost_cents = calculate_storage_cost(gb_days)
            
            total_gb_days += gb_days
            total_cost_cents += cost_cents
            
            file_details.append({
                "filename": file.filename,
                "size_bytes": file.file_size,
                "size_gb": file.file_size / (1024 ** 3),
                "days_stored": days_stored,
                "gb_days": gb_days,
                "cost_cents": cost_cents,
                "was_deleted": file.deleted_at is not None
            })
    
    # Create invoice
    invoice = Invoice(
        user_id=current_user.id,
        billing_month=billing_month,
        billing_year=billing_year,
        total_gb_hours=int(total_gb_days * 100),  # Store GB-days with 2 decimal precision (field name kept for compatibility)
        cost_cents=total_cost_cents,
        status="pending",
        created_at=datetime.utcnow(),
        due_date=datetime.utcnow() + timedelta(days=7),
        details={
            "files": file_details,
            "price_per_gb_month_cents": PRICE_PER_GB_CENTS,
            "price_per_gb_day_cents": PRICE_PER_GB_DAY_CENTS
        }
    )
    
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    return {
        "message": "Invoice generated successfully",
        "invoice_id": invoice.id,
        "cost_cents": invoice.cost_cents,
        "total_gb_days": total_gb_days
    }


@router.delete("/invoices/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an invoice (admin function).
    Users can delete their own invoices.
    """
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    db.delete(invoice)
    db.commit()
    
    return {"message": "Invoice deleted successfully", "invoice_id": invoice_id}
