package com.example.LogicCircuit.dto.request;

import lombok.Data;

@Data

public class SaveWorkflowRequest {
    private int userId;
    private String name;
    private String workflowJson;
    private Long id;
}