from core.database import SessionLocal
from models.user import User

# Create a real DB session manually (not using Depends)
db = SessionLocal()

email = "jun1234@gmail.com"  # change as needed

user = db.query(User).filter(User.email == email).first()

if not user:
    print("User not found.")
else:
    db.delete(user)
    db.commit()
    print("User deleted successfully.")

db.close()
