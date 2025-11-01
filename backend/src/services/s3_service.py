import os
try:
    import boto3
except Exception:
    boto3 = None

def generate_presigned_put(bucket: str, key: str, content_type: str, expires_in: int = 600):
    if boto3 is None:
        return ""
    s3 = boto3.client("s3", region_name=os.getenv("AWS_REGION"))
    return s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=expires_in,
    )
