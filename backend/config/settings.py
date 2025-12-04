from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class BaseConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # default environment
    ENV_STATE: str = "dev"


# -------------------------
# ENV: DEVELOPMENT
# -------------------------
class DevConfig(BaseConfig):
    model_config = SettingsConfigDict(env_prefix="DEV_")

    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    @property
    def DATABASE_URL(self):
        return (
            f"postgresql://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/"
            f"{self.POSTGRES_DB}"
        )


# -------------------------
# ENV: PRODUCTION
# -------------------------
class ProdConfig(BaseConfig):
    model_config = SettingsConfigDict(env_prefix="PROD_")

    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int = 5432

    @property
    def DATABASE_URL(self):
        return (
            f"postgresql://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/"
            f"{self.POSTGRES_DB}"
        )


# -------------------------
# ENV: TESTING
# -------------------------
class TestConfig(BaseConfig):
    model_config = SettingsConfigDict(env_prefix="TEST_")
    DATABASE_URL: str = "sqlite:///test.db"
    DB_FORCE_ROLL_BACK: bool = True


# -------------------------
# ENV RESOLVER
# -------------------------
@lru_cache
def get_config(env_state: str):
    configs = {
        "dev": DevConfig,
        "prod": ProdConfig,
        "test": TestConfig,
    }

    if env_state not in configs:
        raise ValueError(f"Invalid ENV_STATE='{env_state}'. Must be dev|prod|test")

    return configs[env_state]()


config = get_config(BaseConfig().ENV_STATE)

