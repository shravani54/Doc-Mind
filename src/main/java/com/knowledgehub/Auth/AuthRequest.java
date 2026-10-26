package com.knowledgehub.Auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AuthRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 100,
                message = "Password must be 8 to 100 characters" ) String password) { }
