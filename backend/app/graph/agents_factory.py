from app.graph.state import AgentState
from app.llm.client import generate_message
import json


def create_agent(node_config):

    agent_id = node_config["id"]
    role = node_config.get("role", "")
    prompt_template = node_config.get("prompt", "")

    async def agent(state: AgentState):

        prompt = f"""
你是 {role}

当前任务:
{state["context"]}

团队对话记录:
{state["messages"]}

任务要求:
{prompt_template}
"""

        msg = await generate_message(
            role,
            state["messages"][-1] if state["messages"] else "",
            prompt
        )

        print(f"\n[{agent_id.upper()}]")
        print(msg)

        state.setdefault("messages", []).append(f"{agent_id.upper()}:{msg}")

        state.setdefault("history", []).append({
            "from": agent_id,
            "to": state.get("next_agent"),
            "message": msg
        })

        state["last_sender"] = agent_id

        # tester 特殊逻辑
        if agent_id == "test":

            try:
                result_json = json.loads(msg)
                state["test_passed"] = result_json.get("result", "").upper() == "PASS"
            except:
                state["test_passed"] = False

        return state

    return agent