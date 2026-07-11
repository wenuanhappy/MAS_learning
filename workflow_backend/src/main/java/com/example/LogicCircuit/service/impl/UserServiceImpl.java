package com.example.LogicCircuit.service.impl;

import com.example.LogicCircuit.dto.request.UserRegisterRequest;
import com.example.LogicCircuit.dto.request.UserLoginRequest;
import com.example.LogicCircuit.dto.response.UserLoginResponse;
import com.example.LogicCircuit.entity.User;
import com.example.LogicCircuit.mapper.UserMapper;
import com.example.LogicCircuit.service.UserService;
import com.example.LogicCircuit.common.ResponseResult;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDateTime;

@Service
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;

    @Autowired
    public UserServiceImpl(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @Override
    public ResponseResult<?> register(UserRegisterRequest request) {
        User existing = userMapper.findByEmail(request.getEmail());
        if (existing != null) {
            return ResponseResult.fail(400, "邮箱已注册");
        }

        // 使用 BCrypt 加密密码
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String encodedPassword = encoder.encode(request.getPassword());

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(encodedPassword);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        userMapper.insertUser(user);

        return ResponseResult.success("注册成功", null);
    }

    @Override
    public ResponseResult<?> login(UserLoginRequest request) {
        User user = userMapper.findByEmail(request.getEmail());
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        if (user == null || !encoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseResult.fail(401, "邮箱或密码错误");
        }

        UserLoginResponse response = new UserLoginResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getCreatedAt()
        );

        return ResponseResult.success("登录成功", response);
    }
}
