import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Rubik View"
    API_V1_STR: str = "/api/v1"
    
    # Database
    # Resolve absolute path to Data directory
    # config.py is in backend/core/ -> up 3 levels to Rubik_view
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATABASE_URL: str = f"sqlite:///{os.path.join(BASE_DIR, 'Data', 'rubikview_users.db').replace('\\', '/')}" # For user data
    DUCKDB_PATH: str = os.path.join(BASE_DIR, "Data", "OHCLV Data", "stocks.duckdb") # Existing market data
    
    # Security
    SECRET_KEY: str = "CHANGE_THIS_TO_A_SECURE_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Super Admin bootstrap
    SUPERADMIN_EMAIL: str = "jallusandeep@rubikview.com"
    SUPERADMIN_PASSWORD: str = "8686504620SAn@#1"
    SUPERADMIN_FULL_NAME: str = "Rubikview Super Admin"
    SUPERADMIN_ROLE: str = "superadmin"

    # OTP settings
    OTP_CODE_LENGTH: int = 6
    OTP_EXPIRE_MINUTES: int = 10
    OTP_RESEND_SECONDS: int = 60

    # Telegram integration (optional)
    TELEGRAM_BOT_TOKEN: str | None = None
    TELEGRAM_DEFAULT_CHAT_ID: str | None = None

    class Config:
        env_file = ".env"

settings = Settings()
