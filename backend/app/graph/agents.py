# app/graph/agents.py
import json

from app.graph.graph_constants import edge_map
from app.graph.state import AgentState
from app.llm.client import generate_message

async def product_manager(state: AgentState):
    prompt = f"""
    你是软件开发团队的产品经理。
    当前开发目标:
    {state["context"]}

    你的任务:
    - 只输出需求列表，每条需求简短明了。
    - 不提供设计思路、示例代码或实现细节。
    - 使用有序列表或编号形式，每条需求不超过一句话。
    """
    msg = await generate_message(
        "Product Manager",
        state.get("context", ""),
        prompt
    )

    print("\n[PM]")
    print(msg)

    state["messages"].append("PM:"+msg)
    state["last_sender"] = "pm"
    state["next_agent"] = edge_map[state["last_sender"]]
    state.setdefault("history", []).append({
        "from": "pm",
        "to": state.get("next_agent"),
        "message": msg
    })
    return state


async def architect(state: AgentState):
    prompt = f"""
    你是软件开发团队的架构师。
    当前开发目标:
    {state["context"]}
当前需求:
{state["messages"]}

你的任务:
- 提供简短的设计思路或架构方案。
- 不输出代码或测试结果。
- 建议技术栈和模块划分，重点突出架构考虑。
- 内容简洁明了，不超过五句话。
"""
    msg = await generate_message(
        "Architect",
        state["messages"][-1],
        prompt
    )

    print("\n[ARCH]")
    print(msg)

    state["messages"].append("ARCH:"+msg)
    state["last_sender"] = "arch"
    state["next_agent"] = edge_map[state["last_sender"]]
    # print(state["messages"])
    state.setdefault("history", []).append({
        "from": "arch",
        "to": state.get("next_agent"),
        "message": msg
    })

    return state

async def developer(state: AgentState):

    prompt = f"""
   你是软件开发团队的开发工程师。
   当前开发目标:
    {state["context"]}
当前团队对话记录:
{state["messages"]}

你的任务:
- 直接给出可运行的示例代码。
- 只输出代码,不要输出其他内容。
- 保持代码简短，突出功能实现。
- 代码语言根据项目约定（如Python/TypeScript）。
"""
    msg = await generate_message(
        "Developer",
        state["messages"][-1],
        prompt
    )

    print("\n[DEV]")
    print(msg)

    state["messages"].append("DEV:"+msg)
    state["last_sender"] = "dev"
    state["next_agent"] = edge_map[state["last_sender"]]
    state.setdefault("history", []).append({
        "from": "dev",
        "to": state.get("next_agent"),
        "message": msg
    })

    return state
async def tester(state: AgentState):
    prompt = f"""
    你是软件开发团队的测试工程师。
    当前开发目标:
    {state["context"]}
    当前功能说明或代码:
    {state["messages"]}

    你的任务:
    - 输出测试结果和意见，必须使用 JSON 格式。
    - 只输出纯文本 JSON，绝对不要 ``` 或 markdown。
    - JSON 包含两个字段:
      1. "result": "PASS" 或 "FAIL"
      2. "comment": 简短的测试说明，如果是 PASS 可以写 "功能正常"
    - 不输出代码或其他文本。
    - JSON 必须可被解析为有效的 Python dict。
    """
    msg = await generate_message(
        "Tester",
        state["messages"][-1],
        prompt
    )

    print("\n[TEST]")
    print(msg)

    state["messages"].append("TEST"+msg)
    state["last_sender"] = "test"
    state.setdefault("history", []).append({
        "from": "test",
        "to": state.get("next_agent"),
        "message": msg
    })
    try:
        result_json = json.loads(msg)
        print(result_json)
        state["test_passed"] = result_json.get("result").upper() == "PASS"
    except Exception as e:
        print("JSON 解析失败:", e)
        # 如果解析失败，模拟默认 FAIL
        state["test_passed"] = False
        state["next_agent"] = "dev"

    return state
agent_types = {
    "product_manager": product_manager,
    "architect": architect,
    "developer": developer,
    "tester": tester
}