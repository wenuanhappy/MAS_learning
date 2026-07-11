# 项目概览

## 项目简介

MAS Learning 是一个数字逻辑电路学习平台，采用多模块架构设计。

## 技术栈

| 模块 | 技术栈 | 端口 |
|------|--------|------|
| frontend | Angular + TypeScript | - |
| backend | Python 3.12 + FastAPI | 8000 |
| workflow_backend | Java 21 + Spring Boot | 8080 |

## 项目结构

```
MAS_learning-master/
├── docs/                    # 项目文档
├── frontend/               # Angular 前端
├── backend/                # Python FastAPI 后端
│   └── app/
│       ├── config/         # 配置文件
│       ├── evaluator/      # 评估器模块
│       ├── graph/          # 图相关模块
│       └── llm/            # LLM 客户端
├── workflow_backend/        # Java Spring Boot 后端
│   ├── src/main/java/      # Java 源码
│   └── src/main/resources/ # 配置文件
└── README.md
```

## 开发环境要求

- Node.js 20+
- Python 3.12+
- Java 21
- MySQL 8.0+
- Maven 3.6+
