package com.alper.backend.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateUserRequest {

    @Size(min = 1, max = 100, message = "Ad 1-100 karakter olmalıdır")
    private String firstName;

    @Size(min = 1, max = 100, message = "Soyad 1-100 karakter olmalıdır")
    private String lastName;

    @Email(message = "Geçerli bir e-posta adresi girin")
    @Size(max = 255)
    private String email;
}