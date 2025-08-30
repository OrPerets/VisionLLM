from __future__ import annotations

import base64
import hashlib
import os
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse

from ..config import settings
from ..db import get_db
from .. import models
from ..auth import SESSION_USER_KEY
from sqlalchemy.orm import Session


router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    # In no-auth mode, return a stub user to enable end-to-end flow
    if not settings.enable_auth:
        return {"user": {"id": 0, "email": None, "name": "Guest", "avatar_url": None, "role": "admin"}}
    user_id = request.session.get(SESSION_USER_KEY)
    if not user_id:
        return {"user": None}
    user = db.query(models.User).get(int(user_id))
    return {"user": {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "role": user.role,
    }}


@router.get("/logout")
def logout(request: Request):
    request.session.clear()
    return {"ok": True}


def _random_string(n: int = 32) -> str:
    return base64.urlsafe_b64encode(os.urandom(n)).decode().rstrip("=")


@router.get("/login/google")
def login_google(request: Request):
    if not settings.google_client_id or not settings.google_redirect_uri:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    state = _random_string()
    request.session["oauth_state"] = state
    code_verifier = _random_string(64)
    request.session["pkce_verifier"] = code_verifier
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode().rstrip("=")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth"
    query = "&".join([f"{k}={httpx.QueryParams({k: v})[k]}" for k, v in params.items()])
    return RedirectResponse(url=f"{url}?{query}")


@router.get("/callback")
async def oauth_callback(request: Request, code: str, state: str, db: Session = Depends(get_db)):
    if state != request.session.get("oauth_state"):
        raise HTTPException(status_code=400, detail="Invalid state")
    verifier = request.session.get("pkce_verifier")
    if not verifier:
        raise HTTPException(status_code=400, detail="Missing verifier")

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_redirect_uri,
        "grant_type": "authorization_code",
        "code_verifier": verifier,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(token_url, data=data)
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="OAuth exchange failed")
        tokens = resp.json()
        id_token = tokens.get("id_token")
        if not id_token:
            raise HTTPException(status_code=400, detail="Missing id_token")

        # Decode JWT header.payload (insecure parse; for prod verify signature)
        try:
            payload_part = id_token.split(".")[1]
            payload_part += "=" * (-len(payload_part) % 4)
            payload_json = base64.urlsafe_b64decode(payload_part)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid id_token")

        import json

        claims = json.loads(payload_json)
        email = claims.get("email")
        name = claims.get("name")
        picture = claims.get("picture")
        hd = claims.get("hd")

        # Domain allowlist
        if settings.allowed_google_domains:
            allowed = [d.strip().lower() for d in settings.allowed_google_domains.split(",") if d.strip()]
            if email and "@" in email:
                domain = email.split("@")[-1].lower()
                if domain not in allowed:
                    raise HTTPException(status_code=403, detail="Domain not allowed")

        # Upsert user
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            user = models.User(email=email)
        user.name = name
        user.avatar_url = picture

        # Bootstrap admins by email if provided
        if settings.admin_emails:
            admin_set = {e.strip().lower() for e in settings.admin_emails.split(",") if e.strip()}
            if email and email.lower() in admin_set:
                user.role = "admin"
        db.add(user)
        db.commit()
        db.refresh(user)

        request.session[SESSION_USER_KEY] = user.id

    # Redirect back to frontend after login
    target = settings.frontend_url
    if not target:
        # fallback to first CORS origin if provided
        try:
            first = (settings.cors_origin or "").split(",")[0].strip()
            target = first or ""
        except Exception:
            target = ""
    return RedirectResponse(url=target)


