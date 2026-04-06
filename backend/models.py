from sqlalchemy import Column, Integer, String, Boolean, JSON, Float, ForeignKey
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, unique=True, index=True)
    role = Column(String) # Farmer, Driver, Admin
    language_pref = Column(String, default="en")
    current_phase = Column(String, default="onboarding")
    lat = Column(Float, nullable=True)
    long = Column(Float, nullable=True)

class Field(Base):
    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    soil_data = Column(JSON, nullable=True) # NPK levels, etc
    # Store crop distribution like {"wheat": 60, "onion": 10, "dal": 30}
    land_allocation = Column(JSON, nullable=True) 
    is_locked = Column(Boolean, default=False)
    pincode = Column(String, index=True)

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("users.id"))
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String, default="Pending") # Pending, Negotiating, Accepted, Completed
    mandi_id = Column(Integer)
    initial_price = Column(Float)
    final_price = Column(Float, nullable=True)
    crop_info = Column(String)
