package com.example.LogicCircuit.controller;

import com.example.LogicCircuit.common.ResponseResult;
import com.example.LogicCircuit.dto.request.SaveWorkflowRequest;
import com.example.LogicCircuit.service.WorkflowService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/webpj/workflow")
@CrossOrigin(origins = "*")
public class WorkflowController {

    private final WorkflowService workflowService;

    @Autowired
    public WorkflowController(
            WorkflowService workflowService
    ) {
        this.workflowService = workflowService;
    }

    @PostMapping("/save")
    public ResponseResult<?> saveWorkflow(

            @RequestBody
            SaveWorkflowRequest request
    ) {

        return workflowService
                .saveWorkflow(request);
    }

    @GetMapping("/{id}")
    public ResponseResult<?> getWorkflow(@PathVariable Long id) {
        return workflowService.getWorkflow(id);
    }

    @GetMapping("/list/{userId}")
    public ResponseResult<?> getUserWorkflows(@PathVariable int userId) {
        return workflowService.getUserWorkflows(userId);
    }
}