package com.example.LogicCircuit.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class User {
    private Long id;
    private String name;
    private String email;
    private String password;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public User() {}

    public User(Long id, String name, String email, String password, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
