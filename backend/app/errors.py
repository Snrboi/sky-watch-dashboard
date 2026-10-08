"""Typed errors and the one JSON error envelope: {"error": {"code", "source", "message"}}."""

from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    """Base error. Routes never build error bodies by hand."""

    status_code = 500
    code = "INTERNAL_ERROR"

    def __init__(self, message: str, *, source: str = "api") -> None:
        super().__init__(message)
        self.message = message
        self.source = source


class BadRequestError(AppError):
    status_code = 400
    code = "BAD_INPUT"


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class NotConfiguredError(AppError):
    """A required API key is missing from the environment."""

    status_code = 503
    code = "NOT_CONFIGURED"


class UpstreamUnavailableError(AppError):
    """An outside service failed, timed out, or sent something unusable."""

    status_code = 503
    code = "UPSTREAM_UNAVAILABLE"


def error_body(code: str, source: str, message: str) -> dict[str, dict[str, str]]:
    return {"error": {"code": code, "source": source, "message": message}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(exc.code, exc.source, exc.message),
        )

    @app.exception_handler(RequestValidationError)
    async def _handle_validation_error(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = exc.errors()
        first = errors[0] if errors else {}
        location = [
            str(part)
            for part in first.get("loc", ())
            if part not in ("body", "query", "path", "header")
        ]
        message = str(first.get("msg", "invalid input"))
        if location:
            message = f"{'.'.join(location)}: {message}"
        return JSONResponse(status_code=400, content=error_body("BAD_INPUT", "api", message))

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        if not request.url.path.startswith("/api"):
            return await http_exception_handler(request, exc)
        codes = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}
        code = codes.get(exc.status_code, "HTTP_ERROR")
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(code, "api", str(exc.detail)),
        )
