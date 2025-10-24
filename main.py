from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from typing import List

from . import models, schemas
from .database import SessionLocal, engine

# This line creates the database tables based on your models
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Dependency to get a DB session for each request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to the College Event Management API"}

# A simple placeholder endpoint to show how to use the model and schema
# NOTE: This does not include password hashing or actual user creation logic yet.
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # In a real app, you would hash user.password here before creating the model
    db_user = models.User(
        email=user.email,
        password_hash=f"hashed_{user.password}", # Placeholder for hashing
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user