package com.example.LogicCircuit.common;

import lombok.Data;

@Data
public class ResponseResult<T> {
    // Getter & Setter
    private int code;         // 状态码，如 200、400、500
    private String message;   // 描述信息
    private T data;           // 返回的数据内容（泛型）

    public ResponseResult() {}

    public ResponseResult(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    // 快捷构造方法
    public static <T> ResponseResult<T> success(T data) {
        return new ResponseResult<>(200, "Success", data);
    }

    public static <T> ResponseResult<T> success(String message, T data) {
        return new ResponseResult<>(200, message, data);
    }

    public static <T> ResponseResult<T> fail(int code, String message) {
        return new ResponseResult<>(code, message, null);
    }
}
