package com.example.LogicCircuit.service.impl;

import com.example.LogicCircuit.common.ResponseResult;
import com.example.LogicCircuit.dto.request.SaveWorkflowRequest;
import com.example.LogicCircuit.entity.Workflow;
import com.example.LogicCircuit.mapper.WorkflowMapper;
import com.example.LogicCircuit.service.WorkflowService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class WorkflowServiceImpl
        implements WorkflowService {

    private final WorkflowMapper workflowMapper;

    @Autowired
    public WorkflowServiceImpl(
            WorkflowMapper workflowMapper
    ) {
        this.workflowMapper = workflowMapper;
    }

    @Override
    public ResponseResult<?> saveWorkflow(
            SaveWorkflowRequest request
    ) {

        Workflow workflow = new Workflow();

        workflow.setName(
                request.getName()
        );
        workflow.setId(request.getId());
        workflow.setUserId(request.getUserId());
        workflow.setWorkflowJson(
                request.getWorkflowJson()
        );

        workflow.setCreatedAt(
                LocalDateTime.now()
        );

        workflow.setUpdatedAt(
                LocalDateTime.now()
        );

        if (workflow.getId() == null) {

            workflowMapper.insertWorkflow(workflow);

        } else {

            workflowMapper.updateWorkflow(workflow);

        }

        return ResponseResult.success(
                "保存成功",
                workflow.getId()
        );
    }

    @Override
    public ResponseResult<?> getWorkflow(
            Long id
    ) {

        Workflow workflow =
                workflowMapper.findById(id);

        return ResponseResult.success(
                "查询成功",
                workflow
        );
    }
    @Override
    public ResponseResult<?> getUserWorkflows(int userId) {

        List<Workflow> workflows =
                workflowMapper.findByUserId(userId);

        return ResponseResult.success(
                "查询成功",
                workflows
        );
    }
}