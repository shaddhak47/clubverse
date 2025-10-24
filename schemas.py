from pydantic import BaseModel

# This is the base schema for a User
class UserBase(BaseModel):
    email: str
    role: str

# This schema will be used when creating a new user via the API
class UserCreate(UserBase):
    password: str

# This schema will be used when returning a user's data from the API
# It doesn't include the password for security.
class User(UserBase):
    id: int

    class Config:
        from_attributes = True # Pydantic v2, was orm_mode = True