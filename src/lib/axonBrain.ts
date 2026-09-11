import {
  ChatMessage,
  ChatAttachment,
  NoteItem,
  ProjectActivityEvent,
  ProjectActivityType,
} from '../types';
import {
  CapabilityRegistry,
  CapabilityFeature,
  ExternalToolCapability,
} from './capabilityRegistry';
import {
  queryTimelineNaturalLanguage,
  createProjectActivityEvent,
} from './projectTimeline';
import { fileIntelligence } from './fileIntelligence';

export interface BrainRequestContext {
  conversationHistory?: ChatMessage[];
  projectNotes?: NoteItem[];
  systemContext?: string;
  timelineEvents?: ProjectActivityEvent[];
  capabilityRegistry?: CapabilityRegistry;
}

export interface BrainRequest {
  id: string;
  text: string;
  projectId?: string;
  attachment?: ChatAttachment;
  context?: BrainRequestContext;
}

export type IntentCategory =
  | 'conversational'
  | 'project_timeline_query'
  | 'file_intelligence_query'
  | 'local_calculation'
  | 'storage_command'
  | 'code_execution'
  | 'code_architecture_or_design'
  | 'research_and_synthesis'
  | 'analysis_and_debugging'
  | 'project_organization'
  | 'explain_reasoning_or_plan'
  | 'delegation_candidate';

export type ActionVerb =
  | 'analyze'
  | 'calculate'
  | 'explain'
  | 'plan'
  | 'synthesize'
  | 'code'
  | 'debug'
  | 'organize'
  | 'search'
  | 'query'
  | 'compare'
  | 'summarize'
  | 'chat';

export type TargetDomain =
  | 'software'
  | 'data'
  | 'research'
  | 'biblical_history'
  | 'system_storage'
  | 'project_management'
  | 'general';

export type ComplexityLevel = 'low' | 'medium' | 'high';

export interface BrainIntent {
  category: IntentCategory;
  primaryGoal: string;
  actionVerb: ActionVerb;
  targetDomain: TargetDomain;
  complexity: ComplexityLevel;
  confidence: number;
  summary: string;
  detectedEntities: {
    dates?: string[];
    files?: string[];
    codeKeywords?: string[];
    mathExpression?: string;
    keyConcepts?: string[];
  };
  constraints: {
    format?: 'bullets' | 'code' | 'table' | 'concise' | 'step_by_step' | 'standard';
    requiresExactMath?: boolean;
    requiresOffline?: boolean;
    requiresVision?: boolean;
  };
  isMetaPlanQuery: boolean;
  suggestedHandling: 'local_axon' | 'delegate_external' | 'interactive_query';
}

export interface BrainPlanStep {
  stepIndex: number;
  title: string;
  handler: 'axon_local' | 'external_delegate' | 'timeline_engine' | 'file_intelligence';
  toolOrProvider?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  summary: string;
  estimatedEffort?: 'minimal' | 'moderate' | 'complex';
}

export interface BrainPlan {
  id: string;
  goal: string;
  rationale: string;
  explanation: string;
  steps: BrainPlanStep[];
  delegationRequired: boolean;
  delegationProposal?: {
    targetProvider: string;
    targetCapability?: CapabilityFeature;
    reason: string;
    fallbackAllowed: boolean;
  };
  createdAt: string;
}

export interface DelegationDecision {
  shouldDelegate: boolean;
  suggestedProvider?: string;
  targetCapability?: CapabilityFeature;
  reason: string;
  eligibleDelegates: ExternalToolCapability[];
}

export interface BrainProcessResult {
  requestId: string;
  handledLocally: boolean;
  intent: BrainIntent;
  plan: BrainPlan;
  delegationDecision: DelegationDecision;
  localResponse?: string;
  modelLabel: string;
  activityEvent?: ProjectActivityEvent;
}

// Extension hook signatures for future phases (Phase 1+)
export type IntentClassifierHook = (request: BrainRequest) => Partial<BrainIntent> | null;
export type PlanModifierHook = (request: BrainRequest, intent: BrainIntent, plan: BrainPlan) => BrainPlan | null;
export type DelegationEvaluatorHook = (
  request: BrainRequest,
  plan: BrainPlan,
  registry?: CapabilityRegistry
) => Partial<DelegationDecision> | null;

/**
 * Safe deterministic arithmetic evaluator (zero eval, zero injection risk)
 */
function safeEvaluateMath(expr: string): { result: number; steps: string[] } | null {
  const cleanExpr = expr.replace(/[^\d.+\-*/%^()]/g, ' ').trim();
  if (!cleanExpr) return null;
  const tokens = cleanExpr.match(/(?:\d*\.?\d+)|[+\-*/%^()]/g);
  if (!tokens || tokens.length === 0) return null;

  try {
    let pos = 0;
    function peek(): string | undefined {
      return tokens![pos];
    }
    function consume(): string {
      return tokens![pos++];
    }

    function parseExpression(): number {
      let val = parseTerm();
      while (peek() === '+' || peek() === '-') {
        const op = consume();
        const next = parseTerm();
        val = op === '+' ? val + next : val - next;
      }
      return val;
    }

    function parseTerm(): number {
      let val = parsePower();
      while (peek() === '*' || peek() === '/' || peek() === '%') {
        const op = consume();
        const next = parsePower();
        if (op === '*') val = val * next;
        else if (op === '/') {
          if (next === 0) throw new Error('Division by zero');
          val = val / next;
        } else if (op === '%') {
          val = val % next;
        }
      }
      return val;
    }

    function parsePower(): number {
      let val = parseFactor();
      if (peek() === '^') {
        consume();
        const next = parsePower();
        val = Math.pow(val, next);
      }
      return val;
    }

    function parseFactor(): number {
      const tok = peek();
      if (!tok) throw new Error('Unexpected end of input');
      if (tok === '(') {
        consume();
        const val = parseExpression();
        if (peek() === ')') consume();
        return val;
      }
      if (tok === '-') {
        consume();
        return -parseFactor();
      }
      if (tok === '+') {
        consume();
        return parseFactor();
      }
      if (/^\d*\.?\d+$/.test(tok)) {
        consume();
        return parseFloat(tok);
      }
      throw new Error(`Unexpected token: ${tok}`);
    }

    const calculated = parseExpression();
    if (pos < tokens.length) return null;
    if (isNaN(calculated) || !isFinite(calculated)) return null;

    return {
      result: calculated,
      steps: [
        `Identified arithmetic expression: \`${cleanExpr}\``,
        `Evaluated operator precedence and computed result: **${calculated}**`,
      ],
    };
  } catch {
    return null;
  }
}

/**
 * AXON Brain Core
 * The central intelligence module that all user requests pass through.
 * Unified architecture: One AXON intelligence with internal reasoning, planning,
 * delegation evaluation, and project memory persistence.
 */
export class AxonBrainCore {
  private intentClassifiers: IntentClassifierHook[] = [];
  private planModifiers: PlanModifierHook[] = [];
  private delegationEvaluators: DelegationEvaluatorHook[] = [];

  // Active plans cache per project for explanation lookups and "what have you planned" queries
  private activePlansByProject: Map<string, BrainPlan> = new Map();
  private activeIntentsByProject: Map<string, BrainIntent> = new Map();
  private activeDecisionsByProject: Map<string, DelegationDecision> = new Map();

  /**
   * Extension point: Register custom intent classifiers
   */
  public registerIntentClassifier(hook: IntentClassifierHook): void {
    this.intentClassifiers.push(hook);
  }

  /**
   * Extension point: Register custom plan modifiers
   */
  public registerPlanModifier(hook: PlanModifierHook): void {
    this.planModifiers.push(hook);
  }

  /**
   * Extension point: Register custom delegation evaluators
   */
  public registerDelegationEvaluator(hook: DelegationEvaluatorHook): void {
    this.delegationEvaluators.push(hook);
  }

  /**
   * Retrieves the active or most recently formed plan for a project.
   */
  public getLastPlan(projectId?: string): BrainPlan | undefined {
    if (projectId && this.activePlansByProject.has(projectId)) {
      return this.activePlansByProject.get(projectId);
    }
    return this.activePlansByProject.get('default') || Array.from(this.activePlansByProject.values()).pop();
  }

  /**
   * Step 1: Understand the user's request
   * Parses what the user is actually asking for beyond superficial keyword matching:
   * evaluates primary goal, action directives, domain context, constraints, and detected entities.
   */
  public understandRequest(request: BrainRequest): BrainIntent {
    const text = (request.text || '').trim();
    const lowerText = text.toLowerCase();

    // Check registered custom classifiers first
    for (const classifier of this.intentClassifiers) {
      const custom = classifier(request);
      if (custom && custom.category) {
        return {
          category: custom.category,
          primaryGoal: custom.primaryGoal || custom.summary || 'Custom request goal',
          actionVerb: custom.actionVerb || 'analyze',
          targetDomain: custom.targetDomain || 'general',
          complexity: custom.complexity || 'medium',
          confidence: custom.confidence ?? 0.9,
          summary: custom.summary ?? 'Custom intent recognized',
          detectedEntities: custom.detectedEntities ?? {},
          constraints: custom.constraints ?? {},
          isMetaPlanQuery: Boolean(custom.isMetaPlanQuery),
          suggestedHandling: custom.suggestedHandling ?? 'local_axon',
        };
      }
    }

    // 1. Check for Meta-Query asking to explain AXON's plan, reasoning, or decision
    const isMetaPlanQuery =
      /(?:what(?:'s| is) (?:the|your) plan|how (?:are you|will you|do you plan to) (?:do|accomplish|tackle|handle|approach)|explain (?:your |the )?(?:plan|reasoning|approach|steps)|walk (?:me )?through (?:the|your) (?:plan|steps)|why did you (?:decide|choose)|show (?:me )?(?:the|your) plan)/i.test(
        lowerText
      );

    if (isMetaPlanQuery) {
      return {
        category: 'explain_reasoning_or_plan',
        primaryGoal: 'Explain active execution plan and reasoning steps',
        actionVerb: 'explain',
        targetDomain: 'project_management',
        complexity: 'low',
        confidence: 0.95,
        summary: 'User requested plain-language explanation of execution plan and reasoning.',
        detectedEntities: {},
        constraints: { format: 'step_by_step' },
        isMetaPlanQuery: true,
        suggestedHandling: 'local_axon',
      };
    }

    // 2. Check for Project Timeline queries ("when did I work on...", "what did I do on Sept 3rd", "show work history")
    const isTimeline =
      /(?:when did (?:i|we|you)|what did (?:i|we|you) (?:do|work on|plan)|show (?:my )?(?:work|activity|timeline|history|plans)|work history|project timeline|what plans)/i.test(
        lowerText
      ) ||
      /(?:when was .* (?:created|drafted|done|worked on|updated|written|planned))/i.test(lowerText);

    if (isTimeline) {
      return {
        category: 'project_timeline_query',
        primaryGoal: 'Query timestamped project activity records and chronological history',
        actionVerb: 'query',
        targetDomain: 'project_management',
        complexity: 'low',
        confidence: 0.95,
        summary: 'Querying project activity records and work history dates.',
        detectedEntities: this.extractEntities(text),
        constraints: {},
        isMetaPlanQuery: false,
        suggestedHandling: 'local_axon',
      };
    }

    // 3. Check for File Intelligence natural language search
    if (fileIntelligence.isNaturalLanguageFileQuery(text)) {
      return {
        category: 'file_intelligence_query',
        primaryGoal: 'Locate and inspect indexed project documents, code, or media files',
        actionVerb: 'search',
        targetDomain: 'software',
        complexity: 'low',
        confidence: 0.92,
        summary: 'Natural language search across indexed files (docs, code, media).',
        detectedEntities: this.extractEntities(text),
        constraints: {},
        isMetaPlanQuery: false,
        suggestedHandling: 'local_axon',
      };
    }

    // 4. Check for arithmetic calculation
    const mathPattern = /^(?:what is |calculate |evaluate |compute )?[\d\s+\-*/().%^]+$/i;
    const isMathExpr = mathPattern.test(text) && /[\d]/.test(text) && /[+\-*/%^]/.test(text);
    if (isMathExpr) {
      return {
        category: 'local_calculation',
        primaryGoal: `Evaluate arithmetic expression: ${text.replace(/^(?:what is |calculate |evaluate |compute )/i, '').trim()}`,
        actionVerb: 'calculate',
        targetDomain: 'data',
        complexity: 'low',
        confidence: 0.98,
        summary: 'Deterministic arithmetic evaluation requiring exact precision.',
        detectedEntities: { mathExpression: text, ...this.extractEntities(text) },
        constraints: { requiresExactMath: true },
        isMetaPlanQuery: false,
        suggestedHandling: 'local_axon',
      };
    }

    // 5. Check for storage & device manifest commands
    if (/(?:storage manifest|compress assets|storage budget|quantize|clean cache|free up space)/i.test(lowerText)) {
      return {
        category: 'storage_command',
        primaryGoal: 'Manage device storage manifest allocations and asset compression',
        actionVerb: 'organize',
        targetDomain: 'system_storage',
        complexity: 'medium',
        confidence: 0.9,
        summary: 'Device storage and asset manifest command.',
        detectedEntities: this.extractEntities(text),
        constraints: { requiresOffline: true },
        isMetaPlanQuery: false,
        suggestedHandling: 'local_axon',
      };
    }

    // 6. Check for software architecture, engineering, or design
    const isSoftwareDesign =
      /(?:architect|architecture|design (?:a|the)? (?:system|component|layout|module|store)|spec|interface|react|typescript|state flow|data model)/i.test(
        lowerText
      );
    if (isSoftwareDesign) {
      return {
        category: 'code_architecture_or_design',
        primaryGoal: this.synthesizeGoal(text, 'Design software architecture and module interfaces'),
        actionVerb: 'code',
        targetDomain: 'software',
        complexity: lowerText.length > 80 ? 'high' : 'medium',
        confidence: 0.88,
        summary: 'Software engineering architecture and structural design request.',
        detectedEntities: this.extractEntities(text),
        constraints: this.extractConstraints(lowerText),
        isMetaPlanQuery: false,
        suggestedHandling: 'local_axon',
      };
    }

    // 7. Check for research and textual synthesis (e.g. Scripture, linguistics, historical analysis)
    const isResearch =
      /(?:concordance|hebrew|greek|scripture|bible|historical|manuscript|linguistic|research|literature|compare texts)/i.test(
        lowerText
      );
    if (isResearch) {
      return {
        category: 'research_and_synthesis',
        primaryGoal: this.synthesizeGoal(text, 'Conduct research and comparative textual synthesis'),
        actionVerb: 'synthesize',
        targetDomain: 'biblical_history',
        complexity: 'medium',
        confidence: 0.88,
        summary: 'Comparative research and textual synthesis task.',
        detectedEntities: this.extractEntities(text),
        constraints: this.extractConstraints(lowerText),
        isMetaPlanQuery: false,
        suggestedHandling: 'local_axon',
      };
    }

    // 8. Check for debugging / diagnostic analysis
    const isDebugging =
      /(?:debug|troubleshoot|diagnose|fix (?:this|the) error|stack trace|bottleneck|memory leak|why is (?:it|this) failing)/i.test(
        lowerText
      );
    if (isDebugging) {
      return {
        category: 'analysis_and_debugging',
        primaryGoal: this.synthesizeGoal(text, 'Diagnose issue and formulate targeted resolution'),
        actionVerb: 'debug',
        targetDomain: 'software',
        complexity: 'medium',
        confidence: 0.86,
        summary: 'Diagnostic debugging and problem isolation.',
        detectedEntities: this.extractEntities(text),
        constraints: this.extractConstraints(lowerText),
        isMetaPlanQuery: false,
        suggestedHandling: 'local_axon',
      };
    }

    // 9. Check for heavy tasks outside AXON's standalone local capability (delegation candidate)
    // E.g. Multimodal vision with attachment, massive full-stack scaffolding, or live web search
    const hasVisualAttachment = Boolean(request.attachment && request.attachment.type.startsWith('image/'));
    const isMassiveBuild = /(?:build a full[- ]stack (?:app|application|platform)|generate entire codebase)/i.test(lowerText);
    const requiresLiveWeb = /(?:search the live web|crawl (?:this|the) website|current stock price)/i.test(lowerText);

    if (hasVisualAttachment || isMassiveBuild || requiresLiveWeb) {
      return {
        category: 'delegation_candidate',
        primaryGoal: this.synthesizeGoal(text, 'Execute complex specialized task'),
        actionVerb: hasVisualAttachment ? 'analyze' : 'code',
        targetDomain: 'software',
        complexity: 'high',
        confidence: 0.9,
        summary: hasVisualAttachment
          ? 'Multi-modal vision analysis required for attachment.'
          : 'Task exceeds standalone local execution boundaries.',
        detectedEntities: this.extractEntities(text),
        constraints: {
          requiresVision: hasVisualAttachment,
          ...this.extractConstraints(lowerText),
        },
        isMetaPlanQuery: false,
        suggestedHandling: 'delegate_external',
      };
    }

    // Default: Conversational interaction
    return {
      category: 'conversational',
      primaryGoal: this.synthesizeGoal(text, 'Address conversational inquiry'),
      actionVerb: 'chat',
      targetDomain: 'general',
      complexity: 'low',
      confidence: 0.78,
      summary: 'Conversational interaction or general question.',
      detectedEntities: this.extractEntities(text),
      constraints: this.extractConstraints(lowerText),
      isMetaPlanQuery: false,
      suggestedHandling: 'local_axon',
    };
  }

  /**
   * Helper: Extracts dates, filenames, code terms, and salient concepts from text.
   */
  private extractEntities(text: string): BrainIntent['detectedEntities'] {
    const dates: string[] = [];
    const files: string[] = [];
    const codeKeywords: string[] = [];
    const keyConcepts: string[] = [];

    // ISO dates & named dates
    const isoMatches = text.match(/\b202\d-[01]\d-[0-3]\d\b/g);
    if (isoMatches) dates.push(...isoMatches);

    const monthMatches = text.match(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december|sept|oct|nov|dec|jan|feb|mar|apr|jun|jul|aug)\s+\d{1,2}(?:st|nd|rd|th)?\b/gi);
    if (monthMatches) dates.push(...monthMatches);

    // Files
    const fileMatches = text.match(/\b[\w-]+\.(?:md|ts|tsx|js|jsx|json|txt|png|jpg|svg|css)\b/gi);
    if (fileMatches) files.push(...fileMatches);

    // Code keywords
    const codeMatches = text.match(/\b(?:react|typescript|javascript|vite|tailwind|redux|sqlite|express|css|html|api|json|dom|ast)\b/gi);
    if (codeMatches) codeKeywords.push(...Array.from(new Set(codeMatches.map((c) => c.toLowerCase()))));

    // Salient concepts (noun phrases)
    const conceptTerms = text
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 5 && !/^(should|would|could|please|thanks|really|actually)/i.test(w));
    if (conceptTerms.length > 0) {
      keyConcepts.push(...Array.from(new Set(conceptTerms.slice(0, 4))));
    }

    return { dates, files, codeKeywords, keyConcepts };
  }

  /**
   * Helper: Detects formatting constraints (e.g. bullets, code block, concise).
   */
  private extractConstraints(lowerText: string): BrainIntent['constraints'] {
    const constraints: BrainIntent['constraints'] = {};
    if (/(?:bullet(?:s| points)?|list(?:ed)?)/i.test(lowerText)) {
      constraints.format = 'bullets';
    } else if (/(?:code snippet|code block|function only)/i.test(lowerText)) {
      constraints.format = 'code';
    } else if (/(?:table|tabular)/i.test(lowerText)) {
      constraints.format = 'table';
    } else if (/(?:step by step|walkthrough|steps)/i.test(lowerText)) {
      constraints.format = 'step_by_step';
    } else if (/(?:concise|brief|short|one sentence)/i.test(lowerText)) {
      constraints.format = 'concise';
    }
    return constraints;
  }

  /**
   * Helper: Synthesizes a clean primary goal string from the text.
   */
  private synthesizeGoal(text: string, fallback: string): string {
    const cleaned = text.replace(/^(?:please|can you|could you|i want to|i need to|help me)\s+/i, '').trim();
    if (cleaned.length === 0) return fallback;
    const firstSentence = cleaned.split(/[.?!]/)[0].trim();
    if (firstSentence.length > 10 && firstSentence.length <= 90) {
      return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
    }
    return fallback;
  }

  /**
   * Step 2: Form an execution plan
   * Breaks the request into a clear, ordered sequence of steps tailored to the parsed intent,
   * even if some steps are currently placeholders for future capability phases.
   */
  public formPlan(
    request: BrainRequest,
    intent: BrainIntent,
    registry?: CapabilityRegistry
  ): BrainPlan {
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const steps: BrainPlanStep[] = [];
    let rationale = '';
    let explanation = '';
    let delegationRequired = false;
    let delegationProposal: BrainPlan['delegationProposal'] = undefined;

    switch (intent.category) {
      case 'explain_reasoning_or_plan': {
        const lastPlan = this.getLastPlan(request.projectId);
        rationale = 'User requested transparency into AXON reasoning and execution planning.';
        steps.push({
          stepIndex: 1,
          title: 'Retrieve Active Plan and Context',
          handler: 'axon_local',
          status: 'completed',
          summary: lastPlan
            ? `Retrieved active plan for "${lastPlan.goal}".`
            : 'Assembled current project reasoning context.',
          estimatedEffort: 'minimal',
        });
        steps.push({
          stepIndex: 2,
          title: 'Synthesize Plain-Language Explanation',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Convert internal step sequence and delegation decisions into clear conversational explanation.',
          estimatedEffort: 'minimal',
        });
        steps.push({
          stepIndex: 3,
          title: 'Present Reasoning Breakdown to User',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Deliver structured plan breakdown directly in conversational output.',
          estimatedEffort: 'minimal',
        });
        explanation =
          'I am retrieving the active execution plan from project memory and formatting a plain-language breakdown of my reasoning steps and decisions.';
        break;
      }

      case 'code_architecture_or_design': {
        rationale =
          'Architectural tasks require constraint analysis from workspace memory, modular design, and resource verification against device limits.';
        steps.push({
          stepIndex: 1,
          title: 'Analyze Architectural Constraints and Active Notes',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Review workspace memory, 4GB RAM budget limits, and existing design specs.',
          estimatedEffort: 'moderate',
        });
        steps.push({
          stepIndex: 2,
          title: 'Draft Module Interfaces and State Flow',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Formulate typed component architecture and state management boundaries.',
          estimatedEffort: 'moderate',
        });
        steps.push({
          stepIndex: 3,
          title: 'Verify Performance Footprint and Edge Cases',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Validate memory footprint, mobile responsive sizing, and clean lifecycle cleanup.',
          estimatedEffort: 'minimal',
        });
        steps.push({
          stepIndex: 4,
          title: 'Persist Specification into Project Notes',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Document architectural decisions into project knowledge base for future retrieval.',
          estimatedEffort: 'minimal',
        });
        explanation =
          'I will examine the project notes for our architecture specs and constraints, formulate the modular interface, check the memory footprint against our budget, and document the decisions into project memory.';
        break;
      }

      case 'research_and_synthesis': {
        rationale =
          'Research requires context retrieval from project files, comparative analysis, and structured synthesis.';
        steps.push({
          stepIndex: 1,
          title: 'Retrieve Background Context and Project Files',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Access research files, notes, and linguistical concordances associated with the project.',
          estimatedEffort: 'moderate',
        });
        steps.push({
          stepIndex: 2,
          title: 'Synthesize Comparative Linguistic Analysis',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Analyze source references, extract key historical/linguistic patterns, and draft findings.',
          estimatedEffort: 'moderate',
        });
        steps.push({
          stepIndex: 3,
          title: 'Format Structured Research Output',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Organize insights into cohesive, readable notes with citations and cross-references.',
          estimatedEffort: 'minimal',
        });
        explanation =
          'I will review our project research notes and linguistic files, perform a comparative analysis, and synthesize the findings into a clear, structured summary.';
        break;
      }

      case 'analysis_and_debugging': {
        rationale =
          'Debugging requires isolating failure points, diagnostic reasoning, and targeted remediation.';
        steps.push({
          stepIndex: 1,
          title: 'Isolate Diagnostic Symptoms and Context',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Identify error parameters, stack traces, and affected components.',
          estimatedEffort: 'minimal',
        });
        steps.push({
          stepIndex: 2,
          title: 'Formulate Root-Cause Hypothesis',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Trace runtime flow and pinpoint state mutations or asynchronous race conditions.',
          estimatedEffort: 'moderate',
        });
        steps.push({
          stepIndex: 3,
          title: 'Generate Targeted Fix and Validation Plan',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Produce minimal diff and recommend regression testing steps.',
          estimatedEffort: 'minimal',
        });
        explanation =
          'I will isolate the reported diagnostic parameters, trace the execution path to determine root cause, and formulate a targeted solution.';
        break;
      }

      case 'local_calculation': {
        rationale = 'Mathematical queries execute via deterministic on-device parser to ensure exact accuracy.';
        steps.push({
          stepIndex: 1,
          title: 'Parse Arithmetic Syntax and Bounds',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Extract mathematical tokens and validate operator hierarchy.',
          estimatedEffort: 'minimal',
        });
        steps.push({
          stepIndex: 2,
          title: 'Execute Deterministic Local Calculation',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Compute exact mathematical value locally without network latency.',
          estimatedEffort: 'minimal',
        });
        steps.push({
          stepIndex: 3,
          title: 'Format Mathematical Steps for User',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Provide verified calculation result and operational step breakdown.',
          estimatedEffort: 'minimal',
        });
        explanation =
          'I am evaluating this mathematical expression using AXON’s local arithmetic engine for exact precision.';
        break;
      }

      case 'storage_command': {
        rationale = 'Storage operations inspect the 15GB device manifest and apply compression policies.';
        steps.push({
          stepIndex: 1,
          title: 'Inspect Device Storage Manifest',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Audit current allocations across models, knowledge packs, cache, and user files.',
          estimatedEffort: 'minimal',
        });
        steps.push({
          stepIndex: 2,
          title: 'Execute Storage Routine and Compression',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Apply lossless compression or prune expired cache entries according to user budget.',
          estimatedEffort: 'moderate',
        });
        steps.push({
          stepIndex: 3,
          title: 'Update Manifest Statistics and Log Event',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Persist updated byte tallies to device manifest and record project activity.',
          estimatedEffort: 'minimal',
        });
        explanation =
          'I will inspect our device storage manifest, apply the configured optimization routine, and log the updated storage headroom.';
        break;
      }

      case 'project_timeline_query': {
        rationale = 'Timeline lookups query timestamped ProjectActivityEvent records for factual date reporting.';
        steps.push({
          stepIndex: 1,
          title: 'Query Project Timeline Data Store',
          handler: 'timeline_engine',
          status: 'pending',
          summary: 'Retrieve timestamped activity events matching query criteria.',
          estimatedEffort: 'minimal',
        });
        steps.push({
          stepIndex: 2,
          title: 'Synthesize Factual Timeline Response',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Format structured chronological summary with exact dates.',
          estimatedEffort: 'minimal',
        });
        explanation =
          'I will query our timestamped project activity records and summarize exactly what was worked on and when.';
        break;
      }

      case 'file_intelligence_query': {
        rationale = 'File searches inspect multi-type index catalog across documents, code, and media.';
        steps.push({
          stepIndex: 1,
          title: 'Search File Intelligence Index',
          handler: 'file_intelligence',
          status: 'pending',
          summary: 'Query documents, code, images, and audio metadata.',
          estimatedEffort: 'minimal',
        });
        steps.push({
          stepIndex: 2,
          title: 'Compile File Matches and Summaries',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Format matched files with summaries, sizes, and keywords.',
          estimatedEffort: 'minimal',
        });
        explanation =
          'I will search our indexed project files and return relevant matches with file sizes and summaries.';
        break;
      }

      case 'delegation_candidate': {
        delegationRequired = true;
        const targetCap: CapabilityFeature = intent.constraints.requiresVision
          ? 'vision_multimodal'
          : 'reasoning';

        const bestDelegate = registry?.getBestDelegateFor({
          feature: targetCap,
          requiresVision: intent.constraints.requiresVision,
        });

        const targetProvider = bestDelegate?.provider || 'gemini';
        const reason = intent.constraints.requiresVision
          ? 'Task involves multi-modal visual inspection of an uploaded asset, which exceeds standalone local text reasoning.'
          : 'Task involves heavy full-stack synthesis or live web retrieval exceeding standalone local capability.';

        delegationProposal = {
          targetProvider,
          targetCapability: targetCap,
          reason,
          fallbackAllowed: true,
        };

        rationale = 'Task requires specialized capabilities outside standalone local scope; flagged for external delegation.';
        steps.push({
          stepIndex: 1,
          title: 'Scope Requirements and Define Delegation Contract',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Extract input constraints, attachments, and expected response contract.',
          estimatedEffort: 'minimal',
        });
        steps.push({
          stepIndex: 2,
          title: `Flag for External Delegation (${targetProvider})`,
          handler: 'external_delegate',
          toolOrProvider: targetProvider,
          status: 'pending',
          summary: reason,
          estimatedEffort: 'complex',
        });
        steps.push({
          stepIndex: 3,
          title: 'Validate and Integrate Returned Output',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Inspect delegated output for compliance with project constraints.',
          estimatedEffort: 'minimal',
        });
        explanation = `This task involves ${targetCap}. I have scoped the requirements and flagged this for external tool delegation to ${targetProvider}.`;
        break;
      }

      default: {
        rationale = 'Conversational request addressed directly through AXON local intelligence with project context.';
        steps.push({
          stepIndex: 1,
          title: 'Interpret Conversational Goal with Project Context',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Evaluate user inquiry alongside active project system context and notes.',
          estimatedEffort: 'minimal',
        });
        steps.push({
          stepIndex: 2,
          title: 'Formulate Comprehensive Response',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Synthesize helpful, contextually grounded reply.',
          estimatedEffort: 'minimal',
        });
        steps.push({
          stepIndex: 3,
          title: 'Record Interaction to Project Memory',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Ensure key conversational context is preserved in project activity history.',
          estimatedEffort: 'minimal',
        });
        explanation =
          'I am synthesizing a context-aware response grounded in your active project workspace.';
        break;
      }
    }

    let plan: BrainPlan = {
      id: planId,
      goal: intent.primaryGoal,
      rationale,
      explanation,
      steps,
      delegationRequired,
      delegationProposal,
      createdAt: new Date().toISOString(),
    };

    // Allow registered plan modifiers to customize the plan
    for (const modifier of this.planModifiers) {
      const modified = modifier(request, intent, plan);
      if (modified) plan = modified;
    }

    // Cache plan for the active project
    this.activePlansByProject.set(request.projectId || 'default', plan);
    this.activeIntentsByProject.set(request.projectId || 'default', intent);

    return plan;
  }

  /**
   * Step 3: Decide: attempt directly, or flag for delegation
   * Core principle: AXON defaults to attempting the task itself.
   * If the task is clearly outside what AXON can currently do alone, it flags this internally
   * (using the Phase 0 delegation hook) rather than attempting and failing silently.
   * Actual delegation logic (calling external AI tools) is NOT executed in this phase.
   */
  public evaluateDelegation(
    request: BrainRequest,
    plan: BrainPlan,
    registry?: CapabilityRegistry
  ): DelegationDecision {
    const availableDelegates = registry ? registry.getAvailableCapabilities() : [];

    // Check custom delegation evaluators first
    for (const evaluator of this.delegationEvaluators) {
      const customDecision = evaluator(request, plan, registry);
      if (customDecision && typeof customDecision.shouldDelegate === 'boolean') {
        const decision: DelegationDecision = {
          shouldDelegate: customDecision.shouldDelegate,
          suggestedProvider: customDecision.suggestedProvider,
          targetCapability: customDecision.targetCapability,
          reason: customDecision.reason || 'Evaluated via custom delegation hook.',
          eligibleDelegates: availableDelegates,
        };
        this.activeDecisionsByProject.set(request.projectId || 'default', decision);
        return decision;
      }
    }

    // Default: Attempt task directly
    if (!plan.delegationRequired || !plan.delegationProposal) {
      const decision: DelegationDecision = {
        shouldDelegate: false,
        reason: 'AXON local intelligence handles this task directly using on-device reasoning and project context.',
        eligibleDelegates: availableDelegates,
      };
      this.activeDecisionsByProject.set(request.projectId || 'default', decision);
      return decision;
    }

    // Task exceeds local boundaries: Flag for delegation internally
    const { targetProvider, targetCapability, reason } = plan.delegationProposal;
    const decision: DelegationDecision = {
      shouldDelegate: true,
      suggestedProvider: targetProvider,
      targetCapability,
      reason,
      eligibleDelegates: availableDelegates,
    };
    this.activeDecisionsByProject.set(request.projectId || 'default', decision);
    return decision;
  }

  /**
   * Explaining itself:
   * Generates a short, plain-language conversational explanation of AXON's plan and reasoning.
   */
  public explainPlan(
    plan: BrainPlan,
    intent: BrainIntent,
    delegation: DelegationDecision
  ): string {
    const lines: string[] = [
      `Here is my execution plan for **"${plan.goal}"**:`,
      '',
      `**Plan Outline (${plan.steps.length} steps):**`,
    ];

    for (const step of plan.steps) {
      lines.push(`${step.stepIndex}. **${step.title}**`);
      lines.push(`   ${step.summary}`);
    }

    lines.push('');
    lines.push(`**Execution Decision:**`);
    if (delegation.shouldDelegate) {
      lines.push(
        `• **Flagged for Delegation**: ${delegation.reason} (Targeting ${delegation.suggestedProvider || 'external AI tool'}).`
      );
    } else {
      lines.push(
        `• **Direct Attempt**: ${delegation.reason}`
      );
    }

    return lines.join('\n');
  }

  /**
   * Central Pipeline Entry Point: processRequest
   * Every user request conceptually passes through this method:
   * 1. Understands the request (deep intent and entity analysis)
   * 2. Forms a step-by-step execution plan
   * 3. Evaluates delegation decision (defaults to direct attempt, flags if beyond local scope)
   * 4. Records the plan and decision to the Project System (timestamped activity record)
   * 5. Explains itself when requested
   */
  public async processRequest(request: BrainRequest): Promise<BrainProcessResult> {
    const { text, projectId, context } = request;
    const registry = context?.capabilityRegistry;
    const timelineEvents = context?.timelineEvents || [];

    // 1. Understand request
    const intent = this.understandRequest(request);

    // 2. Formulate plan
    const plan = this.formPlan(request, intent, registry);

    // 3. Evaluate delegation
    const delegationDecision = this.evaluateDelegation(request, plan, registry);

    // 4. Handle specialized internal queries directly if applicable
    let localResponse: string | undefined;
    let handledLocally = false;
    let modelLabel = 'AXON Core';

    if (intent.isMetaPlanQuery) {
      // Explaining itself on request
      const activePlan = this.getLastPlan(projectId) || plan;
      localResponse = this.explainPlan(activePlan, intent, delegationDecision);
      handledLocally = true;
      modelLabel = 'AXON Plan Explanation';
    } else if (intent.category === 'project_timeline_query') {
      const timelineResult = queryTimelineNaturalLanguage(timelineEvents, text, projectId);
      if (timelineResult.matches) {
        handledLocally = true;
        localResponse = timelineResult.answer;
        modelLabel = 'AXON Project Timeline';
      }
    } else if (intent.category === 'file_intelligence_query') {
      const fileResults = await fileIntelligence.search({
        naturalLanguageQuery: text,
        projectId,
      });
      handledLocally = true;
      localResponse = fileIntelligence.formatSearchResultsForResponse(text, fileResults);
      modelLabel = 'AXON File Intelligence';
    } else if (intent.category === 'local_calculation') {
      const mathResult = safeEvaluateMath(text);
      if (mathResult) {
        handledLocally = true;
        localResponse = [
          `**Calculation Result**: \`${mathResult.result}\``,
          '',
          ...mathResult.steps,
        ].join('\n');
        modelLabel = 'AXON Arithmetic Engine';
      }
    }

    // 5. Step 4: Record the plan and decision to the Project System with real timestamp
    let activityEvent: ProjectActivityEvent | undefined;
    if (projectId) {
      let activityType: ProjectActivityType = 'plan_created';
      if (intent.category === 'file_intelligence_query' || intent.category === 'project_timeline_query') {
        activityType = 'tool_used';
      } else if (intent.category === 'code_execution') {
        activityType = 'code_executed';
      }

      const decisionText = delegationDecision.shouldDelegate
        ? 'Flagged for delegation'
        : 'Attempting directly';

      const planSummary = `${plan.steps.length}-step plan formed (${decisionText}). ${plan.rationale}`;

      activityEvent = createProjectActivityEvent({
        projectId,
        type: activityType,
        title: intent.isMetaPlanQuery ? 'Plan Explained' : `Plan Formed: ${intent.primaryGoal}`,
        summary: planSummary,
        metadata: {
          planId: plan.id,
          goal: plan.goal,
          stepsCount: plan.steps.length,
          steps: plan.steps.map((s) => ({
            stepIndex: s.stepIndex,
            title: s.title,
            handler: s.handler,
            summary: s.summary,
          })),
          decision: delegationDecision.shouldDelegate ? 'flagged_for_delegation' : 'attempt_directly',
          decisionReason: delegationDecision.reason,
          targetCapability: delegationDecision.targetCapability,
          explanation: plan.explanation,
          intentCategory: intent.category,
          actionVerb: intent.actionVerb,
          targetDomain: intent.targetDomain,
          complexity: intent.complexity,
        },
      });
    }

    return {
      requestId: request.id,
      handledLocally,
      intent,
      plan,
      delegationDecision,
      localResponse,
      modelLabel,
      activityEvent,
    };
  }
}

// Export singleton instance
export const axonBrain = new AxonBrainCore();
