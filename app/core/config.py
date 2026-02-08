from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

from pydantic import BaseSettings, Field


def _resolve_env_file(app_env: str) -> Optional[str]:
    candidate = f".env.{app_env}"
    if os.path.exists(candidate):
        return candidate
    if os.path.exists(".env"):
        return ".env"
    return None


class Settings(BaseSettings):
    app_name: str = Field("k-daejeop", env="APP_NAME")
    host: str = Field("127.0.0.1", env="HOST")
    port: int = Field(5173, env="PORT")
    log_level: str = Field("info", env="LOG_LEVEL")

    kakao_js_key: str = Field("", env="KAKAO_JS_KEY")
    kakao_rest_key: str = Field("", env="KAKAO_REST_KEY")
    kakao_places_url: str = Field(
        "https://dapi.kakao.com/v2/local/search/keyword.json",
        env="KAKAO_PLACES_URL",
    )
    kakao_sdk_url: str = Field(
        "https://dapi.kakao.com/v2/maps/sdk.js",
        env="KAKAO_SDK_URL",
    )
    kakao_request_timeout: float = Field(7.0, env="KAKAO_REQUEST_TIMEOUT")

    class Config:
        env_file_encoding = "utf-8"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    app_env = os.getenv("APP_ENV", "development")
    env_file = _resolve_env_file(app_env)
    if env_file:
        return Settings(_env_file=env_file)
    return Settings()
