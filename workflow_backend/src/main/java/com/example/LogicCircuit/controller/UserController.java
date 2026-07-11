package com.example.LogicCircuit.controller;

import com.example.LogicCircuit.dto.request.UserLoginRequest;
import com.example.LogicCircuit.dto.request.UserRegisterRequest;
import com.example.LogicCircuit.common.ResponseResult;

import com.example.LogicCircuit.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/webpj/user")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * 用户注册
     */
    @PostMapping("/register")
    public ResponseResult<?> register(@RequestBody UserRegisterRequest userRegisterRequest) {
        return userService.register(userRegisterRequest);
    }

    /**
     * 用户登录
     */
    @PostMapping("/login")
    public ResponseResult<?> login(@RequestBody UserLoginRequest userLoginRequest) {
        return userService.login(userLoginRequest);
    }

}
