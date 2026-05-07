package com.alper.backend.user.dto;

import java.util.List;

public record SecurityStatusResponse(
        boolean otpEnabled,
        List<OtpCredential> otpCredentials
) {


    public record OtpCredential(
            String id,
            String label,
            Long createdAt
    ) {
    }
}
