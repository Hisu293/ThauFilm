package com.filmticket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore; // Import thêm để ẩn câu trả lời khi trả về API

import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    @JsonIgnore // Tránh lộ password ra API công khai
    private String password;

    private String fullName;

    @Pattern(regexp = "^[0-9]{10,11}$", message = "Phone number must be 10-11 digits")
    private String phone;

    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AuthProvider provider = AuthProvider.EMAIL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.MEMBER;

    @Builder.Default
    private boolean enabled = true;

    // --- BỔ SUNG THÊM 2 TRƯỜNG CHO TÍNH NĂNG ĐẶC BIỆT ---

    @Column(name = "security_question")
    private String securityQuestion; // Ví dụ: "Tên trường tiểu học của bạn là gì?"

    @JsonIgnore // BẮT BUỘC: Ẩn câu trả lời để mentor thấy bạn xử lý security rất kỹ
    @Column(name = "security_answer")
    private String securityAnswer;   // Lưu câu trả lời đã CHUẨN HÓA + BĂM (Hash) bằng BCrypt

    // ---------------------------------------------------

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    public enum Role {
        ADMIN, MEMBER, STAFF
    }

    public enum AuthProvider {
        EMAIL, GOOGLE
    }
}