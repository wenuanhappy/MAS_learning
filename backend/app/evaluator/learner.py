"""
LLM 学习者模拟器
模拟一个从零开始学习多智能体系统的学习者
"""

from app.evaluator.questions import Question, get_all_questions
from app.llm.client import generate_chat_message
from typing import List, Dict, Any
import json


# 平台核心知识库 -- 模拟学习者通过使用平台获得的知识
PLATFORM_KNOWLEDGE = """
【多智能体系统基础】
- 多智能体系统（Multi-Agent System, MAS）是由多个自主Agent组成的系统，这些Agent通过协作完成复杂任务
- 每个Agent有自己的角色、职责和能力，可以独立决策
- Agent之间通过消息传递进行通信和协调
- 例子：蚁群觅食、交通信号灯协调、足球队配合

【工作流设计】
- 工作流由节点（Node）和边（Edge）组成
- 节点代表一个Agent或一个处理步骤，包含ID、Role、Prompt
- 边代表Agent之间的信息传递和执行顺序
- 入口节点（Entry Node）是工作流执行的起点，决定了哪个Agent先开始工作

【条件分支与循环】
- 条件分支：根据某个条件的结果选择不同的执行路径
- 判断节点（Judge Agent）：根据前序输出做条件判断，输出JSON格式的条件结果
- 循环：当条件不满足时，工作流可以回到之前的节点重新执行
- 循环需要设置终止条件（如最大循环次数），避免无限循环

【信息共享】
- 在多智能体系统中，Agent之间可以共享信息以提高整体效率
- 3D躲猫猫场景中，躲藏者之间可以传递"搜索者在我附近"的警告
- 信息共享可以扩大个体的感知范围（通过队友获得自己看不到的信息）
- 信息共享的好处：提前预警、协调行动、提高整体存活率
- 信息共享的风险：信息过载、通信延迟、隐私问题

【可视化与调试】
- 2D小地图展示Agent位置、移动轨迹和交互关系
- 3D场景展示空间位置、视野范围和障碍物
- 逐步执行功能可以一步一步观察Agent的行为，适合学习和调试
- 日志面板记录每个Agent的决策过程和结果

【实际应用场景】
- 软件开发：PM -> Architect -> Developer -> Test -> 判断 -> 循环
- 新闻编辑：记者 -> 编辑 -> 事实核查 -> 判断 -> 循环
- 医疗诊断：问诊 -> 初步诊断 -> 检验分析 -> 判断 -> 治疗
- 其他场景：智能客服、自动驾驶车队、无人机群、智能交通
"""


class SimulatedLearner:
    """模拟学习者：可以配置不同的学习水平"""

    def __init__(self, level: str = "beginner"):
        """
        level: "beginner" | "intermediate" | "advanced"
        - beginner: 只掌握基础知识，容易混淆概念
        - intermediate: 理解核心概念，能应用到简单场景
        - advanced: 深入理解，能设计复杂系统
        """
        self.level = level
        self.knowledge = self._build_knowledge()

    def _build_knowledge(self) -> str:
        """根据学习水平构建知识库"""
        if self.level == "beginner":
            # 初学者：只掌握部分知识，有一些误解
            return PLATFORM_KNOWLEDGE + """
【学习者的误解/不足】
- 可能混淆"节点"和"Agent"的概念
- 不太理解条件分支的具体实现方式
- 对信息共享的风险认识不足
- 难以将知识应用到全新场景
"""
        elif self.level == "intermediate":
            # 中级：掌握大部分知识，能简单应用
            return PLATFORM_KNOWLEDGE + """
【学习者的理解】
- 能正确区分各种概念
- 理解条件分支和循环的作用
- 能分析信息共享的利弊
- 可以将知识应用到类似场景
"""
        else:  # advanced
            # 高级：深入理解，能创新应用
            return PLATFORM_KNOWLEDGE + """
【学习者的深入理解】
- 不仅能应用知识，还能分析不同设计的优劣
- 理解多智能体系统的底层原理
- 能设计复杂的工作流，考虑异常处理
- 能将多智能体思想迁移到各种领域
"""

    async def answer_question(self, question: Question) -> Dict[str, Any]:
        """让模拟学习者回答一个问题"""

        prompt = f"""你是一个正在学习"多智能体系统"的学习者。你已经通过使用一个交互式学习平台了解了以下知识：

{self.knowledge}

现在请回答以下问题。请根据你学到的知识作答，不要添加"作为AI"或"根据我的知识"等表述，就像你在考试卷上直接作答一样。

问题：{question.question}

请直接给出你的答案，尽量详细且有条理。"""

        answer = await generate_chat_message(prompt)

        return {
            "question_id": question.id,
            "concept": question.concept,
            "difficulty": question.difficulty,
            "question": question.question,
            "answer": answer.strip()
        }


class LearningEffectEvaluator:
    """学习效果评估器：执行前测-学习-后测流程"""

    def __init__(self):
        self.questions = get_all_questions()

    def select_questions(self, concepts: List[str] = None, count: int = None) -> List[Question]:
        """选择要测试的题目"""
        if concepts:
            selected = [q for q in self.questions if q.concept in concepts]
        else:
            selected = self.questions.copy()

        if count and count < len(selected):
            # 按概念和难度均匀采样
            selected = self._sample_questions(selected, count)

        return selected

    def _sample_questions(self, questions: List[Question], count: int) -> List[Question]:
        """均匀采样，确保每个概念和难度都有覆盖"""
        from random import shuffle

        # 按概念分组
        by_concept = {}
        for q in questions:
            by_concept.setdefault(q.concept, []).append(q)

        result = []
        # 每个概念至少选1题
        for concept_qs in by_concept.values():
            shuffle(concept_qs)
            result.append(concept_qs[0])

        # 剩余名额按难度均匀分配
        remaining = count - len(result)
        if remaining > 0:
            remaining_qs = [q for q in questions if q not in result]
            shuffle(remaining_qs)
            result.extend(remaining_qs[:remaining])

        return result[:count]

    async def run_pretest(self, learner: SimulatedLearner, questions: List[Question]) -> List[Dict]:
        """前测：在学习之前测试"""
        results = []
        for q in questions:
            result = await learner.answer_question(q)
            result["phase"] = "pretest"
            results.append(result)
        return results

    async def run_posttest(self, learner: SimulatedLearner, questions: List[Question]) -> List[Dict]:
        """后测：在学习之后测试"""
        results = []
        for q in questions:
            result = await learner.answer_question(q)
            result["phase"] = "posttest"
            results.append(result)
        return results

    async def grade_answer(self, question: Question, answer: str) -> Dict[str, Any]:
        """使用LLM评分"""

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
            # 尝试解析JSON
            # 找到JSON部分
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                grading = json.loads(json_str)
            else:
                grading = {
                    "score": 5,
                    "feedback": "无法解析评分结果",
                    "key_points_missed": []
                }
        except Exception:
            grading = {
                "score": 5,
                "feedback": "评分过程出错",
                "key_points_missed": []
            }

        return {
            "question_id": question.id,
            "score": grading.get("score", 0),
            "max_score": question.max_score,
            "feedback": grading.get("feedback", ""),
            "key_points_missed": grading.get("key_points_missed", []),
            "concept": question.concept,
            "difficulty": question.difficulty
        }

    async def evaluate_learning(
        self,
        learner_level: str = "beginner",
        concepts: List[str] = None,
        question_count: int = 6
    ) -> Dict[str, Any]:
        """
        执行完整的学习效果评估流程

        返回：
        {
            "learner_level": 学习者水平,
            "questions": 测试题目列表,
            "pretest": 前测结果,
            "posttest": 后测结果,
            "comparison": 前后测对比,
            "report": 评估报告
        }
        """
        # 选择题目
        questions = self.select_questions(concepts, question_count)

        # 创建学习者
        learner = SimulatedLearner(level=learner_level)

        # 前测
        pretest_answers = await self.run_pretest(learner, questions)

        # 评分前测
        pretest_grades = []
        for ans in pretest_answers:
            q = next(q for q in questions if q.id == ans["question_id"])
            grade = await self.grade_answer(q, ans["answer"])
            pretest_grades.append(grade)

        # 后测（使用同样的题目，但学习者已经"学习"了）
        posttest_answers = await self.run_posttest(learner, questions)

        # 评分后测
        posttest_grades = []
        for ans in posttest_answers:
            q = next(q for q in questions if q.id == ans["question_id"])
            grade = await self.grade_answer(q, ans["answer"])
            posttest_grades.append(grade)

        # 生成对比报告
        comparison = self._generate_comparison(pretest_grades, posttest_grades)

        # 生成评估报告
        report = self._generate_report(learner_level, comparison, questions)

        return {
            "learner_level": learner_level,
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
        """生成前后测对比分析"""
        total_pre = sum(g["score"] for g in pretest)
        total_post = sum(g["score"] for g in posttest)
        max_score = sum(g["max_score"] for g in pretest)

        # 按概念对比
        concept_comparison = {}
        for pre, post in zip(pretest, posttest):
            concept = pre["concept"]
            if concept not in concept_comparison:
                concept_comparison[concept] = {"pre": 0, "post": 0, "count": 0}
            concept_comparison[concept]["pre"] += pre["score"]
            concept_comparison[concept]["post"] += post["score"]
            concept_comparison[concept]["count"] += 1

        # 按难度对比
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

    def _generate_report(
        self,
        learner_level: str,
        comparison: Dict,
        questions: List[Question]
    ) -> Dict[str, Any]:
        """生成评估报告"""
        _ = questions  # questions used for potential future expansion
        improvement_rate = comparison["improvement_rate"]

        # 判断学习效果
        if improvement_rate >= 30:
            effectiveness = "显著提升"
            summary = f"学习者表现出显著的学习效果，分数提升了{improvement_rate}%。平台的内容设计和交互方式对学习者有很强的帮助。"
        elif improvement_rate >= 15:
            effectiveness = "中等提升"
            summary = f"学习者有一定的学习效果，分数提升了{improvement_rate}%。平台在部分概念上传达有效，但仍有改进空间。"
        elif improvement_rate > 0:
            effectiveness = "轻微提升"
            summary = f"学习者仅有轻微提升（{improvement_rate}%）。可能需要优化平台的内容呈现方式或增加练习环节。"
        else:
            effectiveness = "无提升"
            summary = "学习者没有表现出学习效果。需要检查平台内容是否清晰、题目是否合适、或者学习路径是否需要重新设计。"

        # 找出薄弱环节
        weak_concepts = []
        for concept, data in comparison["by_concept"].items():
            if data["count"] > 0:
                avg_post = data["post"] / data["count"]
                if avg_post < 7:  # 满分10分，低于7分算薄弱
                    weak_concepts.append(concept)

        # 难度分析
        difficulty_analysis = {}
        for diff, data in comparison["by_difficulty"].items():
            if data["count"] > 0:
                avg_pre = data["pre"] / data["count"]
                avg_post = data["post"] / data["count"]
                difficulty_analysis[diff] = {
                    "avg_pre": round(avg_pre, 1),
                    "avg_post": round(avg_post, 1),
                    "improvement": round(avg_post - avg_pre, 1)
                }

        return {
            "effectiveness": effectiveness,
            "summary": summary,
            "weak_concepts": weak_concepts,
            "difficulty_analysis": difficulty_analysis,
            "recommendations": self._generate_recommendations(
                effectiveness, weak_concepts, difficulty_analysis, learner_level
            )
        }

    def _generate_recommendations(
        self,
        effectiveness: str,
        weak_concepts: List[str],
        difficulty_analysis: Dict,
        learner_level: str
    ) -> List[str]:
        """生成改进建议"""
        recommendations = []

        if effectiveness in ["无提升", "轻微提升"]:
            recommendations.append("建议增加更多交互式示例，让学习者能够动手操作而不仅仅是观察")
            recommendations.append('考虑在关键概念处添加"概念检查"小问题，确保学习者理解后再继续')

        if weak_concepts:
            concept_names = {
                "ma_basics": "多智能体基础",
                "workflow_design": "工作流设计",
                "condition_loop": "条件分支与循环",
                "info_sharing": "信息共享",
                "visualization": "可视化与调试",
                "application": "实际应用"
            }
            weak_names = [concept_names.get(c, c) for c in weak_concepts]
            recommendations.append(f"以下概念领域需要加强：{', '.join(weak_names)}。建议增加相关练习和案例")

        # 难度分析
        if 3 in difficulty_analysis and difficulty_analysis[3]["improvement"] < 2:
            recommendations.append("高难度（应用级）题目提升不明显，建议增加更多 scaffolding（支架）支持，如分步提示、模板等")

        if 1 in difficulty_analysis and difficulty_analysis[1]["improvement"] < 2:
            recommendations.append("基础概念的记忆题提升不明显，可能需要检查内容是否清晰表达")

        if learner_level == "beginner" and effectiveness == "显著提升":
            recommendations.append("初学者学习效果很好，可以考虑增加进阶内容或挑战任务")

        if not recommendations:
            recommendations.append("整体学习效果良好，建议保持当前设计，并考虑增加更多实际应用场景")

        return recommendations
