# backend/notifications/manager.py
from typing import Optional
from .telegram import TelegramNotification

class NotificationManager:
    def __init__(self):
        self.telegram = TelegramNotification()

    async def telegram_message(self, chat_id: Optional[str], message: str) -> bool:
        return await self.telegram.send(chat_id, message)


# Singleton instance used across app
notification_manager = NotificationManager()
