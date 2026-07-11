package com.example.LogicCircuit.mapper;

import com.example.LogicCircuit.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMapper {

    User findByEmail(@Param("email") String email);
    int insertUser(User user);
}
