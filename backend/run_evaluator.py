#!/usr/bin/env python3
"""
交互式学习效果评估运行脚本

用法:
    python run_evaluator.py                    # 默认运行 beginner 级别，全部概念，6题
    python run_evaluator.py --level advanced   # 指定学习者水平
    python run_evaluator.py --concepts info_sharing workflow_design  # 指定概念
    python run_evaluator.py --count 4          # 指定题目数量
    python run_evaluator.py --output result.json  # 保存结果到文件
    python run_evaluator.py --verbose          # 显示详细学习过程
"""

import asyncio
import argparse
import json
import os
import sys
from datetime import datetime

# 确保能导入 app 模块
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.evaluator.interactive_learner import InteractiveLearningEvaluator
from app.evaluator.questions import CONCEPTS


def print_section(title: str, char: str = "="):
    """打印分隔线"""
    print(f"\n{char * 60}")
    print(title)
    print(char * 60)


def print_learning_memory(memory: list, verbose: bool = False):
    """打印学习过程记录"""
    print_section("学习过程记录")

    for i, item in enumerate(memory, 1):
        lines = item.split('\n')
        header = lines[0] if lines else f"记忆 {i}"

        if not verbose:
            # 简洁模式：只显示标题和前200字
            content = '\n'.join(lines[1:]) if len(lines) > 1 else ""
            preview = content[:200].replace('\n', ' ')
            if len(content) > 200:
                preview += "..."
            print(f"\n{i}. {header}")
            print(f"   {preview}")
        else:
            # 详细模式：显示完整内容
            print(f"\n--- 记忆 {i} ---")
            print(item)


def print_knowledge_summary(summary: str):
    """打印知识总结"""
    print_section("知识总结")
    print(summary)


def print_test_results(phase: str, answers: list, grades: list):
    """打印测试结果"""
    print_section(f"{phase}详情")

    total_score = sum(g["score"] for g in grades)
    max_score = sum(g["max_score"] for g in grades)

    for ans, grade in zip(answers, grades):
        print(f"\n【题目】{ans['question']}")
        print(f"【答案】{ans['answer'][:300]}..." if len(ans['answer']) > 300 else f"【答案】{ans['answer']}")
        print(f"【评分】{grade['score']}/{grade['max_score']} - {grade['feedback']}")
        if grade.get('key_points_missed'):
            print(f"【遗漏】{', '.join(grade['key_points_missed'])}")

    print(f"\n{phase}总分: {total_score} / {max_score}")
    return total_score, max_score


def print_comparison(comparison: dict):
    """打印对比分析"""
    print_section("前后测对比分析")

    print(f"前测总分: {comparison['total_pre_score']} / {comparison['max_score']}")
    print(f"后测总分: {comparison['total_post_score']} / {comparison['max_score']}")
    print(f"提升分数: {comparison['improvement']}")
    print(f"提升率: {comparison['improvement_rate']}%")

    print("\n按概念对比:")
    for concept, data in comparison['by_concept'].items():
        concept_name = CONCEPTS.get(concept, concept)
        pre_avg = data['pre'] / data['count'] if data['count'] > 0 else 0
        post_avg = data['post'] / data['count'] if data['count'] > 0 else 0
        print(f"  {concept_name}: 前测{pre_avg:.1f} -> 后测{post_avg:.1f} (提升{post_avg-pre_avg:.1f})")

    print("\n按难度对比:")
    difficulty_names = {1: "记忆", 2: "理解", 3: "应用"}
    for diff, data in comparison['by_difficulty'].items():
        if data['count'] > 0:
            pre_avg = data['pre'] / data['count']
            post_avg = data['post'] / data['count']
            print(f"  {difficulty_names.get(diff, diff)}级: 前测{pre_avg:.1f} -> 后测{post_avg:.1f}")


def print_report(report: dict):
    """打印评估报告"""
    print_section("评估报告")

    print(f"效果评估: {report['effectiveness']}")
    print(f"提升率: {report['improvement_rate']}%")
    print(f"学习深度: {report['learning_depth']}")
    print(f"总结: {report['summary']}")

    if report.get('weak_concepts'):
        print(f"\n薄弱环节: {', '.join(report['weak_concepts'])}")

    if report.get('knowledge_quality'):
        kq = report['knowledge_quality']
        print(f"\n知识总结质量:")
        print(f"  评分: {kq['score']}/4")
        print(f"  评估: {kq['assessment']}")
        print(f"  指标:")
        for indicator, value in kq['indicators'].items():
            status = "是" if value else "否"
            print(f"    - {indicator}: {status}")


def save_result(result: dict, filepath: str):
    """保存结果到JSON文件"""
    # 清理不可序列化的内容
    clean_result = {
        "timestamp": datetime.now().isoformat(),
        "learner_level": result["learner_level"],
        "questions": result["questions"],
        "pretest": {
            "total_score": result["pretest"]["total_score"],
            "max_score": result["pretest"]["max_score"],
            "answers": [
                {
                    "question_id": a["question_id"],
                    "question": a["question"],
                    "answer": a["answer"],
                    "score": g["score"],
                    "max_score": g["max_score"],
                    "feedback": g["feedback"]
                }
                for a, g in zip(result["pretest"]["answers"], result["pretest"]["grades"])
            ]
        },
        "posttest": {
            "total_score": result["posttest"]["total_score"],
            "max_score": result["posttest"]["max_score"],
            "answers": [
                {
                    "question_id": a["question_id"],
                    "question": a["question"],
                    "answer": a["answer"],
                    "score": g["score"],
                    "max_score": g["max_score"],
                    "feedback": g["feedback"]
                }
                for a, g in zip(result["posttest"]["answers"], result["posttest"]["grades"])
            ]
        },
        "comparison": result["comparison"],
        "report": result["report"],
        "knowledge_summary": result["knowledge_summary"],
    }

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(clean_result, f, ensure_ascii=False, indent=2)

    print(f"\n结果已保存到: {filepath}")


async def main():
    parser = argparse.ArgumentParser(
        description="运行交互式学习效果评估",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s                           # 默认运行
  %(prog)s --level advanced          # 高级学习者
  %(prog)s --concepts info_sharing   # 只测信息共享
  %(prog)s --count 3 --verbose       # 3题详细模式
  %(prog)s --output result.json      # 保存结果
        """
    )

    parser.add_argument(
        '--level',
        choices=['beginner', 'intermediate', 'advanced'],
        default='beginner',
        help='学习者水平 (默认: beginner)'
    )

    parser.add_argument(
        '--concepts',
        nargs='+',
        choices=list(CONCEPTS.keys()),
        default=None,
        help=f'要测试的概念领域 (可选: {", ".join(CONCEPTS.keys())})'
    )

    parser.add_argument(
        '--count',
        type=int,
        default=6,
        help='题目数量 (默认: 6)'
    )

    parser.add_argument(
        '--output',
        type=str,
        default=None,
        help='结果保存路径 (JSON格式)'
    )

    parser.add_argument(
        '--verbose',
        action='store_true',
        help='显示详细学习过程'
    )

    parser.add_argument(
        '--quick',
        action='store_true',
        help='快速模式: 只测1个概念2道题'
    )

    args = parser.parse_args()

    # 快速模式覆盖其他参数
    if args.quick:
        args.concepts = ['info_sharing']
        args.count = 2
        print("[快速模式] 只测试信息共享概念，2道题\n")

    # 显示配置
    print_section("评估配置")
    print(f"学习者水平: {args.level}")
    print(f"测试概念: {', '.join(args.concepts) if args.concepts else '全部'}")
    print(f"题目数量: {args.count}")
    print(f"详细模式: {'是' if args.verbose else '否'}")

    # 检查API Key
    api_key = os.environ.get('DASHSCOPE_API_KEY') or os.getenv('DASHSCOPE_API_KEY')
    if not api_key:
        print("\n错误: 未设置 DASHSCOPE_API_KEY 环境变量")
        print("请先设置: export DASHSCOPE_API_KEY=your_key")
        sys.exit(1)
    print(f"API Key: {api_key[:10]}...")

    # 运行评估
    evaluator = InteractiveLearningEvaluator()

    print("\n开始评估...")
    print("(这可能需要几分钟，取决于题目数量和API响应速度)")

    result = await evaluator.evaluate(
        learner_level=args.level,
        concepts=args.concepts,
        question_count=args.count
    )

    # 打印结果
    if args.verbose:
        print_learning_memory(result['learning_memory'], verbose=True)
    else:
        print_learning_memory(result['learning_memory'], verbose=False)

    print_knowledge_summary(result['knowledge_summary'])

    print_test_results("前测", result['pretest']['answers'], result['pretest']['grades'])
    print_test_results("后测", result['posttest']['answers'], result['posttest']['grades'])

    print_comparison(result['comparison'])
    print_report(result['report'])

    # 保存结果
    if args.output:
        save_result(result, args.output)
    else:
        # 默认保存带时间戳的文件
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        default_file = f"eval_result_{args.level}_{timestamp}.json"
        save_result(result, default_file)

    print_section("评估完成", "=")


if __name__ == '__main__':
    asyncio.run(main())
