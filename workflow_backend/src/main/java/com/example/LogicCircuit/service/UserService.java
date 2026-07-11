package com.example.LogicCircuit.service;

import com.example.LogicCircuit.dto.request.UserRegisterRequest;
import com.example.LogicCircuit.dto.request.UserLoginRequest;
import com.example.LogicCircuit.common.ResponseResult;

public interface UserService {
    ResponseResult<?> register(UserRegisterRequest request);

    ResponseResult<?> login(UserLoginRequest request);

}
