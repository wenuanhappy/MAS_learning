package com.example.LogicCircuit.dto.response;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class UserLoginResponse {
    private Long id;
    private String email;
    private String name;
    private LocalDateTime createdAt;

    public UserLoginResponse() {}

    public UserLoginResponse(Long id, String name, String email, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.createdAt = createdAt;
    }
}
