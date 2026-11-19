
import uuid
from pathlib import Path
from io import BytesIO

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.services.cloudinary_storage import upload_image

UPLOAD_DIR = Path("uploads") / "profiles"
MAX_FILE_SIZE = 5 * 1024 * 1024

ALLOWED_FORMATS = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
}


def save_profile_photo(
    upload: UploadFile,
    user_id: int,
    prefix: str = "student",
) -> str:
    try:
        contents = upload.file.read(MAX_FILE_SIZE + 1)

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty."
            )

        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Image must be 5 MB or smaller."
            )

        try:
            image = Image.open(BytesIO(contents))
            image.verify()

            image = Image.open(BytesIO(contents))
            image_format = image.format

            if image_format not in ALLOWED_FORMATS:
                raise HTTPException(
                    status_code=400,
                    detail="Only JPG, PNG and WebP images are supported.",
                )

            if image.width < 1 or image.height < 1:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid image dimensions."
                )

            if image.width > 6000 or image.height > 6000:
                raise HTTPException(
                    status_code=400,
                    detail="Image dimensions are too large."
                )

            image.load()

        except (
            UnidentifiedImageError,
            OSError,
            Image.DecompressionBombError
        ):
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is not a valid image."
            )

        extension = ALLOWED_FORMATS[image_format]

        filename = (
            f"{prefix}_{user_id}_{uuid.uuid4().hex}{extension}"
        )

        if settings.app_env == "production":
            return upload_image(
                contents=contents,
                folder="kdc-fixflow/profiles",
                public_id=Path(filename).stem,
            )

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        destination = UPLOAD_DIR / filename

        with destination.open("xb") as file:
            file.write(contents)

        return f"/uploads/profiles/{filename}"

    finally:
        upload.file.close()
