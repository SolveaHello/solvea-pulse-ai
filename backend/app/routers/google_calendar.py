from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.user import User
from app.services.google_calendar_service import encrypt_tokens

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.post("/store-calendar-tokens")
async def store_calendar_tokens(body: dict, db: AsyncSession = Depends(get_db)):
    """Encrypt and store Google OAuth tokens for a user."""
    clerk_user_id = body.get("clerkUserId")
    tokens = body.get("tokens")

    if not clerk_user_id or not tokens:
        raise HTTPException(status_code=400, detail="clerkUserId and tokens required")

    result = await db.execute(select(User).where(User.clerk_id == clerk_user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    encrypted = encrypt_tokens(tokens)
    user.google_calendar_tokens = encrypted
    await db.commit()

    return {"ok": True}
