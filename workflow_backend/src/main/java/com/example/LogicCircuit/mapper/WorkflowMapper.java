package com.example.LogicCircuit.mapper;

import com.example.LogicCircuit.entity.Workflow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface WorkflowMapper {
    int insertWorkflow(Workflow workflow);
    Workflow findById(Long id);
    List<Workflow> findByUserId(@Param("userId") int userId);
    int updateWorkflow(Workflow workflow);
}