from core.database import SessionLocal
from models.user import User

# Change email to the one you want to delete
# To delete user run  
# python3 -m testing.delete_user

# Create a real DB session manually (not using Depends)
db = SessionLocal()

email = "123jun@gmail.com"  # change as needed

user = db.query(User).filter(User.email == email).first()

if not user:
    print("User not found.")
else:
    db.delete(user)
    db.commit()
    print("User deleted successfully.")

db.close()
