package com.filmticket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordWithQuestionRequest {
    @NotBlank(message = "Email cannot be blank")
    private String email;

    @NotBlank(message = "Security answer cannot be blank")
    private String answer;

    @NotBlank(message = "New password cannot be blank")
    @Size(min = 6, message = "New password must be at least 6 characters")
    private String newPassword;
}
