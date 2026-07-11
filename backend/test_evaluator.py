import asyncio
import os

# 检查环境变量 - 直接从环境读取
api_key = os.environ.get('DASHSCOPE_API_KEY') or os.getenv('DASHSCOPE_API_KEY')
print('API Key:', api_key[:10] + '...' if api_key else 'NOT SET')

from app.evaluator.interactive_learner import InteractiveLearningEvaluator

async def test():
    evaluator = InteractiveLearningEvaluator()
    # 只测试1个概念，2道题，减少API调用
    result = await evaluator.evaluate(
        learner_level='beginner',
        concepts=['info_sharing'],
        question_count=2
    )

    print('\n' + '='*60)
    print('学习过程记录')
    print('='*60)
    for i, memory in enumerate(result['learning_memory']):
        print(f'\n--- 记忆 {i+1} ---')
        print(memory[:500] + '...' if len(memory) > 500 else memory)

    print('\n' + '='*60)
    print('知识总结')
    print('='*60)
    print(result['knowledge_summary'][:1000])

    print('\n' + '='*60)
    print('前后测对比')
    print('='*60)
    print(f"前测总分: {result['pretest']['total_score']} / {result['pretest']['max_score']}")
    print(f"后测总分: {result['posttest']['total_score']} / {result['posttest']['max_score']}")
    print(f"提升率: {result['comparison']['improvement_rate']}%")

    print('\n' + '='*60)
    print('评估报告')
    print('='*60)
    print(f"效果: {result['report']['effectiveness']}")
    print(f"总结: {result['report']['summary']}")

asyncio.run(test())
