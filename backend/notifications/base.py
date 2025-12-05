# backend/notifications/base.py
from abc import ABC, abstractmethod


class NotificationStrategy(ABC):
    @abstractmethod
    async def send(self, recipient: str, message: str) -> bool:
        """Send a notification to a single recipient."""
        pass
