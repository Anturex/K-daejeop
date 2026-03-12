from __future__ import annotations

import logging

from app.main import HealthCheckFilter


class TestHealthCheckFilter:
    def setup_method(self):
        self.filt = HealthCheckFilter()

    def _make_record(self, msg: str) -> logging.LogRecord:
        return logging.LogRecord(
            name="uvicorn.access",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg=msg,
            args=(),
            exc_info=None,
        )

    def test_filters_health_check_request(self):
        record = self._make_record('127.0.0.1 - "GET /api/health HTTP/1.1" 200')
        assert self.filt.filter(record) is False

    def test_passes_other_requests(self):
        record = self._make_record('127.0.0.1 - "GET /api/places?query=test HTTP/1.1" 200')
        assert self.filt.filter(record) is True

    def test_passes_post_request(self):
        record = self._make_record('127.0.0.1 - "POST /api/auth/me HTTP/1.1" 200')
        assert self.filt.filter(record) is True

    def test_filters_health_in_any_position(self):
        record = self._make_record('GET /api/health 200 OK')
        assert self.filt.filter(record) is False
