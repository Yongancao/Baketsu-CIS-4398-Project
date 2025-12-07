import boto3
import os
from dotenv import load_dotenv

load_dotenv()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION")

s3 = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

print("DEBUG bucket =", AWS_BUCKET_NAME)
print("DEBUG key =", AWS_ACCESS_KEY_ID)
print("DEBUG secret =", AWS_SECRET_ACCESS_KEY)
print("DEBUG region =", AWS_REGION)

def upload_file_to_s3(file, key: str):
    s3.upload_fileobj(file, AWS_BUCKET_NAME, key)

def delete_file_from_s3(key: str):
    s3.delete_object(Bucket=AWS_BUCKET_NAME, Key=key)

def generate_presigned_url(key: str, expires_in: int = 300):
    """
    Generate a temporary URL that allows the user to access S3 file for preview or download.
    """
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": AWS_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in
    )

def generate_download_url(key: str, filename: str, expires_in: int = 300):
    """
    Generate a presigned URL for downloading a file with proper Content-Disposition header.
    """
    return s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": AWS_BUCKET_NAME,
            "Key": key,
            "ResponseContentDisposition": f'attachment; filename="{filename}"'
        },
        ExpiresIn=expires_in
    )
