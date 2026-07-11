import json
from langgraph.graph import StateGraph, END

from app.graph.graph_constants import edge_map
from app.graph.state import AgentState
from app.graph.agent_runtime import run_agent


def build_graph_from_config(config):

    graph = {
        "nodes": {},
        "edges": {},
        "condition_edges": {},
        "entry": config["entry"]
    }

    # nodes

    for node in config["nodes"]:

        graph["nodes"][node["id"]] = node

    # edges

    for edge in config["edges"]:

        graph["edges"][edge["from"]] = edge["to"]

    # condition edges

    for cond in config.get("condition_edges", []):

        graph["condition_edges"][cond["from"]] = {

            "judge": cond.get("judge_agent", ""),

            "mapping": cond["conditions"]
        }

    return graph

async def run_one_step(graph, state):
    if "current_node" not in state:
        state["current_node"] = graph["entry"]
    current = state["current_node"]

    node_config = graph["nodes"][current]

    # 1. 执行当前 agent
    state = await run_agent(state, node_config)

    # 2. 判断是否 condition node
    if current in graph["condition_edges"]:
        judge = graph["condition_edges"][current]["judge"]
        mapping = graph["condition_edges"][current]["mapping"]

        judge_config = graph["nodes"][judge]

        # 执行 judge agent
        state = await run_agent(state, judge_config)

        result = state.get("condition", "default")

        next_node = mapping.get(result, list(mapping.values())[0])

    else:
        next_node = graph["edges"].get(current, "END")

    # 3. 写 history（统一修复 to）
    if state.get("history"):
        state["history"][-1]["to"] = next_node

    state["current_node"] = next_node

    return state


async def run_full(graph, state, max_steps=20):
    if "current_node" not in state:
        state["current_node"] = graph["entry"]

    for _ in range(max_steps):
        if state.get("current_node") == "END":
            break
        state = await run_one_step(graph, state)

    return state