from typing import TypedDict, List, Dict


class AgentState(TypedDict, total=False):
    messages: List[str]
    context: str
    history: List[Dict]
    last_sender: str
    next_agent: str
    condition: str
    current_node: str