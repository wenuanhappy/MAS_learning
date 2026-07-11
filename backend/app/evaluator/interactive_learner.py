"""
交互式学习者模拟器
让LLM通过"浏览页面->交互操作->总结知识"的方式模拟真实学习过程
"""

from app.evaluator.questions import Question, get_all_questions
from app.evaluator.platform_content import PageSnapshot, get_all_pages
from app.llm.client import generate_chat_message
from typing import List, Dict, Any
import json


class InteractiveLearner:
    """
    交互式学习者：模拟真实人类浏览平台、操作、学习的过程

    学习流程：
    1. 浏览页面（接收页面内容）
    2. 进行操作（点击、输入、选择）
    3. 观察结果（系统反馈）
    4. 总结知识（将经验转化为记忆）
    5. 重复直到覆盖所有关键功能
    """

    def __init__(self, level: str = "beginner"):
        """
        level: 学习者的学习能力
        - beginner: 需要更多引导，总结能力较弱
        - intermediate: 能自主探索，总结较全面
        - advanced: 快速理解，能发现深层联系
        """
        self.level = level
        self.memory = []  # 学习记忆，每次浏览/操作后添加
        self.visited_pages = set()
        self.interactions = []

    async def browse_page(self, page: PageSnapshot) -> str:
        """
        模拟浏览一个页面，LLM根据页面内容生成理解

        返回：LLM对该页面的理解和笔记
        """
        self.visited_pages.add(page.id)

        # 根据学习者水平调整提示
        if self.level == "beginner":
            guidance = "你是一个初学者，对多智能体系统不太了解。请仔细阅读页面内容，提取关键概念和操作步骤。如果有不懂的地方，标记出来。"
        elif self.level == "intermediate":
            guidance = "你有一些编程和系统设计的经验。请浏览页面，理解功能设计，并思考这些功能如何帮助学习多智能体概念。"
        else:
            guidance = "你有丰富的系统设计经验。请快速浏览页面，分析设计意图，找出潜在的教学价值和改进点。"

        prompt = f"""{guidance}

你正在浏览一个学习平台的页面：

【页面标题】{page.title}

【页面内容】
{page.content}

【可交互元素】
{chr(10).join(f"- {e['label']} ({e['type']})" for e in page.interactive_elements)}

请完成以下任务：
1. 总结这个页面的核心功能和用途（2-3句话）
2. 列出你学到的关键概念（3-5个）
3. 如果你要操作这个页面，你会先尝试哪些功能？为什么？

请直接输出你的理解和笔记，不要添加"作为AI"等前缀。"""

        notes = await generate_chat_message(prompt)
        return notes.strip()

    async def interact(self, page: PageSnapshot, action: str) -> str:
        """
        模拟在页面上执行一个操作，观察系统反馈

        page: 当前页面
        action: 操作描述（如"点击'添加节点'按钮，输入ID=id_test, Role=Test"）

        返回：系统反馈和LLM的观察
        """
        self.interactions.append({"page": page.id, "action": action})

        # 模拟系统反馈（基于页面内容和操作）
        feedback = self._simulate_feedback(page, action)

        prompt = f"""你正在使用一个学习平台。你刚刚执行了以下操作：

【当前页面】{page.title}
【你的操作】{action}
【系统反馈】{feedback}

请完成以下任务：
1. 这个操作的结果是什么？你观察到了什么？
2. 这个结果让你对多智能体系统有了什么新的理解？
3. 你接下来想做什么？为什么？

请直接输出你的观察和思考。"""

        observation = await generate_chat_message(prompt)
        return observation.strip()

    def _simulate_feedback(self, page: PageSnapshot, action: str) -> str:
        """模拟系统对操作的反馈"""
        action_lower = action.lower()

        if page.id == "editor":
            if "添加" in action or "add" in action_lower:
                return "节点已添加到画布，显示为彩色卡片。你可以看到节点的ID和Role。"
            elif "边" in action or "edge" in action_lower:
                return "边已创建，连接两个节点。如果是条件边，需要配置判断条件。"
            elif "场景" in action or "scene" in action_lower:
                return "工作流已保存，跳转到2D可视化场景。你可以看到Agent的位置和状态。"
            elif "运行" in action or "run" in action_lower:
                return "工作流开始执行，第一个Agent（入口节点）开始处理任务。"

        elif page.id == "visualization":
            if "运行" in action or "run" in action_lower:
                return "Agent开始自动执行，你可以看到圆点移动、消息传递、日志输出。"
            elif "逐步" in action or "step" in action_lower:
                return "执行了一步，当前Agent完成任务，输出显示在日志中。"
            elif "暂停" in action or "pause" in action_lower:
                return "执行已暂停，你可以查看当前状态或修改配置。"

        elif page.id == "hide_seek":
            if "开始" in action or "start" in action_lower:
                return "游戏开始！搜索者开始寻找躲藏者。你可以看到搜索者移动、视野范围、躲藏者状态。"
            elif "共享" in action or "sharing" in action_lower:
                return "信息共享设置已切换。开启时躲藏者会收到队友警告，关闭时各自为战。"

        elif page.id == "templates":
            if "软件" in action or "dev" in action_lower:
                return "软件开发模板已加载。工作流包含PM->Architect->Developer->Test->Judge节点。"
            elif "新闻" in action or "news" in action_lower:
                return "新闻编辑模板已加载。工作流包含记者->编辑->核查->Judge节点。"
            elif "医疗" in action or "med" in action_lower:
                return "医疗诊断模板已加载。工作流包含问诊->诊断->检验->Judge->治疗节点。"

        return "操作已执行，系统正常响应。"

    async def summarize_knowledge(self) -> str:
        """
        学习结束后，LLM基于所有浏览和交互经验，自主总结学到的知识

        这模拟了人类学习后的知识内化过程
        """
        memory_text = "\n\n".join(self.memory)

        prompt = f"""你已经完成了对一个多智能体学习平台的探索学习。以下是你的学习记录：

【浏览过的页面】{', '.join(self.visited_pages)}

【学习笔记】
{memory_text}

现在，请基于你的学习经验，自主总结你学到的知识。不要复制上面的内容，而是用自己的话重新组织和理解。

请按以下结构输出：

1. 多智能体系统的核心概念（你理解的是什么）
2. 工作流设计的关键要素（节点、边、条件分支等）
3. 信息共享的作用和意义（从3D躲猫猫实验中你学到了什么）
4. 可视化如何帮助理解抽象概念
5. 你还能想到哪些多智能体的应用场景

注意：这是你的学习总结，应该反映你真正理解和记住的内容，而不是背诵定义。"""

        summary = await generate_chat_message(prompt)
        return summary.strip()

    async def learn(self, pages: List[PageSnapshot] = None) -> str:
        """
        执行完整的学习流程

        返回：学习者自主总结的知识
        """
        if pages is None:
            pages = get_all_pages()

        print(f"[学习者] 开始探索学习，水平：{self.level}")

        # 阶段1：浏览所有页面
        for page in pages:
            print(f"[学习者] 浏览页面：{page.title}")
            notes = await self.browse_page(page)
            self.memory.append(f"【浏览 {page.title}】\n{notes}")

        # 阶段2：执行关键交互（根据水平决定交互深度）
        interactions = self._get_interactions_by_level()
        for page_id, action in interactions:
            page = next((p for p in pages if p.id == page_id), None)
            if page:
                print(f"[学习者] 执行操作：{page.title} - {action}")
                observation = await self.interact(page, action)
                self.memory.append(f"【操作 {page.title}】\n{action}\n观察：{observation}")

        # 阶段3：自主总结知识
        print("[学习者] 总结学到的知识...")
        self.knowledge = await self.summarize_knowledge()

        print("[学习者] 学习完成")
        return self.knowledge

    def _get_interactions_by_level(self) -> List[tuple]:
        """根据水平决定执行哪些交互"""
        if self.level == "beginner":
            # 初学者：执行基础操作，可能遗漏一些功能
            return [
                ("templates", "点击'软件开发场景'模板"),
                ("editor", "查看模板中的节点和连接"),
                ("editor", "点击'进入场景'按钮"),
                ("visualization", "点击'运行'按钮"),
                ("visualization", "点击'逐步执行'观察每一步"),
                ("hide_seek", "点击'开始游戏'，观察搜索过程"),
                ("hide_seek", "切换信息共享开关，再开一局"),
            ]
        elif self.level == "intermediate":
            # 中级：更深入的探索
            return [
                ("templates", "浏览所有三个模板"),
                ("editor", "尝试修改一个节点的Prompt"),
                ("editor", "添加一个条件边，配置判断逻辑"),
                ("visualization", "运行并逐步执行，观察条件分支"),
                ("visualization", "暂停后修改Agent配置，继续执行"),
                ("hide_seek", "开启信息共享，运行多局观察统计"),
                ("hide_seek", "关闭信息共享，对比搜索轮次"),
                ("guide", "阅读用户指南，理解设计理念"),
            ]
        else:
            # 高级：全面探索，关注设计意图
            return [
                ("templates", "分析三个模板的设计差异"),
                ("editor", "从零创建一个简单工作流"),
                ("editor", "设计一个带循环的工作流"),
                ("visualization", "运行并分析Agent的协作模式"),
                ("visualization", "测试不同Prompt对输出的影响"),
                ("hide_seek", "多局统计，分析信息共享的效果"),
                ("hide_seek", "尝试不同躲藏者数量，观察差异"),
                ("guide", "阅读指南，思考教学设计的优劣"),
            ]

    async def answer_question(self, question: Question) -> Dict[str, Any]:
        """基于学习到的知识回答问题"""
        # 截取知识总结的关键部分，避免prompt过长
        knowledge_text = self.knowledge
        if len(knowledge_text) > 1500:
            knowledge_text = knowledge_text[:1500] + "\n...(知识总结已截断)"

        prompt = f"""你是一个学习者。你已经通过使用一个交互式学习平台学习了多智能体系统的知识。

这是你学到的知识总结：

{knowledge_text}

现在请回答以下问题。请根据你学到的知识作答，就像你在考试卷上直接作答一样。

要求：
- 直接回答问题，不要添加"作为AI"等前缀
- 简明扼要，不超过200字
- 抓住关键要点，不要展开过多论述

问题：{question.question}

请直接给出你的答案："""

        answer = await generate_chat_message(prompt)

        return {
            "question_id": question.id,
            "concept": question.concept,
            "difficulty": question.difficulty,
            "question": question.question,
            "answer": answer.strip()
        }


class InteractiveLearningEvaluator:
    """交互式学习效果评估器"""

    def __init__(self):
        self.questions = get_all_questions()

    def select_questions(self, concepts: List[str] = None, count: int = 6) -> List[Question]:
        """选择题目"""
        if concepts:
            selected = [q for q in self.questions if q.concept in concepts]
        else:
            selected = self.questions.copy()

        if count and count < len(selected):
            from random import shuffle
            shuffle(selected)
            # 确保每个概念至少一题
            result = []
            by_concept = {}
            for q in selected:
                by_concept.setdefault(q.concept, []).append(q)
            for concept_qs in by_concept.values():
                result.append(concept_qs[0])
            remaining = [q for q in selected if q not in result]
            result.extend(remaining[:count - len(result)])
            return result[:count]

        return selected

    async def run_pretest(self, learner: InteractiveLearner, questions: List[Question]) -> List[Dict]:
        """前测：学习之前测试（此时学习者还没有知识总结）"""
        results = []
        for q in questions:
            # 根据学习者水平构建不同的前测人设
            if learner.level == "beginner":
                persona = """你是一个完全没有接触过计算机相关知识的学习者。你听说过"人工智能"这个词，但不知道它具体是什么。你从未使用过 ChatGPT、DeepSeek 等 AI 对话工具，也从未听说过"多智能体系统""Agent""工作流""条件分支""信息共享"等概念。请完全基于你日常生活中的常识和直觉来回答，不要使用任何专业术语。"""
            elif learner.level == "intermediate":
                persona = """你是一个经常使用 AI 对话工具（如 ChatGPT、DeepSeek）的用户，对 AI 有基本的认知，知道 AI 可以回答问题、写文章。但你从未接触过多智能体系统（Multi-Agent System）的概念，不知道多个 AI Agent 可以协作完成任务，也不了解工作流设计、条件分支、Agent 间信息共享等机制。请基于你的 AI 使用经验和日常常识回答，不要假设你了解多智能体系统的专业知识。"""
            else:
                persona = """你是一个有实际使用过多智能体系统经验的用户，比如使用过 AutoGPT、MetaGPT、Coze 等平台搭建过 Agent 工作流，或者使用过 LangChain 编排过多个 LLM 调用。你了解多智能体协作的基本概念，但对教学场景下的工作流设计、条件分支的 pedagogical 价值、以及 3D 可视化如何帮助理解信息共享机制等本平台特有的教学设计缺乏了解。请基于你的多智能体实践经验回答，不要假设你了解本平台的教学设计理念。"""

            prompt = f"""{persona}

问题：{q.question}

请用你自己的话简要回答，不超过150字。"""
            answer = await generate_chat_message(prompt)
            results.append({
                "question_id": q.id,
                "concept": q.concept,
                "difficulty": q.difficulty,
                "question": q.question,
                "answer": answer.strip(),
                "phase": "pretest"
            })
        return results

    async def run_posttest(self, learner: InteractiveLearner, questions: List[Question]) -> List[Dict]:
        """后测：学习之后测试"""
        results = []
        for q in questions:
            result = await learner.answer_question(q)
            result["phase"] = "posttest"
            results.append(result)
        return results

    async def grade_answer(self, question: Question, answer: str) -> Dict[str, Any]:
        """评分"""
        grading_prompt = f"""你是一位严格的评分老师。请根据以下评分标准，对学生的答案进行评分。

题目：{question.question}

学生答案：
{answer}

评分标准：
{question.rubric}

请输出以下JSON格式（不要其他内容）：
{{
  "score": 分数（0-{question.max_score}的整数）,
  "feedback": "评分反馈，指出优点和不足",
  "key_points_missed": ["遗漏的关键点1", "遗漏的关键点2"]
}}"""

        try:
            response = await generate_chat_message(grading_prompt)
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                grading = json.loads(json_str)
            else:
                grading = {"score": 5, "feedback": "无法解析", "key_points_missed": []}
        except Exception:
            grading = {"score": 5, "feedback": "评分出错", "key_points_missed": []}

        return {
            "question_id": question.id,
            "score": grading.get("score", 0),
            "max_score": question.max_score,
            "feedback": grading.get("feedback", ""),
            "key_points_missed": grading.get("key_points_missed", []),
            "concept": question.concept,
            "difficulty": question.difficulty
        }

    async def evaluate(
        self,
        learner_level: str = "beginner",
        concepts: List[str] = None,
        question_count: int = 6
    ) -> Dict[str, Any]:
        """
        执行完整的交互式学习效果评估
        """
        questions = self.select_questions(concepts, question_count)

        # 创建学习者
        learner = InteractiveLearner(level=learner_level)

        # 前测（学习前）
        print("=" * 50)
        print("阶段1：前测")
        print("=" * 50)
        pretest_answers = await self.run_pretest(learner, questions)
        pretest_grades = []
        for ans in pretest_answers:
            q = next(q for q in questions if q.id == ans["question_id"])
            grade = await self.grade_answer(q, ans["answer"])
            pretest_grades.append(grade)

        # 学习过程（浏览+交互+总结）
        print("=" * 50)
        print("阶段2：学习过程")
        print("=" * 50)
        knowledge = await learner.learn()

        # 后测（学习后）
        print("=" * 50)
        print("阶段3：后测")
        print("=" * 50)
        posttest_answers = await self.run_posttest(learner, questions)
        posttest_grades = []
        for ans in posttest_answers:
            q = next(q for q in questions if q.id == ans["question_id"])
            grade = await self.grade_answer(q, ans["answer"])
            posttest_grades.append(grade)

        # 生成报告
        comparison = self._generate_comparison(pretest_grades, posttest_grades)
        report = self._generate_report(learner_level, comparison, learner.memory, knowledge)

        return {
            "learner_level": learner_level,
            "knowledge_summary": knowledge,
            "learning_memory": learner.memory,
            "questions": [{"id": q.id, "concept": q.concept, "difficulty": q.difficulty, "question": q.question} for q in questions],
            "pretest": {
                "answers": pretest_answers,
                "grades": pretest_grades,
                "total_score": sum(g["score"] for g in pretest_grades),
                "max_score": sum(g["max_score"] for g in pretest_grades)
            },
            "posttest": {
                "answers": posttest_answers,
                "grades": posttest_grades,
                "total_score": sum(g["score"] for g in posttest_grades),
                "max_score": sum(g["max_score"] for g in posttest_grades)
            },
            "comparison": comparison,
            "report": report
        }

    def _generate_comparison(self, pretest: List[Dict], posttest: List[Dict]) -> Dict:
        """生成对比分析"""
        total_pre = sum(g["score"] for g in pretest)
        total_post = sum(g["score"] for g in posttest)
        max_score = sum(g["max_score"] for g in pretest)

        concept_comparison = {}
        for pre, post in zip(pretest, posttest):
            concept = pre["concept"]
            if concept not in concept_comparison:
                concept_comparison[concept] = {"pre": 0, "post": 0, "count": 0}
            concept_comparison[concept]["pre"] += pre["score"]
            concept_comparison[concept]["post"] += post["score"]
            concept_comparison[concept]["count"] += 1

        difficulty_comparison = {1: {"pre": 0, "post": 0, "count": 0},
                                  2: {"pre": 0, "post": 0, "count": 0},
                                  3: {"pre": 0, "post": 0, "count": 0}}
        for pre, post in zip(pretest, posttest):
            diff = pre["difficulty"]
            difficulty_comparison[diff]["pre"] += pre["score"]
            difficulty_comparison[diff]["post"] += post["score"]
            difficulty_comparison[diff]["count"] += 1

        return {
            "total_pre_score": total_pre,
            "total_post_score": total_post,
            "max_score": max_score,
            "improvement": total_post - total_pre,
            "improvement_rate": round((total_post - total_pre) / max_score * 100, 1) if max_score > 0 else 0,
            "by_concept": concept_comparison,
            "by_difficulty": difficulty_comparison
        }

    def _generate_report(self, learner_level: str, comparison: Dict, _memory: List[str], knowledge: str) -> Dict[str, Any]:
        """生成评估报告"""
        improvement_rate = comparison["improvement_rate"]

        if improvement_rate >= 30:
            effectiveness = "显著提升"
        elif improvement_rate >= 15:
            effectiveness = "中等提升"
        elif improvement_rate > 0:
            effectiveness = "轻微提升"
        else:
            effectiveness = "无提升"

        weak_concepts = []
        for concept, data in comparison["by_concept"].items():
            if data["count"] > 0:
                avg_post = data["post"] / data["count"]
                if avg_post < 7:
                    weak_concepts.append(concept)

        return {
            "effectiveness": effectiveness,
            "improvement_rate": improvement_rate,
            "summary": f"学习者（{learner_level}）通过交互式学习，分数提升了{improvement_rate}%。",
            "weak_concepts": weak_concepts,
            "learning_depth": "浅层" if improvement_rate < 15 else "深层",
            "knowledge_quality": self._assess_knowledge_quality(knowledge)
        }

    def _assess_knowledge_quality(self, knowledge: str) -> Dict:
        """评估知识总结的质量"""
        # 简单的启发式评估
        indicators = {
            "has_concepts": "概念" in knowledge or "节点" in knowledge or "Agent" in knowledge,
            "has_examples": "例子" in knowledge or "场景" in knowledge or "如" in knowledge,
            "has_connections": "因此" in knowledge or "所以" in knowledge or "因为" in knowledge,
            "has_reflection": "理解" in knowledge or "发现" in knowledge or "意识到" in knowledge,
        }

        score = sum(1 for v in indicators.values() if v)

        return {
            "score": score,
            "indicators": indicators,
            "assessment": "优秀" if score >= 3 else "良好" if score >= 2 else "需要加强"
        }
