package com.example.LogicCircuit.dto.request;

import lombok.Data;

@Data
public class UserRegisterRequest {

    private String name;
    private String email;
    private String password;

    public UserRegisterRequest(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
    }
}
