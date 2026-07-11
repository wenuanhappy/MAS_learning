#!/usr/bin/env python3
"""
批量运行三种水平学习者的交互式评估，输出论文表格数据

用法:
    python run_batch_eval.py                     # 运行全部三个水平
    python run_batch_eval.py --levels beginner intermediate  # 指定水平
    python run_batch_eval.py --output batch_result.json      # 保存原始数据
"""

import asyncio
import argparse
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.evaluator.interactive_learner import InteractiveLearningEvaluator
from app.evaluator.questions import CONCEPTS


LEVEL_NAMES = {
    "beginner": "初学者",
    "intermediate": "中级",
    "advanced": "高级",
}

DIFFICULTY_NAMES = {1: "记忆", 2: "理解", 3: "应用"}


def print_table_5_3(results: dict):
    """不同水平学习者的前后测成绩"""
    print("\n" + "=" * 80)
    print("不同水平学习者的前后测成绩")
    print("=" * 80)
    header = f"{'学习者水平':<12} {'前测总分':>8} {'后测总分':>8} {'满分':>6} {'提升量':>8} {'提升率':>8} {'效果等级':>10}"
    print(header)
    print("-" * 80)

    for level in ["beginner", "intermediate", "advanced"]:
        if level not in results:
            continue
        r = results[level]
        comp = r["comparison"]
        pre = comp["total_pre_score"]
        post = comp["total_post_score"]
        max_s = comp["max_score"]
        imp = comp["improvement"]
        rate = comp["improvement_rate"]

        if rate >= 30:
            grade = "显著提升"
        elif rate >= 15:
            grade = "中等提升"
        elif rate > 0:
            grade = "轻微提升"
        else:
            grade = "无提升"

        row = f"{LEVEL_NAMES[level]:<12} {pre:>8} {post:>8} {max_s:>6} {imp:>8} {rate:>7.1f}% {grade:>10}"
        print(row)

    print()


def print_table_5_4(results: dict):
    """初学者各概念领域前后测平均分"""
    print("\n" + "=" * 80)
    print("初学者各概念领域前后测平均分")
    print("=" * 80)

    level = "beginner"
    if level not in results:
        print("（无初学者数据）")
        return

    comp = results[level]["comparison"]
    by_concept = comp["by_concept"]

    header = f"{'概念领域':<16} {'前测均分':>8} {'后测均分':>8} {'提升':>6} {'满分':>6}"
    print(header)
    print("-" * 60)

    for concept_key, concept_name in CONCEPTS.items():
        if concept_key in by_concept:
            d = by_concept[concept_key]
            cnt = d["count"]
            pre_avg = d["pre"] / cnt if cnt > 0 else 0
            post_avg = d["post"] / cnt if cnt > 0 else 0
            imp = post_avg - pre_avg
            max_per_q = 10
            row = f"{concept_name:<16} {pre_avg:>8.1f} {post_avg:>8.1f} {imp:>+6.1f} {max_per_q:>6}"
            print(row)

    print()


def print_table_5_5(results: dict):
    """初学者不同难度级别前后测平均分"""
    print("\n" + "=" * 80)
    print("初学者不同难度级别前后测平均分")
    print("=" * 80)

    level = "beginner"
    if level not in results:
        print("（无初学者数据）")
        return

    comp = results[level]["comparison"]
    by_diff = comp["by_difficulty"]

    header = f"{'难度级别':<12} {'前测均分':>8} {'后测均分':>8} {'提升':>6}"
    print(header)
    print("-" * 44)

    for diff in [1, 2, 3]:
        if diff in by_diff:
            d = by_diff[diff]
            cnt = d["count"]
            pre_avg = d["pre"] / cnt if cnt > 0 else 0
            post_avg = d["post"] / cnt if cnt > 0 else 0
            imp = post_avg - pre_avg
            row = f"{DIFFICULTY_NAMES[diff]:<12} {pre_avg:>8.1f} {post_avg:>8.1f} {imp:>+6.1f}"
            print(row)

    print()


def print_table_5_6(results: dict):
    """知识总结质量评估"""
    print("\n" + "=" * 80)
    print("知识总结质量评估")
    print("=" * 80)

    header = f"{'学习者水平':<12} {'核心概念':>8} {'具体例子':>8} {'概念联系':>8} {'学习反思':>8} {'总分':>6} {'等级':>8}"
    print(header)
    print("-" * 70)

    for level in ["beginner", "intermediate", "advanced"]:
        if level not in results:
            continue
        r = results[level]
        report = r.get("report", {})
        kq = report.get("knowledge_quality", {})
        indicators = kq.get("indicators", {})
        score = kq.get("score", 0)
        assessment = kq.get("assessment", "")

        core = "是" if indicators.get("contains_core_concepts", False) else "否"
        examples = "是" if indicators.get("contains_examples", False) else "否"
        connections = "是" if indicators.get("establishes_connections", False) else "否"
        reflection = "是" if indicators.get("contains_reflection", False) else "否"

        row = f"{LEVEL_NAMES[level]:<12} {core:>8} {examples:>8} {connections:>8} {reflection:>8} {score:>5}/4 {assessment:>8}"
        print(row)

    print()


def print_all_levels_detail(results: dict):
    """所有水平的概念维度和难度维度详细对比"""
    for level in ["beginner", "intermediate", "advanced"]:
        if level not in results:
            continue

        print(f"\n{'=' * 60}")
        print(f"  {LEVEL_NAMES[level]} 详细数据")
        print(f"{'=' * 60}")

        comp = results[level]["comparison"]

        # 概念维度
        print(f"\n  概念维度:")
        for concept_key, concept_name in CONCEPTS.items():
            if concept_key in comp["by_concept"]:
                d = comp["by_concept"][concept_key]
                cnt = d["count"]
                pre_avg = d["pre"] / cnt if cnt > 0 else 0
                post_avg = d["post"] / cnt if cnt > 0 else 0
                print(f"    {concept_name}: 前测{pre_avg:.1f} -> 后测{post_avg:.1f} (提升{post_avg - pre_avg:+.1f})")

        # 难度维度
        print(f"\n  难度维度:")
        for diff in [1, 2, 3]:
            if diff in comp["by_difficulty"]:
                d = comp["by_difficulty"][diff]
                cnt = d["count"]
                pre_avg = d["pre"] / cnt if cnt > 0 else 0
                post_avg = d["post"] / cnt if cnt > 0 else 0
                print(f"    {DIFFICULTY_NAMES[diff]}级: 前测{pre_avg:.1f} -> 后测{post_avg:.1f} (提升{post_avg - pre_avg:+.1f})")


async def run_single_level(evaluator: InteractiveLearningEvaluator, level: str) -> dict:
    """运行单个水平的评估"""
    print(f"\n{'#' * 60}")
    print(f"  开始评估: {LEVEL_NAMES[level]} ({level})")
    print(f"{'#' * 60}")

    result = await evaluator.evaluate(
        learner_level=level,
        concepts=None,
        question_count=6,
    )

    # 打印简要进度
    comp = result["comparison"]
    print(f"\n  >> {LEVEL_NAMES[level]} 完成: 前测{comp['total_pre_score']}/{comp['max_score']} "
          f"-> 后测{comp['total_post_score']}/{comp['max_score']} "
          f"(提升{comp['improvement']}, {comp['improvement_rate']}%)")

    return result


async def main():
    parser = argparse.ArgumentParser(description="批量运行三种水平学习者的交互式评估")
    parser.add_argument(
        '--levels',
        nargs='+',
        choices=['beginner', 'intermediate', 'advanced'],
        default=['beginner', 'intermediate', 'advanced'],
        help='要测试的学习者水平 (默认: 全部)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default=None,
        help='保存原始结果到JSON文件'
    )

    args = parser.parse_args()

    # 检查 API Key
    api_key = os.environ.get('DASHSCOPE_API_KEY')
    if not api_key:
        print("错误: 未设置 DASHSCOPE_API_KEY 环境变量")
        print("请先设置: export DASHSCOPE_API_KEY=your_key")
        sys.exit(1)
    print(f"API Key: {api_key[:10]}...")

    evaluator = InteractiveLearningEvaluator()
    results = {}

    print(f"\n将评估 {len(args.levels)} 个水平: {', '.join(LEVEL_NAMES[l] for l in args.levels)}")
    print("预计耗时: 每个水平约 3-5 分钟\n")

    for level in args.levels:
        result = await run_single_level(evaluator, level)
        results[level] = result

    # 输出表格
    print("\n\n")
    print("*" * 80)
    print("表格数据输出")
    print("*" * 80)

    print_table_5_3(results)
    print_table_5_4(results)
    print_table_5_5(results)
    print_table_5_6(results)
    print_all_levels_detail(results)

    # 保存原始数据
    if args.output:
        output_path = args.output
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"batch_eval_result_{timestamp}.json"

    # 清洗数据用于保存
    clean = {}
    for level, r in results.items():
        comp = r["comparison"]
        clean[level] = {
            "learner_level": level,
            "pretest_total": comp["total_pre_score"],
            "posttest_total": comp["total_post_score"],
            "max_score": comp["max_score"],
            "improvement": comp["improvement"],
            "improvement_rate": comp["improvement_rate"],
            "by_concept": comp["by_concept"],
            "by_difficulty": comp["by_difficulty"],
            "report": r.get("report", {}),
            "knowledge_summary": r.get("knowledge_summary", ""),
        }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(clean, f, ensure_ascii=False, indent=2)

    print(f"\n原始数据已保存到: {output_path}")
    print("\n完成！")


if __name__ == '__main__':
    asyncio.run(main())
