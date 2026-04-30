import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
});

const model = process.env.AI_MODEL || 'deepseek-chat';

interface InterviewContext {
  position: string;
  company?: string | null;
  interviewType: string;
  difficulty: number;
  focusAreas: string[];
  currentStage: string;
  resumeContent?: string | null;
}

interface ParsedResume {
  content: string;
  skills: string[];
  experience: string;
  projects: string;
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  intro: '自我介绍阶段 - 让候选人介绍自己和背景',
  project: '项目深挖阶段 - 深入询问候选人的项目经验',
  technical: '技术考察阶段 - 测试候选人的技术知识和能力',
  scenario: '场景追问阶段 - 通过实际场景测试应变能力',
  summary: '总结阶段 - 让候选人做整体总结',
};

async function chat(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  });
  return response.choices[0]?.message?.content || '';
}

async function chatStream(systemPrompt: string, userPrompt: string, onToken: (token: string) => void): Promise<string> {
  const stream = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    stream: true,
  });

  let fullText = '';
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    if (token) {
      fullText += token;
      onToken(token);
    }
  }
  return fullText;
}

async function chatJSON(systemPrompt: string, userPrompt: string): Promise<any> {
  const raw = await chat(systemPrompt, userPrompt);
  const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}

const SYSTEM_PROMPT = `你是一位专业的AI面试官，擅长根据候选人背景和岗位需求设计有深度的面试问题。
你的面试风格是：专业、严谨但不刻薄，善于引导候选人展现真实能力。
你会根据面试阶段和难度等级调整问题的深度和广度。`;

export const aiService = {
  /**
   * Parse resume raw text into structured data
   */
  async parseResume(rawText: string): Promise<ParsedResume> {
    const systemPrompt = `你是一个简历解析专家。请从简历原始文本中提取结构化信息。`;
    const userPrompt = `请从以下简历原始文本中提取结构化信息，输出 JSON：
{
  "content": "清洗后的完整简历文本（去除页码、多余空行等噪音，保留有意义的内容）",
  "skills": ["技能1", "技能2", ...],
  "experience": [{"company": "公司", "role": "职位", "duration": "时间段", "description": "工作描述"}],
  "projects": [{"name": "项目名", "description": "项目描述和技术栈"}]
}

简历原文：
---
${rawText}
---

只输出 JSON，不要任何其他文字。`;

    const parsed = await chatJSON(systemPrompt, userPrompt);

    return {
      content: parsed.content || rawText,
      skills: parsed.skills || [],
      experience: typeof parsed.experience === 'string' ? parsed.experience : JSON.stringify(parsed.experience || []),
      projects: typeof parsed.projects === 'string' ? parsed.projects : JSON.stringify(parsed.projects || []),
    };
  },

  /**
   * Generate an interview question
   */
  async generateQuestion(ctx: InterviewContext): Promise<{ questionId: string; content: string; questionType: string; stage: string }> {
    const userPrompt = `请为以下面试场景生成一个面试问题：
- 岗位：${ctx.position}
${ctx.company ? `- 公司：${ctx.company}` : ''}
- 面试类型：${ctx.interviewType}
- 难度：${ctx.difficulty}/5
- 关注领域：${ctx.focusAreas.join('、') || '综合评估'}
- 当前阶段：${STAGE_DESCRIPTIONS[ctx.currentStage] || ctx.currentStage}
${ctx.resumeContent ? `- 候选人简历摘要：\n${ctx.resumeContent}` : ''}

只返回问题内容本身，不要添加编号、说明或任何额外文字。`;

    const content = await chat(SYSTEM_PROMPT, userPrompt);

    return {
      questionId: `q-${ctx.currentStage}-${Date.now()}`,
      content: content.trim(),
      questionType: ctx.currentStage,
      stage: ctx.currentStage,
    };
  },

  /**
   * Evaluate a candidate's answer
   */
  async evaluateAnswer(
    ctx: InterviewContext,
    question: string,
    answer: string,
  ): Promise<{ score: number; feedback: string; needsFollowup: boolean; followup?: { content: string; questionId: string } }> {
    const userPrompt = `评估以下面试回答：
- 岗位：${ctx.position}
- 当前阶段：${STAGE_DESCRIPTIONS[ctx.currentStage] || ctx.currentStage}
- 难度：${ctx.difficulty}/5
${ctx.resumeContent ? `- 候选人简历摘要：\n${ctx.resumeContent}\n请结合简历内容评估回答是否与简历声称的能力一致。` : ''}

面试官问了：${question}
候选人回答：${answer}

请以JSON格式返回：
{
  "score": <1-10的分数>,
  "feedback": <2-3句简短评价，包含优点和改进建议>,
  "needsFollowup": <是否需要追问，true或false>,
  "followupContent": <追问问题内容，如果needsFollowup为false则为null>
}

只返回JSON，不要添加任何其他内容。`;

    const parsed = await chatJSON(SYSTEM_PROMPT, userPrompt);

    const result: any = {
      score: parsed.score || 7,
      feedback: parsed.feedback || '回答已完成',
      needsFollowup: parsed.needsFollowup || false,
    };

    if (parsed.needsFollowup && parsed.followupContent) {
      result.followup = {
        content: parsed.followupContent,
        questionId: `fq-${Date.now()}`,
      };
    }

    return result;
  },

  /**
   * Generate a follow-up question
   */
  async generateFollowup(
    ctx: InterviewContext,
    originalQuestion: string,
    answer: string,
  ): Promise<{ questionId: string; content: string; isFollowup: boolean }> {
    const userPrompt = `基于以下面试对话生成一个深入追问：
- 岗位：${ctx.position}
- 当前阶段：${STAGE_DESCRIPTIONS[ctx.currentStage] || ctx.currentStage}
${ctx.resumeContent ? `- 候选人简历摘要：\n${ctx.resumeContent}` : ''}

面试官问了：${originalQuestion}
候选人回答了：${answer}

追问应该挖掘回答中的细节、验证真实性或测试更深层的理解。
只返回追问问题内容本身，不要添加任何额外说明。`;

    const content = await chat(SYSTEM_PROMPT, userPrompt);

    return {
      questionId: `fu-${Date.now()}`,
      content: content.trim(),
      isFollowup: true,
    };
  },

  /**
   * Generate next-stage question (same as generateQuestion)
   */
  async generateNextStageQuestion(ctx: InterviewContext): Promise<{ questionId: string; content: string }> {
    const result = await aiService.generateQuestion(ctx);
    return { questionId: result.questionId, content: result.content };
  },

  /**
   * Generate interview report
   */
  async generateReport(
    ctx: InterviewContext,
    messages: Array<{ role: string; content: string; score?: number | null }>,
  ): Promise<{
    totalScore: number;
    percentile: number;
    scoreBreakdown: { technical: number; expression: number; project: number; stability: number };
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    weakTags: string[];
    recommendedTopics: string[];
  }> {
    const conversation = messages
      .map(m => `${m.role === 'ai' ? '面试官' : '候选人'}：${m.content}`)
      .join('\n');

    const userPrompt = `根据以下面试记录生成评估报告：
- 岗位：${ctx.position}
${ctx.company ? `- 公司：${ctx.company}` : ''}
- 面试类型：${ctx.interviewType}
- 难度：${ctx.difficulty}/5
${ctx.resumeContent ? `- 候选人简历摘要：\n${ctx.resumeContent}\n请对照简历评估候选人的实际回答是否与简历声称的能力一致。` : ''}

面试对话：
${conversation}

请以JSON格式返回报告：
{
  "totalScore": <0-100总分>,
  "percentile": <0-100百分位排名>,
  "scoreBreakdown": {
    "technical": <0-10技术能力>,
    "expression": <0-10表达能力>,
    "project": <0-10项目深度>,
    "stability": <0-10稳定性>
  },
  "summary": <200字总体评价>,
  "strengths": [<3-5个优势点>],
  "weaknesses": [<2-3个不足点>],
  "suggestions": [<3-5条改进建议>],
  "weakTags": [<2-4个弱点关键词标签>],
  "recommendedTopics": [<2-4个推荐学习主题>]
}

只返回JSON，不要添加任何其他内容。`;

    return await chatJSON(SYSTEM_PROMPT, userPrompt);
  },

  /**
   * Evaluate answer with streaming text output (for real-time display)
   */
  async evaluateAnswerStream(
    ctx: InterviewContext,
    question: string,
    answer: string,
    onToken: (token: string) => void,
  ): Promise<{ score: number; feedback: string; needsFollowup: boolean; followup?: { content: string; questionId: string } }> {
    const userPrompt = `评估以下面试回答：
- 岗位：${ctx.position}
- 当前阶段：${STAGE_DESCRIPTIONS[ctx.currentStage] || ctx.currentStage}
- 难度：${ctx.difficulty}/5
${ctx.resumeContent ? `- 候选人简历摘要：\n${ctx.resumeContent}\n请结合简历内容评估回答是否与简历声称的能力一致。` : ''}

面试官问了：${question}
候选人回答：${answer}

请以JSON格式返回：
{
  "score": <1-10的分数>,
  "feedback": <2-3句简短评价，包含优点和改进建议>,
  "needsFollowup": <是否需要追问，true或false>,
  "followupContent": <追问问题内容，如果needsFollowup为false则为null>
}

只返回JSON，不要添加任何其他内容。`;

    const raw = await chatStream(SYSTEM_PROMPT, userPrompt, onToken);
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    const result: any = {
      score: parsed.score || 7,
      feedback: parsed.feedback || '回答已完成',
      needsFollowup: parsed.needsFollowup || false,
    };

    if (parsed.needsFollowup && parsed.followupContent) {
      result.followup = {
        content: parsed.followupContent,
        questionId: `fq-${Date.now()}`,
      };
    }

    return result;
  },
};