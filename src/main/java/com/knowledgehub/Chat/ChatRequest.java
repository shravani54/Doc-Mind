package com.knowledgehub.Chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ChatRequest(
        @NotBlank @Size(max = 64) @Pattern(regexp = "[A-Za-z0-9]+",message = "must contain only letters, digits and dashes") String conversationId,
        @NotBlank @Size(max = 4000) String message,
        List<Long> documentIds
) {}
