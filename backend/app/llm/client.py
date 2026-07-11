from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
import os

# LLM 配置 - 从环境变量读取
LLM_CONFIG = {
    "api_key": os.getenv("LLM_API_KEY", ""),
    "api_base": os.getenv("LLM_API_BASE", "https://api.openai.com/v1"),
    "model": os.getenv("LLM_MODEL", "gpt-3.5-turbo")
}

def get_llm():
    return ChatOpenAI(
        model=LLM_CONFIG["model"],
        openai_api_key=LLM_CONFIG["api_key"],
        openai_api_base=LLM_CONFIG["api_base"],
        temperature=0.4,
        max_tokens=500,
        extra_body={"enable_thinking": False}
    )


def get_chat_llm():
    return ChatOpenAI(
        model=LLM_CONFIG["model"],
        openai_api_key=LLM_CONFIG["api_key"],
        openai_api_base=LLM_CONFIG["api_base"],
        temperature=0.7,
        max_tokens=500,
        extra_body={"enable_thinking": False}
    )


async def generate_message(agent_name: str, context: str, prompt: str) -> str:
    llm = get_llm()
    response = await llm.ainvoke(
        [HumanMessage(content=prompt)]
    )

    content = response.content
    # Qwen3.x thinking 模式下 content 可能为空，实际内容在 additional_kwargs 中
    if not content or content.strip() == '':
        reasoning = response.additional_kwargs.get('reasoning_content', '')
        if reasoning:
            content = reasoning

    return content or ""


async def generate_chat_message(prompt: str) -> str:
    llm = get_chat_llm()
    response = await llm.ainvoke(
        [HumanMessage(content=prompt)]
    )

    content = response.content
    if not content or content.strip() == '':
        reasoning = response.additional_kwargs.get('reasoning_content', '')
        if reasoning:
            content = reasoning

    return content or ""