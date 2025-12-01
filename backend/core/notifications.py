import logging
from typing import Optional

import httpx

from .config import settings

logger = logging.getLogger(__name__)


def send_telegram_message(chat_id: Optional[str], message: str) -> bool:
    """
    Send a telegram message if credentials are present, otherwise log stub output.
    """
    if not message:
        return False

    bot_token = settings.TELEGRAM_BOT_TOKEN
    target_chat_id = chat_id or settings.TELEGRAM_DEFAULT_CHAT_ID

    if not bot_token or not target_chat_id:
        logger.info("[TELEGRAM STUB] chat_id=%s message=%s", target_chat_id, message)
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        response = httpx.post(
            url,
            json={"chat_id": target_chat_id, "text": message},
            timeout=10.0,
        )
        response.raise_for_status()
        logger.info("Telegram message delivered to %s", target_chat_id)
        return True
    except httpx.HTTPError as exc:
        logger.error("Telegram message failed: %s", exc)
        return False

