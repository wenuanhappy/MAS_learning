package com.example.LogicCircuit.dto.request;

import lombok.Data;

@Data
public class UserLoginRequest {
    private String email;
    private String password;

    public UserLoginRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }
}
