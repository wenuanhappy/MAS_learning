package com.example.LogicCircuit.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data

public class Workflow {
    private Long id;
    private int userId;
    private String name;
    private String workflowJson;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}