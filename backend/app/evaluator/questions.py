"""
LLM 学习效果评估题库
涵盖多智能体协作平台的核心概念
"""

from dataclasses import dataclass
from typing import List


@dataclass
class Question:
    id: str
    concept: str  # 所属概念领域
    difficulty: int  # 1-3, 1=记忆, 2=理解, 3=应用
    question: str
    rubric: str  # 评分标准
    max_score: int = 10


# ============ 概念领域定义 ============
# 1. 多智能体基础 (ma_basics)
# 2. 工作流设计 (workflow_design)
# 3. 条件分支与循环 (condition_loop)
# 4. 信息共享 (info_sharing)
# 5. 可视化与调试 (visualization)
# 6. 实际应用 (application)

QUESTIONS: List[Question] = [
    # ===== 多智能体基础 =====
    Question(
        id="ma_01",
        concept="ma_basics",
        difficulty=1,
        question='什么是多智能体系统（Multi-Agent System）？请用一句话定义，并举一个生活中的例子。',
        rubric="""
评分标准（满分10分）：
- 正确定义（多个自主Agent协作完成任务的系统）：4分
- 例子恰当（如：交通信号灯系统、蚁群、足球队等）：3分
- 解释清晰，逻辑通顺：3分
"""
    ),
    Question(
        id="ma_02",
        concept="ma_basics",
        difficulty=2,
        question='在软件开发场景中，PM（产品经理）、Architect（架构师）、Developer（开发者）三个Agent各自承担什么职责？它们之间是如何协作的？',
        rubric="""
评分标准（满分10分）：
- 正确描述PM职责（需求分析）：2分
- 正确描述Architect职责（系统设计）：2分
- 正确描述Developer职责（代码实现）：2分
- 正确描述协作顺序（PM -> Architect -> Developer）：2分
- 说明协作的价值（分工提高效率）：2分
"""
    ),
    Question(
        id="ma_03",
        concept="ma_basics",
        difficulty=3,
        question='假设你要设计一个"智能餐厅"系统，需要多个Agent协作完成点餐、烹饪、配送。请设计这个多智能体系统，说明需要哪些Agent、各自的职责，以及它们之间的协作流程。',
        rubric="""
评分标准（满分10分）：
- 识别出至少3个合理的Agent角色：3分
- 每个Agent职责描述清晰合理：3分
- 协作流程有逻辑顺序：2分
- 考虑了异常情况或优化（如高峰期处理）：2分
"""
    ),

    # ===== 工作流设计 =====
    Question(
        id="wf_01",
        concept="workflow_design",
        difficulty=1,
        question='在平台的工作流编辑器中，"节点（Node）"和"边（Edge）"分别代表什么？',
        rubric="""
评分标准（满分10分）：
- 正确解释节点（代表一个Agent/步骤）：5分
- 正确解释边（代表Agent之间的信息传递/执行顺序）：5分
"""
    ),
    Question(
        id="wf_02",
        concept="workflow_design",
        difficulty=2,
        question='为什么工作流中的"入口节点（Entry Node）"很重要？如果忘记设置入口节点，会发生什么？',
        rubric="""
评分标准（满分10分）：
- 解释入口节点的作用（工作流执行的起点）：4分
- 说明忘记设置的后果（工作流无法开始执行）：3分
- 提到入口节点决定了整个流程的触发条件：3分
"""
    ),
    Question(
        id="wf_03",
        concept="workflow_design",
        difficulty=3,
        question='在新闻编辑场景中，记者写完稿件后，需要经过编辑审核和事实核查。如果核查不通过，稿件需要返回记者修改。请画出这个工作流的节点和边，并说明为什么需要"条件分支"。',
        rubric="""
评分标准（满分10分）：
- 正确画出节点序列（记者 -> 编辑 -> 核查）：3分
- 正确画出条件分支（核查通过->发布，不通过->返回记者）：4分
- 解释条件分支的必要性（质量控制、错误纠正）：3分
"""
    ),

    # ===== 条件分支与循环 =====
    Question(
        id="cl_01",
        concept="condition_loop",
        difficulty=1,
        question='什么是"条件分支"？它和普通的"顺序执行"有什么区别？',
        rubric="""
评分标准（满分10分）：
- 正确定义条件分支（根据条件选择不同执行路径）：5分
- 正确对比顺序执行（固定顺序 vs 动态选择）：5分
"""
    ),
    Question(
        id="cl_02",
        concept="condition_loop",
        difficulty=2,
        question="在软件开发场景中，测试Agent发现代码有bug，工作流会回到Developer重新修改。这个过程叫什么？如果测试一直不通过，会发生什么？",
        rubric="""
评分标准（满分10分）：
- 识别出这是"循环/迭代"过程：4分
- 说明循环的目的（持续改进直到满足标准）：3分
- 提到需要设置终止条件（如最大循环次数）：3分
"""
    ),
    Question(
        id="cl_03",
        concept="condition_loop",
        difficulty=3,
        question='设计一个"智能客服"工作流：用户提出问题，客服Agent回答，然后由满意度评估Agent判断用户是否满意。如果不满意，需要转接高级客服。请说明：1) 需要哪些节点；2) 条件分支的判断逻辑；3) 如何避免无限循环。',
        rubric="""
评分标准（满分10分）：
- 正确设计节点（普通客服、满意度评估、高级客服）：3分
- 条件分支逻辑清晰（满意->结束，不满意->高级客服）：3分
- 提出合理的循环终止方案（如最多转接2次、或标记为人工处理）：4分
"""
    ),

    # ===== 信息共享 =====
    Question(
        id="is_01",
        concept="info_sharing",
        difficulty=1,
        question='在3D躲猫猫场景中，"信息共享"指的是什么？开启和关闭信息共享有什么区别？',
        rubric="""
评分标准（满分10分）：
- 正确定义信息共享（躲藏者之间传递搜索者位置信息）：5分
- 正确对比两种模式（开启=互相警告，关闭=各自为战）：5分
"""
    ),
    Question(
        id="is_02",
        concept="info_sharing",
        difficulty=2,
        question='为什么开启信息共享后，躲藏者平均存活时间可能更长？请从信息传递的角度解释。',
        rubric="""
评分标准（满分10分）：
- 解释个体感知的局限性（只能感知附近区域）：3分
- 说明信息共享扩大了感知范围（通过队友获得远处信息）：4分
- 提到决策优化（可以提前移动，而不是等到搜索者靠近才发现）：3分
"""
    ),
    Question(
        id="is_03",
        concept="info_sharing",
        difficulty=3,
        question='在真实的多智能体系统中（如自动驾驶车队、无人机群），信息共享有哪些好处和潜在风险？请各举至少两个例子。',
        rubric="""
评分标准（满分10分）：
- 好处：提高整体效率（2分）、增强安全性（2分）、更好的协调（1分）
- 风险：信息过载（2分）、通信延迟/失败（2分）、隐私/安全问题（1分）
- 例子具体且恰当：额外加分
"""
    ),

    # ===== 可视化与调试 =====
    Question(
        id="vis_01",
        concept="visualization",
        difficulty=1,
        question='平台的2D小地图和3D躲猫猫场景分别展示了什么信息？它们对学习者有什么帮助？',
        rubric="""
评分标准（满分10分）：
- 正确描述2D小地图（Agent位置、移动轨迹、交互关系）：3分
- 正确描述3D场景（空间位置、视野范围、障碍物）：3分
- 说明可视化帮助（直观理解抽象概念、观察行为模式）：4分
"""
    ),
    Question(
        id="vis_02",
        concept="visualization",
        difficulty=2,
        question='为什么"逐步执行"功能对学习多智能体系统很有帮助？对比"自动运行"，它有什么独特价值？',
        rubric="""
评分标准（满分10分）：
- 解释逐步执行的作用（观察每一步的细节）：3分
- 对比自动运行（太快看不清 vs 可控节奏）：3分
- 提到调试价值（发现问题、理解因果关系）：4分
"""
    ),

    # ===== 实际应用 =====
    Question(
        id="app_01",
        concept="application",
        difficulty=2,
        question='除了平台内置的场景（软件开发、新闻编辑、医疗诊断），你还能想到哪些场景适合用多智能体系统解决？请描述一个你想到的场景，并说明需要哪些Agent。',
        rubric="""
评分标准（满分10分）：
- 场景选择合理且有实际价值：4分
- Agent角色设计合理：3分
- 协作逻辑清晰：3分
"""
    ),
    Question(
        id="app_02",
        concept="application",
        difficulty=3,
        question='假设你要用多智能体系统解决"城市交通拥堵"问题。请设计一个方案：1) 需要哪些Agent；2) 它们如何协作；3) 需要哪些条件分支；4) 信息共享在这个场景中有什么作用。',
        rubric="""
评分标准（满分10分）：
- Agent设计合理（如：交通监控、信号灯控制、导航推荐等）：3分
- 协作流程清晰：2分
- 条件分支设计合理（如：拥堵时调整信号灯、事故时绕行）：2分
- 信息共享作用分析深入（实时路况共享、协调信号灯）：3分
"""
    ),
]


# 按概念领域分组
CONCEPTS = {
    "ma_basics": "多智能体基础",
    "workflow_design": "工作流设计",
    "condition_loop": "条件分支与循环",
    "info_sharing": "信息共享",
    "visualization": "可视化与调试",
    "application": "实际应用",
}


def get_questions_by_concept(concept: str) -> List[Question]:
    """获取某个概念领域的所有题目"""
    return [q for q in QUESTIONS if q.concept == concept]


def get_questions_by_difficulty(difficulty: int) -> List[Question]:
    """获取某个难度级别的所有题目"""
    return [q for q in QUESTIONS if q.difficulty == difficulty]


def get_all_questions() -> List[Question]:
    """获取所有题目"""
    return QUESTIONS.copy()
