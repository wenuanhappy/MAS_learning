import asyncio

from app.graph.build_graph_json import build_graph_from_config, run_one_step, run_full
from app.graph.state import AgentState
from app.llm.client import generate_chat_message
from app.evaluator.learner import LearningEffectEvaluator
from app.evaluator.interactive_learner import InteractiveLearningEvaluator
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from app.graph.state import AgentState
import asyncio

app = FastAPI()

# 允许前端跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/run_cycle")
async def run_cycle():

    state: AgentState = {
        "messages": [],
        "history": [],
        "context": "完成一个简单的计算器程序,不需要图形界面"
    }

    graph = build_graph_from_config("app/config/test_config.json")

    state = await graph.ainvoke(state)

    return {
        "history": state["history"]
    }

@app.post("/step")
async def step(data: dict):
    print(data)

    # 前端 workflow json
    workflow = data["workflow"]

    # 用户输入（任务目标）
    user_input = data.get("context", "完成一个简单的计算器程序")

    # 获取当前 state（如果有）
    state_data = data.get("state")

    if state_data is not None:
        state = state_data
        # 确保 task_goal 存在（首次设置后保持不变）
        if "task_goal" not in state:
            state["task_goal"] = user_input
    else:
        state = {
            "messages": [],
            "history": [],
            "context": user_input,
            "task_goal": user_input,  # 保存原始任务目标
            "current_node": workflow["entry"]
        }

    # 构建 graph
    graph = build_graph_from_config(workflow)

    # 运行一步
    state = await run_one_step(graph, state)

    return state

@app.post("/agent_chat")
async def agent_chat(data: dict):
    agent_id = data.get("agent_id", "")
    agent_role = data.get("agent_role", "")
    agent_prompt = data.get("agent_prompt", "")
    agent_context = data.get("agent_context", {})
    user_question = data.get("question", "")

    task_goal = ""
    conversation_history = ""
    full_prompt = ""

    if isinstance(agent_context, dict):
        task_goal = agent_context.get("task_goal", "")
        conversation_history = agent_context.get("conversation_history", "")
        full_prompt = agent_context.get("full_prompt", "")
    elif isinstance(agent_context, str):
        full_prompt = agent_context

    chat_prompt = f"""你是{agent_role}。{agent_prompt}

任务: {task_goal if task_goal else '无'}
历史: {conversation_history[:500] if conversation_history else '无'}

用户问: {user_question}
请以角色身份简短回答，纯文本，不用markdown。"""

    reply = await generate_chat_message(chat_prompt)

    return {"reply": reply}
@app.post("/run")

async def run(data: dict):
    print(data)

    # 前端 workflow json

    workflow = data["workflow"]

    # 用户输入（任务目标）

    user_input = data["context"]

    # 初始 state

    state: AgentState = {
        "messages": [],
        "history": [],
        "context": user_input,
        "task_goal": user_input  # 保存原始任务目标
    }

    # 构建 graph

    graph = build_graph_from_config(workflow)

    # 运行

    state = await run_full(graph, state)

    return state


@app.post("/hide_seek_action")
async def hide_seek_action(data: dict):
    role = data.get("role", "seeker")
    prompt = data.get("prompt", "")
    hider_spot = data.get("hider_spot", "")

    if role == "hider":
        system_prompt = "你是一个躲猫猫游戏中的躲藏者。你需要选择一个最佳的躲避点。请直接输出JSON，不要输出其他内容。"
    else:
        system_prompt = "你是一个躲猫猫游戏中的搜索者，拥有感知场景的能力。你需要分析场景并选择最可能藏有躲藏者的位置去搜索。请直接输出JSON，不要输出其他内容。"

    full_prompt = f"{system_prompt}\n\n{prompt}"

    reply = await generate_chat_message(full_prompt)

    return {"reply": reply, "role": role}


@app.post("/evaluate_learning")
async def evaluate_learning(data: dict):
    """
    LLM 学习效果评估接口

    请求体：
    {
        "learner_level": "beginner" | "intermediate" | "advanced",
        "concepts": ["ma_basics", "workflow_design", ...],  // 可选，默认全部
        "question_count": 6  // 可选，默认6题
    }

    返回：
    {
        "learner_level": "beginner",
        "questions": [...],
        "pretest": { "answers": [...], "grades": [...], "total_score": ..., "max_score": ... },
        "posttest": { "answers": [...], "grades": [...], "total_score": ..., "max_score": ... },
        "comparison": {
            "total_pre_score": ...,
            "total_post_score": ...,
            "improvement": ...,
            "improvement_rate": ...,
            "by_concept": {...},
            "by_difficulty": {...}
        },
        "report": {
            "effectiveness": "显著提升",
            "summary": "...",
            "weak_concepts": [...],
            "difficulty_analysis": {...},
            "recommendations": [...]
        }
    }
    """
    learner_level = data.get("learner_level", "beginner")
    concepts = data.get("concepts", None)
    question_count = data.get("question_count", 6)

    evaluator = LearningEffectEvaluator()
    result = await evaluator.evaluate_learning(
        learner_level=learner_level,
        concepts=concepts,
        question_count=question_count
    )

    return result


@app.post("/evaluate_learning_interactive")
async def evaluate_learning_interactive(data: dict):
    """
    交互式学习效果评估接口

    让LLM模拟真实学习者浏览平台、操作、总结知识的过程
    然后对比学习前后的测试成绩

    请求体：
    {
        "learner_level": "beginner" | "intermediate" | "advanced",
        "concepts": ["ma_basics", "workflow_design", ...],
        "question_count": 6
    }

    返回：包含学习过程记录、知识总结、前后测对比、评估报告
    """
    learner_level = data.get("learner_level", "beginner")
    concepts = data.get("concepts", None)
    question_count = data.get("question_count", 6)

    evaluator = InteractiveLearningEvaluator()
    result = await evaluator.evaluate(
        learner_level=learner_level,
        concepts=concepts,
        question_count=question_count
    )

    return result