# MAS Learning - 数字逻辑电路学习平台

一个多模块的在线学习平台，支持数字逻辑电路的学习和评估。

## 技术架构

```
┌─────────────┐
│   Frontend  │  Angular + TypeScript
│   (Port 80) │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│              Nginx (Port 80)            │
└──────┬──────────────────────────┬───────┘
       │                          │
       ▼                          ▼
┌─────────────┐           ┌─────────────────┐
│   Backend   │           │ circuit_backend │
│ (Port 8000) │           │   (Port 8080)   │
│  Python/FastAPI           │  Java/Spring Boot
└─────────────┘           └─────────────────┘
```

## 项目结构

```
MAS_learning-master/
├── docs/                 # 项目文档
├── frontend/            # Angular 前端应用
├── backend/             # Python FastAPI 后端 (AI/评估)
└── workflow_backend/    # Java Spring Boot 后端 (核心业务)
```

## 快速开始

### 环境要求

- Node.js 20+
- Python 3.12+
- Java 21
- MySQL 8.0+

### 本地开发

**前端**
```bash
cd frontend
npm install
ng serve
```

**Python 后端**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Java 后端**
```bash
cd circuit_backend
./mvnw spring-boot:run
```

## 文档

详细部署说明请参考 [docs/deployment.md](docs/deployment.md)
