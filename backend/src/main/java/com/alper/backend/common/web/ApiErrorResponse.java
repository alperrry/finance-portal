package com.alper.backend.common.web;

import java.time.OffsetDateTime;

public record ApiErrorResponse(
    OffsetDateTime timestamp,
    int status,
    String error,
    String message,
    String path
) {}
