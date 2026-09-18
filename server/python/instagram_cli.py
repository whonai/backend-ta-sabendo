#!/usr/bin/env python3
"""
CLI JSON stdin/stdout para Instagrapi.
Uso: echo '{"action":"get_stories","username":"bar"}' | python3 instagram_cli.py
"""
import json
import os
import sys
from typing import Any, Dict, List

try:
    import certifi

    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
except ImportError:
    pass


def respond_ok(data: Any) -> None:
    json.dump({"ok": True, "data": data}, sys.stdout)
    sys.stdout.write("\n")


def respond_err(message: str) -> None:
    json.dump({"ok": False, "error": message}, sys.stdout)
    sys.stdout.write("\n")
    sys.exit(1)


def log_step(message: str) -> None:
    sys.stderr.write(f"[instagram_cli] {message}\n")
    sys.stderr.flush()


def client():
    try:
        from instagrapi import Client
    except ImportError:
        respond_err("instagrapi not installed. Run: pip install -r server/python/requirements.txt")

    cl = Client()
    cl.delay_range = [1, 3]
    cl.set_locale("pt_BR")
    cl.set_timezone_offset(-10800)
    session_path = os.environ.get("INSTAGRAM_SESSION_PATH", "").strip()
    username = os.environ.get("INSTAGRAM_USERNAME", "").strip()
    password = os.environ.get("INSTAGRAM_PASSWORD", "").strip()
    session_id = os.environ.get("INSTAGRAM_SESSIONID", "").strip()

    if session_id:
        log_step("Login via INSTAGRAM_SESSIONID (cookie sessionid)…")
        cl.login_by_sessionid(session_id)
        if session_path:
            os.makedirs(os.path.dirname(session_path) or ".", exist_ok=True)
            cl.dump_settings(session_path)
            log_step(f"Sessão salva em {session_path}")
    elif session_path and os.path.isfile(session_path):
        log_step(f"Carregando sessão: {session_path}")
        cl.load_settings(session_path)
        if username:
            log_step(f"Login com sessão (usuário {username[:3]}***)…")
            cl.login(username, password or "")
    elif username and password:
        log_step(f"Login Instagram (usuário {username[:3]}***)…")
        cl.login(username, password)
        if session_path:
            os.makedirs(os.path.dirname(session_path) or ".", exist_ok=True)
            cl.dump_settings(session_path)
            log_step(f"Sessão salva em {session_path}")
    else:
        respond_err("INSTAGRAM_USERNAME/PASSWORD or INSTAGRAM_SESSION_PATH required")

    log_step("Login OK")
    return cl


def story_items(cl, username: str) -> List[Dict[str, Any]]:
    log_step(f"Resolvendo user_id de @{username}…")
    user_id = cl.user_id_from_username(username)
    log_step(f"user_id={user_id}, buscando stories…")
    stories = cl.user_stories(user_id)
    log_step(f"{len(stories)} story/stories recebidos do Instagram")
    out: List[Dict[str, Any]] = []
    for s in stories:
        media_type = "video" if s.media_type == 2 else "image"
        url = str(s.video_url or s.thumbnail_url or "")
        out.append(
            {
                "mediaId": str(s.pk),
                "username": username,
                "mediaType": media_type,
                "mediaUrl": url,
                "thumbnailUrl": str(s.thumbnail_url or ""),
                "timestamp": s.taken_at.isoformat() if s.taken_at else "",
                "permalink": f"https://instagram.com/stories/{username}/{s.pk}",
            }
        )
    return out


def post_items(cl, username: str, limit: int) -> List[Dict[str, Any]]:
    user_id = cl.user_id_from_username(username)
    medias = cl.user_medias(user_id, amount=min(limit, 50))
    out: List[Dict[str, Any]] = []
    for m in medias:
        media_type = "video" if m.media_type == 2 else "image"
        url = str(m.video_url or m.thumbnail_url or m.resources[0].thumbnail_url if m.resources else "")
        out.append(
            {
                "mediaId": str(m.pk),
                "username": username,
                "mediaType": media_type,
                "mediaUrl": url,
                "thumbnailUrl": str(m.thumbnail_url or ""),
                "caption": m.caption_text or "",
                "timestamp": m.taken_at.isoformat() if m.taken_at else "",
                "permalink": f"https://instagram.com/p/{m.code}/",
            }
        )
    return out


def profile_info(cl, username: str) -> Dict[str, Any]:
    u = cl.user_info_by_username(username)
    return {
        "username": username,
        "fullName": u.full_name or "",
        "biography": u.biography or "",
        "profilePicUrl": str(u.profile_pic_url or ""),
        "externalUrl": u.external_url or "",
    }


def main() -> None:
    try:
        raw = sys.stdin.read()
        req = json.loads(raw or "{}")
    except json.JSONDecodeError:
        respond_err("invalid JSON on stdin")

    action = req.get("action")
    username = (req.get("username") or "").strip().lstrip("@")
    if not username:
        respond_err("username is required")

    try:
        cl = client()
        if action == "get_profile":
            respond_ok(profile_info(cl, username))
        elif action == "get_stories":
            respond_ok(story_items(cl, username))
        elif action == "get_posts":
            limit = int(req.get("limit") or 12)
            respond_ok(post_items(cl, username, limit))
        else:
            respond_err(f"unknown action: {action}")
    except Exception as e:
        respond_err(str(e))


if __name__ == "__main__":
    main()
