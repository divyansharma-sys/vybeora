"""
Standardized exception handling for Vybeora API.
Formats error responses consistently across all endpoints.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler returning predictable JSON error payloads.
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_payload = {
            "success": False,
            "error": {
                "status_code": response.status_code,
                "message": (
                    response.data.get("detail")
                    if isinstance(response.data, dict) and "detail" in response.data
                    else "A request validation error occurred."
                ),
                "details": response.data,
            },
        }
        response.data = error_payload
        return response

    # Unhandled server errors (500)
    return Response(
        {
            "success": False,
            "error": {
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "message": "An unexpected internal server error occurred.",
                "details": str(exc),
            },
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
