
import cloudinary
import cloudinary.uploader

from app.core.config import settings


def configure_cloudinary():
    if not all([
        settings.cloudinary_cloud_name,
        settings.cloudinary_api_key,
        settings.cloudinary_api_secret,
    ]):
        raise RuntimeError("Cloudinary credentials are not configured.")

    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


def upload_image(contents: bytes, folder: str, public_id: str) -> str:
    configure_cloudinary()

    result = cloudinary.uploader.upload(
        contents,
        folder=folder,
        public_id=public_id,
        resource_type="image",
        overwrite=False,
    )

    return result["secure_url"]


def delete_image(image_url: str):
    if not image_url or "res.cloudinary.com" not in image_url:
        return

    configure_cloudinary()

    path = image_url.split("/image/upload/", 1)

    if len(path) != 2:
        return

    public_id = path[1]
    parts = public_id.split("/")

    if parts and parts[0].startswith("v") and parts[0][1:].isdigit():
        parts = parts[1:]

    public_id = "/".join(parts)

    if "." in public_id:
        public_id = public_id.rsplit(".", 1)[0]

    cloudinary.uploader.destroy(public_id, resource_type="image")
