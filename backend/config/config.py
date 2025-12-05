import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # -----------------------------
    # Static Application Settings
    # -----------------------------
    PROJECT_NAME: str = "Rubik View"
    API_V1_STR: str = "/api/v1"

    BASE_DIR: str = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )

    # SQLite fallback
    SQLITE_USERS_DB: str = (
        f"sqlite:///{os.path.join(BASE_DIR, 'Data', 'rubikview_users.db')}"
    )

    # DuckDB
    DUCKDB_PATH: str = os.path.join(BASE_DIR, "Data", "OHCLV Data", "stocks.duckdb")

    # Security
    SECRET_KEY: str = "CHANGE_THIS_TO_A_SECURE_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Super Admin
    SUPERADMIN_EMAIL: str = "jallusandeep@rubikview.com"
    SUPERADMIN_PASSWORD: str = "8686504620SAn@#1"
    SUPERADMIN_FULL_NAME: str = "Rubikview Super Admin"
    SUPERADMIN_ROLE: str = "superadmin"

    # OTP
    OTP_CODE_LENGTH: int = 6
    OTP_EXPIRE_MINUTES: int = 10
    OTP_RESEND_SECONDS: int = 60

    # Telegram
    TELEGRAM_BOT_TOKEN: str | None = None
    TELEGRAM_DEFAULT_CHAT_ID: str | None = None

    # -----------------------------
    # Environment Selection
    # -----------------------------
    ENV_STATE: str = "dev"

    # -----------------------------
    # Postgres (Optional)
    # -----------------------------
    POSTGRES_USER: str | None = None
    POSTGRES_PASSWORD: str | None = None
    POSTGRES_DB: str | None = None
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # -----------------------------
    # Dynamic DB Selection
    # -----------------------------
    @property
    def DATABASE_URL(self):
        """Use Postgres if env vars exist, otherwise SQLite."""
        if (
            self.POSTGRES_USER
            and self.POSTGRES_PASSWORD
            and self.POSTGRES_DB
        ):
            return (
                f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )

        return self.SQLITE_USERS_DB

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
