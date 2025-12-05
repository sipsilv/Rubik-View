# backend/notifications/telegram.py

import logging
import httpx
from typing import Optional
from config.config import settings
from .base import NotificationStrategy

logger = logging.getLogger(__name__)


class TelegramNotification(NotificationStrategy):
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.default_chat = settings.TELEGRAM_DEFAULT_CHAT_ID

    async def send(self, chat_id: Optional[str], message: str) -> bool:
        if not message:
            return False

        target_chat = chat_id or self.default_chat

        if not self.bot_token or not target_chat:
            logger.info("[TELEGRAM STUB] chat=%s msg=%s", target_chat, message)
            return False

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json={"chat_id": target_chat, "text": message})
                res.raise_for_status()

            logger.info("Telegram message delivered to %s", target_chat)
            return True

        except Exception as exc:
            logger.error("Telegram error: %s", exc)
            return False
