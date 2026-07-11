import json
from langgraph.graph import StateGraph, END

from app.graph.graph_constants import edge_map
from app.graph.state import AgentState
from app.graph.agents import product_manager, architect, developer, tester


AGENT_MAP = {
    "pm": product_manager,
    "arch": architect,
    "dev": developer,
    "test": tester,
}

def build_graph_from_config(config_path):

    with open(config_path) as f:
        config = json.load(f)

    graph = StateGraph(AgentState)

    # 添加节点
    for node in config["nodes"]:
        node_id = node["id"]
        graph.add_node(node_id, AGENT_MAP[node_id])

    # entry
    graph.set_entry_point(config["entry"])

    # 普通边
    for edge in config["edges"]:
        graph.add_edge(edge["from"], edge["to"])
        edge_map[edge["from"]] = edge["to"]

    # 条件边
    for cond in config.get("condition_edges", []):

        source = cond["from"]

        def router(state: AgentState):

            if state.get("test_passed"):
                state["next_agent"] = "END"
                return "pass"

            state["next_agent"] = cond["conditions"]["fail"]
            return "fail"

        graph.add_conditional_edges(
            source,
            router,
            {
                "pass": END,
                "fail": cond["conditions"]["fail"],
            },
        )

    return graph.compile()