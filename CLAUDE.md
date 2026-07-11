# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MAS Learning is a digital logic circuit learning platform with three main components. The Angular frontend provides the user interface, the Java Spring Boot backend handles core business logic and data persistence, and the Python FastAPI backend provides AI-powered evaluation and multi-agent workflow capabilities.

## Architecture

```
┌─────────────┐
│   Frontend  │  Angular 21 + TypeScript
│   (Port 80) │  Served via Nginx
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
│  LangGraph/LangChain      │  MySQL/MyBatis
└─────────────┘           └─────────────────┘
```

### Backend Python (`backend/`)
- **FastAPI** application running on port 8000
- **LangGraph/LangChain** for multi-agent workflow orchestration
- **LLM integration** via `app/llm/client.py`
- Graph-based agents defined in JSON configs (`app/config/*.json`)
- Evaluators for learning effectiveness assessment (`app/evaluator/`)

Key state structure (`app/graph/state.py`):
- `messages`: List of agent messages
- `history`: Execution history with transitions
- `context`/`task_goal`: Current task context
- `current_node`: Current graph node
- `condition`: For conditional branching

### Circuit Backend Java (`workflow_backend/`)
- **Spring Boot 3.4.5** with Java 21, running on port 8080
- **MyBatis** for database access
- **Spring Security** for authentication
- Core entities: `User`, `Workflow`
- REST API endpoints under `/webpj/` path
- Database: MySQL `logic_circuit`, schema in `src/SQLfiles/init.sql`

## Development Commands

### Frontend (Angular)
```bash
cd frontend
npm install
ng serve          # Development server
npm run build     # Production build
ng test           # Run tests (uses Vitest)
```

### Backend Python
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Circuit Backend Java
```bash
cd circuit_backend
./mvnw spring-boot:run         # Development
./mvnw clean package -DskipTests  # Production build
java -jar target/LogicCircuit-0.0.1-SNAPSHOT.jar  # Run JAR
```

## API Endpoints

### Python Backend (port 8000)
| Endpoint | Description |
|----------|-------------|
| `POST /run_cycle` | Run full agent workflow cycle |
| `POST /step` | Execute single workflow step |
| `POST /agent_chat` | Chat with specific agent role |
| `POST /evaluate_learning` | LLM-based learning evaluation |
| `POST /evaluate_learning_interactive` | Interactive learning assessment |
| `POST /hide_seek_action` | Game action for hide-and-seek agent |

### Java Backend (port 8080, base path `/webpj/`)
| Endpoint | Description |
|----------|-------------|
| `POST /user/login` | User authentication |
| `POST /user/register` | User registration |
| `GET /workflow/list` | List user workflows |
| `POST /workflow/save` | Save workflow |
| `POST /workflow/run` | Execute workflow |

## Database

- Database name: `logic_circuit`
- Initialize with `circuit_backend/src/SQLfiles/init.sql`
- Configure password in `circuit_backend/src/main/resources/application.properties`

## Frontend Services

Key Angular services in `src/app/services/`:
- API calls to Java backend for user management and workflow CRUD
- API calls to Python backend for AI/agent operations

## Testing

- Frontend: `ng test` (Vitest)
- Backend Python: `python test_evaluator.py` in `backend/`
- Circuit Backend: `./mvnw test`
