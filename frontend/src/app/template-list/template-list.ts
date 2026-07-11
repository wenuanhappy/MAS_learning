import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  jsonPath: string;
  education: string;
}

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, Sidebar],
  templateUrl: './template-list.html',
  styleUrl: './template-list.css'
})
export class TemplateListComponent {

  templates: TemplateInfo[] = [
    {
      id: 'software_dev',
      name: '软件开发场景',
      description: 'PM → 架构师 → 开发 → 测试 → 判断，完整的软件开发流程',
      icon: '💻',
      jsonPath: 'assets/software_dev.json',
      education: `【多Agent在软件开发中的应用】

软件开发是最经典的多Agent协作场景之一。在真实项目中，不同角色（产品经理、架构师、开发者、测试工程师）各司其职，通过信息传递形成流水线。

核心知识点：
• 顺序协作（Sequential）：Agent按固定顺序依次执行，前一个的输出是后一个的输入。本场景中 PM→架构师→开发者→测试 就是典型的顺序模式。
• 条件循环（Conditional Loop）：测试不通过时，流程回到开发者重新修改代码，形成"开发-测试"循环，直到测试通过才继续。这是多Agent中常见的反馈机制。
• 角色分工与Prompt工程：每个Agent的Prompt定义了它的职责边界。观察每个节点的Prompt，理解如何通过精确的指令让Agent专注于自己的任务。

请尝试：
1. 用"逐步执行"模式运行，观察每个Agent收到什么上下文、输出什么内容
2. 点击小地图上的Agent查看其"完整Prompt"，理解上下文是如何在Agent间传递的
3. 修改开发者的Prompt（如"请用Python编写"），观察输出变化
4. 走近Agent按F对话，问它"你当前的任务是什么"`
    },
    {
      id: 'news_edit',
      name: '新闻编辑部场景',
      description: '记者 → 编辑 → 事实核查 → 判断，新闻稿件从撰写到发布的完整流程',
      icon: '📰',
      jsonPath: 'assets/news_edit.json',
      education: `【多Agent在内容审核中的应用】

新闻编辑场景展示了多Agent在内容生产与审核中的应用。与软件开发不同，这里的重点是"质量把关"——每个环节都在审查和改进前一个环节的产出。

核心知识点：
• 审核链（Review Chain）：记者撰写→编辑审阅→事实核查，形成多层审核链。每一层关注不同维度：编辑关注表达质量，核查员关注事实准确性。这种分层审核是多Agent系统的常见模式。
• 反馈回路（Feedback Loop）：核查不通过时，稿件回到记者重写而非编辑修改，说明反馈应回到最合适的处理节点。在多Agent设计中，循环的目标节点选择很重要。
• 角色专业化：编辑和核查员的职责不同——编辑优化表达，核查验证事实。专业化分工让每个Agent更聚焦，输出更可靠。

请思考：
1. 观察编辑如何修改记者的稿件，注意它保留了什么、修改了什么
2. 对比编辑输出和核查员输出，理解不同角色的关注点差异
3. 尝试修改记者的Prompt让它写一篇有事实错误的报道，看核查员能否发现
4. 思考：如果增加一个"排版Agent"，应该放在流程的哪个位置？`
    },
    {
      id: 'medical_diag',
      name: '医疗诊断场景',
      description: '问诊 → 初步诊断 → 检验分析 → 判断 → 治疗方案，多医生协作的诊断流程',
      icon: '🏥',
      jsonPath: 'assets/medical_diag.json',
      education: `【多Agent在专家协作决策中的应用】

医疗诊断场景展示了多个专业角色如何协作完成复杂决策。与流水线式协作不同，医疗诊断需要不同专业的医生共同参与，且存在"不确定性处理"的需求。

核心知识点：
• 专家协作（Expert Collaboration）：问诊医生收集信息→诊断医生分析→检验科医生验证，每个角色需要不同的专业知识。这种模式体现了多Agent系统的核心优势——让专业Agent做专业的事。
• 不确定性处理（Uncertainty Handling）：当检验结果不确定时，流程回到问诊阶段重新收集信息，而非盲目给出治疗方案。这是多Agent在安全关键场景中的重要设计原则。
• 信息聚合与决策：诊断医生需要综合问诊记录做出判断，治疗医生需要综合诊断和检验结果制定方案。多Agent系统中，下游Agent往往需要聚合多个上游Agent的输出。

请思考：
1. 用"逐步执行"观察问诊医生如何整理患者信息，诊断医生如何利用这些信息
2. 注意判断节点在"确诊"和"不确定"之间的决策逻辑
3. 修改问诊医生的Prompt，让它收集更详细的症状信息，观察诊断准确率是否提升
4. 思考：如果要增加一个"影像科Agent"，它应该在哪个环节介入？`
    }
  ];

  constructor(private http: HttpClient, private router: Router) {}

  loadTemplate(template: TemplateInfo) {
    this.http.get<any>(template.jsonPath).subscribe({
      next: (workflow) => {
        localStorage.setItem('currentWorkflow', JSON.stringify(workflow));
        localStorage.removeItem('currentWorkflowId');
        localStorage.setItem('currentWorkflowName', template.name);
        localStorage.setItem('templateEducation', template.education || '');
        this.router.navigate(['/editor']);
      },
      error: (err) => {
        console.error('模版加载失败', err);
      }
    });
  }
}
