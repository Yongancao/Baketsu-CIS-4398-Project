import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "changeme")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "changeme")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data.db")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "")
    PRICE_PER_GB_CENTS: int = int(os.getenv("PRICE_PER_GB_CENTS", "200"))


settings = Settings()
