package com.example.LogicCircuit.service;

import com.example.LogicCircuit.common.ResponseResult;
import com.example.LogicCircuit.dto.request.SaveWorkflowRequest;

public interface WorkflowService {
    ResponseResult<?> saveWorkflow(SaveWorkflowRequest request);
    ResponseResult<?> getWorkflow(Long id);
    ResponseResult<?> getUserWorkflows(int userId);
}