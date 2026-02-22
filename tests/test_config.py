from __future__ import annotations

import os
from unittest.mock import patch

from app.core.config import Settings, _resolve_env_file, get_settings


class TestResolveEnvFile:
    """_resolve_env_file 유틸 테스트."""

    def test_returns_none_when_no_files_exist(self, tmp_path):
        with patch("app.core.config.os.path.exists", return_value=False):
            assert _resolve_env_file("production") is None

    def test_returns_env_file_for_app_env(self, tmp_path):
        """`.env.{app_env}` 파일이 존재하면 해당 파일을 반환합니다."""

        def fake_exists(path):
            return path == ".env.staging"

        with patch("app.core.config.os.path.exists", side_effect=fake_exists):
            assert _resolve_env_file("staging") == ".env.staging"

    def test_falls_back_to_dot_env(self, tmp_path):
        """`.env.{app_env}` 없고 `.env`만 있으면 .env를 반환합니다."""

        def fake_exists(path):
            return path == ".env"

        with patch("app.core.config.os.path.exists", side_effect=fake_exists):
            assert _resolve_env_file("production") == ".env"


class TestSettings:
    """Settings 모델 기본값 테스트."""

    def test_default_values(self, settings):
        assert settings.app_name == "k-daejeop"
        assert settings.host == "127.0.0.1"
        assert settings.port == 5173
        assert settings.log_level == "info"

    def test_kakao_keys_from_env(self, settings):
        assert settings.kakao_js_key == "test_js_key"
        assert settings.kakao_rest_key == "test_rest_key"

    def test_kakao_default_urls(self, settings):
        assert "keyword.json" in settings.kakao_places_url
        assert "sdk.js" in settings.kakao_sdk_url

    def test_kakao_request_timeout_default(self, settings):
        assert settings.kakao_request_timeout == 7.0


class TestSettingsEnvOverride:
    """환경 변수로 Settings 값 오버라이드 테스트."""

    def test_override_port(self):
        with patch.dict(os.environ, {"PORT": "9999"}):
            get_settings.cache_clear()
            s = get_settings()
            assert s.port == 9999

    def test_override_app_name(self):
        with patch.dict(os.environ, {"APP_NAME": "my-custom-app"}):
            get_settings.cache_clear()
            s = get_settings()
            assert s.app_name == "my-custom-app"

    def test_override_log_level(self):
        with patch.dict(os.environ, {"LOG_LEVEL": "debug"}):
            get_settings.cache_clear()
            s = get_settings()
            assert s.log_level == "debug"

    def test_override_kakao_timeout(self):
        with patch.dict(os.environ, {"KAKAO_REQUEST_TIMEOUT": "3.5"}):
            get_settings.cache_clear()
            s = get_settings()
            assert s.kakao_request_timeout == 3.5


class TestGetSettings:
    """get_settings 캐싱 동작 테스트."""

    def test_returns_settings_instance(self):
        s = get_settings()
        assert isinstance(s, Settings)

    def test_caching(self):
        s1 = get_settings()
        s2 = get_settings()
        assert s1 is s2

    def test_respects_app_env(self):
        """APP_ENV에 따라 해당 env 파일을 찾으려 시도합니다."""
        with patch.dict(os.environ, {"APP_ENV": "production"}):
            get_settings.cache_clear()
            s = get_settings()
            # production env 파일이 없어도 기본값으로 생성됨
            assert isinstance(s, Settings)
