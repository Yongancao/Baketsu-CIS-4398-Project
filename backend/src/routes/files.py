from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..schemas import PresignRequest
from ..deps import get_db, get_current_user
from ..config import settings
import uuid

router = APIRouter()


@router.post("/presign")
def presign(req: PresignRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # create S3 key
    key = f"users/{user.id}/{uuid.uuid4().hex}_{req.filename}".replace(" ", "_")
    bucket = settings.S3_BUCKET_NAME
    if not bucket:
        return {"upload_url": "", "key": key, "expires_in": 0, "note": "S3 not configured"}

    # generate presign using boto3
    try:
        import boto3

        s3 = boto3.client("s3", region_name=settings.AWS_REGION)
        url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={"Bucket": bucket, "Key": key, "ContentType": req.content_type},
            ExpiresIn=600,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"upload_url": url, "key": key, "expires_in": 600}


@router.post("/complete")
def complete(key: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # TODO: verify object exists and create DB record
    return {"msg": "complete (stub)", "key": key}
