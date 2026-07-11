import json
import re

from app.graph.graph_constants import edge_map
from app.llm.client import generate_message


def extract_json(text: str):
    """
    从 LLM 输出中提取 JSON（防 markdown / 多余文本）
    """
    if not text:
        return None

    # 去掉 ```xxx``` 包裹
    text = re.sub(r"```.*?```", lambda m: m.group(0).replace("```", ""), text, flags=re.S)

    # 提取第一个 {...}
    match = re.search(r"\{.*\}", text, re.S)
    if match:
        text = match.group(0)

    try:
        return json.loads(text)
    except:
        return None


async def run_agent(state, agent_config):

    history = state.get("history", [])
    
    # 构建完整对话历史（排除判断节点的JSON输出）
    conversation_parts = []
    for entry in history:
        msg = entry.get("message", "")
        # 过滤掉纯JSON的判断结果，避免干扰普通agent
        if not (msg.strip().startswith("{") and "condition" in msg):
            role = entry.get("from", "unknown")
            conversation_parts.append(f"[{role}]: {msg}")
    
    conversation_text = "\n".join(conversation_parts) if conversation_parts else "（这是第一步，请开始你的工作）"
    
    # 获取原始任务目标（如果存在）
    task_goal = state.get("task_goal", state.get("initial_context", ""))

    # 构建 agent 上下文（用于返回给前端）
    agent_context = {
        "id": agent_config["id"],
        "role": agent_config["role"],
        "original_prompt": agent_config.get("prompt", ""),
        "task_goal": task_goal,
        "conversation_history": conversation_text,
        "full_prompt": ""
    }

    full_prompt = f"""{agent_config["prompt"]}

{'任务目标: ' + task_goal if task_goal else ''}

对话历史:
{conversation_text}

请完成你的工作。要求：纯文本，不用markdown，不超过100字。"""

    agent_context["full_prompt"] = full_prompt

    msg = await generate_message(
        agent_config["role"],
        "",
        full_prompt
    )

    # 记录到历史
    state.setdefault("history", []).append({
        "from": agent_config["id"],
        "to": edge_map.get(agent_config["id"]),
        "message": msg
    })

    print(f"\n[{agent_config['role']}]: {msg}")
    
    # 更新 context 为最新输出（用于调试）
    state["context"] = f"{agent_config['role']}: {msg}"
    state["last_sender"] = agent_config["id"]

    # 提取条件判断结果
    data = extract_json(msg)
    if data and "condition" in data:
        state["condition"] = data["condition"]
        print(f"\n[condition]: {state['condition']}")

    # 存储当前 agent 的上下文信息（用于返回给前端）
    state.setdefault("agent_contexts", {})[agent_config["id"]] = agent_context

    return state