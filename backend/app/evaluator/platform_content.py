"""
平台各页面的内容快照
模拟LLM"浏览"平台时看到的内容
"""

from dataclasses import dataclass
from typing import List, Dict


@dataclass
class PageSnapshot:
    """页面快照"""
    id: str
    title: str
    content: str  # 页面内容的文本描述
    interactive_elements: List[Dict]  # 可交互元素


# ============ 页面1: 工作流编辑器 ============
EDITOR_PAGE = PageSnapshot(
    id="editor",
    title="工作流编辑器",
    content="""
【页面标题】工作流编辑器

【左侧工具栏】
- 输入框：ID（如 id_pm）、Role（如 PM）、Prompt（如"你是产品经理，请输出需求列表"）
- "添加"按钮：将新节点添加到画布
- "进入场景"按钮：保存并跳转到2D可视化场景
- "导出JSON"按钮：下载工作流配置文件
- "保存"按钮：保存到服务器
- "加载"按钮：从JSON文件加载

【中央画布区域】
- 节点以彩色卡片形式展示，包含ID和Role
- 节点之间用带箭头的线连接
- 右键节点可添加"普通边"或"条件边"
- 条件边需要配置判断条件和目标节点

【底部输入区】
- 任务目标输入框：输入要完成的任务描述
- 例如："设计一个简单的计算器程序"

【节点类型】
1. 普通节点：代表一个Agent，有ID、Role、Prompt
2. 判断节点（Judge Agent）：根据前序输出做条件判断
3. 终止节点（END）：标记工作流结束

【边的类型】
1. 普通边：从一个节点指向下一个节点，表示执行顺序
2. 条件边：带有条件判断，如"pass"->END, "fail"->id_dev
""",
    interactive_elements=[
        {"type": "input", "label": "节点ID", "example": "id_pm"},
        {"type": "input", "label": "角色Role", "example": "PM"},
        {"type": "textarea", "label": "提示词Prompt", "example": "你是产品经理，请输出需求列表"},
        {"type": "button", "label": "添加节点"},
        {"type": "button", "label": "添加普通边"},
        {"type": "button", "label": "添加条件边"},
        {"type": "button", "label": "进入场景"},
    ]
)


# ============ 页面2: 2D工作流可视化场景 ============
VISUALIZATION_PAGE = PageSnapshot(
    id="visualization",
    title="2D工作流可视化",
    content="""
【页面标题】2D工作流可视化场景

【中央区域】
- 2D小地图展示所有Agent的位置
- 每个Agent用彩色圆点表示
- Agent之间有虚线（移动方向）和实线（交互中）
- 点击圆点可查看Agent详情和编辑Prompt

【控制面板】
- "运行"按钮：自动执行完整工作流
- "暂停/继续"按钮：控制执行节奏
- "逐步执行"按钮：每点击一次执行一个Agent
- "下一步"按钮：继续执行下一步

【日志面板】
- 显示每个Agent的输入和输出
- 显示当前执行的节点名称
- 显示条件判断的结果

【Agent状态】
- 每个Agent显示当前角色和状态
- 可以实时编辑Agent的Prompt
- 显示Agent之间的消息传递

【示例流程】
软件开发场景：
1. PM节点启动，输出需求列表
2. 消息传递给Architect，输出系统设计
3. 消息传递给Developer，输出代码
4. 消息传递给Test，进行测试
5. Judge Agent判断测试结果
6. 如果pass->结束，如果fail->回到Developer
""",
    interactive_elements=[
        {"type": "button", "label": "运行"},
        {"type": "button", "label": "暂停"},
        {"type": "button", "label": "逐步执行"},
        {"type": "button", "label": "下一步"},
        {"type": "clickable", "label": "Agent圆点", "action": "查看/编辑Agent"},
    ]
)


# ============ 页面3: 3D躲猫猫场景 ============
HIDE_SEEK_PAGE = PageSnapshot(
    id="hide_seek",
    title="3D躲猫猫",
    content="""
【页面标题】3D躲猫猫

【工具栏】
- 躲藏者数量选择：1-5人，默认3人
- 信息共享开关：开启/关闭
- "开始游戏"按钮
- 游戏状态显示：第X轮，已找到Y/Z

【3D场景】
- 蓝色/绿色/紫色球体：躲藏者
- 红色球体：搜索者
- 黄色扇形：搜索者视野范围（30度，15米）
- 黄色圆环：躲避点
- 灰色方块：障碍物

【游戏规则】
1. 搜索者每轮可以移动到一个躲避点搜索，或原地转向
2. 躲藏者每局有3次移动机会，可以感知8米内的搜索者
3. 搜索者视野30度，15米，会被障碍物遮挡
4. 开启信息共享时，躲藏者会收到队友的警告

【实验设计】
- 本实验研究"信息共享"对多智能体协作效率的影响
- 对比开启/关闭信息共享时的搜索轮次
- 统计面板记录两种模式的平均轮次

【操作】
- WASD：移动摄像机
- 鼠标拖拽：旋转视角
- 滚轮：缩放
- 右键拖拽：平移
""",
    interactive_elements=[
        {"type": "select", "label": "躲藏者数量", "options": ["1", "2", "3", "4", "5"]},
        {"type": "toggle", "label": "信息共享"},
        {"type": "button", "label": "开始游戏"},
        {"type": "button", "label": "重新开始"},
    ]
)


# ============ 页面4: 用户指南 ============
GUIDE_PAGE = PageSnapshot(
    id="guide",
    title="用户指南",
    content="""
【页面标题】多智能体学习平台 - 用户指南

【平台介绍】
- 可视化工作流编辑器：拖拽式设计Agent协作流程
- 2D工作流可视化：实时观察Agent运行状态
- 模板快速起步：内置软件开发、新闻编辑、医疗诊断场景
- 条件分支与循环：支持判断节点，实现动态工作流
- 逐步调试：单步执行、暂停、继续
- 3D躲猫猫实验：观察多Agent躲藏与搜索策略

【快速开始】
方式一（推荐新手）：
1. 点击"从模板新建"
2. 选择场景（如"软件开发场景"）
3. 自动加载到编辑器，可直接运行

方式二（从零构建）：
1. 点击"新建工作流"
2. 输入Agent的ID、Role、Prompt
3. 右键节点，添加边或条件边
4. 设置任务目标，点击"进入场景"

【核心概念】
1. 多智能体系统：多个自主Agent协作完成复杂任务
2. 工作流：由节点（Agent）和边（执行顺序）组成
3. 条件分支：根据条件选择不同执行路径
4. 信息共享：Agent之间传递信息以提高整体效率
5. 可视化：2D地图和3D场景帮助理解抽象概念

【学习建议】
1. 先跑模板，用逐步执行观察每一步
2. 修改Prompt，观察输出变化
3. 设计自己的工作流
4. 对比不同场景的协作模式
5. 在3D躲猫猫中对比信息共享的效果
""",
    interactive_elements=[
        {"type": "link", "label": "从模板新建"},
        {"type": "link", "label": "新建工作流"},
        {"type": "link", "label": "我的工作流"},
        {"type": "link", "label": "3D躲猫猫"},
    ]
)


# ============ 页面5: 模板列表 ============
TEMPLATE_PAGE = PageSnapshot(
    id="templates",
    title="模板列表",
    content="""
【页面标题】从模板新建

【可用模板】

1. 软件开发场景
   - 流程：PM -> Architect -> Developer -> Test -> Judge
   - 特点：测试不通过时循环回Developer
   - 学习重点：条件循环、迭代开发

2. 新闻编辑场景
   - 流程：记者 -> 编辑 -> 事实核查 -> Judge
   - 特点：核查不通过时打回重写
   - 学习重点：审核机制、质量控制

3. 医疗诊断场景
   - 流程：问诊 -> 初步诊断 -> 检验分析 -> Judge -> 治疗
   - 特点：不确定时重新问诊
   - 学习重点：多角色协作、动态决策

【使用方式】
- 点击模板卡片，自动加载到编辑器
- 可以修改Prompt和任务目标
- 可以直接运行或保存后修改
""",
    interactive_elements=[
        {"type": "card", "label": "软件开发场景"},
        {"type": "card", "label": "新闻编辑场景"},
        {"type": "card", "label": "医疗诊断场景"},
    ]
)


# 所有页面
ALL_PAGES: List[PageSnapshot] = [
    EDITOR_PAGE,
    VISUALIZATION_PAGE,
    HIDE_SEEK_PAGE,
    GUIDE_PAGE,
    TEMPLATE_PAGE,
]


def get_page(page_id: str) -> PageSnapshot:
    """获取指定页面"""
    for page in ALL_PAGES:
        if page.id == page_id:
            return page
    raise ValueError(f"Unknown page: {page_id}")


def get_all_pages() -> List[PageSnapshot]:
    """获取所有页面"""
    return ALL_PAGES.copy()
