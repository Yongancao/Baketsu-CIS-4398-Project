from sqlalchemy import Column, Integer, String, BigInteger, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from core.database import Base

class Invoice(Base):
    """Monthly billing invoices"""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Billing period
    billing_month = Column(Integer, nullable=False)  # 1-12
    billing_year = Column(Integer, nullable=False)   # e.g., 2024
    
    # Usage and cost
    total_gb_hours = Column(BigInteger, nullable=False)  # Total GB-hours for the month
    cost_cents = Column(BigInteger, nullable=False)      # Cost in cents
    
    # Status
    status = Column(String, default="pending")  # pending, paid, failed, refunded
    
    # Dates
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    due_date = Column(DateTime(timezone=True), nullable=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    
    # Stripe integration
    stripe_invoice_id = Column(String, nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)
    
    # Detailed breakdown (JSON field)
    details = Column(JSON, nullable=True)  # Store file-by-file breakdown


class StripeCustomer(Base):
    """Map users to Stripe customer IDs"""
    __tablename__ = "stripe_customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    stripe_customer_id = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
