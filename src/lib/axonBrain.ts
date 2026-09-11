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
  | 'delegation_candidate';

export interface BrainIntent {
  category: IntentCategory;
  confidence: number;
  summary: string;
  detectedEntities: {
    dates?: string[];
    files?: string[];
    codeKeywords?: string[];
    mathExpression?: string;
  };
  suggestedHandling: 'local_axon' | 'delegate_external' | 'interactive_query';
}

export interface BrainPlanStep {
  stepIndex: number;
  title: string;
  handler: 'axon_local' | 'external_delegate' | 'timeline_engine' | 'file_intelligence';
  toolOrProvider?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  summary?: string;
}

export interface BrainPlan {
  id: string;
  goal: string;
  steps: BrainPlanStep[];
  delegationRequired: boolean;
  delegationProposal?: {
    targetProvider: string;
    targetCapability?: CapabilityFeature;
    reason: string;
    fallbackAllowed: boolean;
  };
}

export interface DelegationDecision {
  shouldDelegate: boolean;
  suggestedProvider?: string;
  targetCapability?: CapabilityFeature;
  reason?: string;
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
 * AXON Brain Core
 * The central intelligence module that all user requests pass through.
 * Unified architecture: One AXON intelligence with internal access to external AI tools.
 */
export class AxonBrainCore {
  private intentClassifiers: IntentClassifierHook[] = [];
  private planModifiers: PlanModifierHook[] = [];
  private delegationEvaluators: DelegationEvaluatorHook[] = [];

  /**
   * Extension point: Register custom intent classifiers (for future phases)
   */
  public registerIntentClassifier(hook: IntentClassifierHook): void {
    this.intentClassifiers.push(hook);
  }

  /**
   * Extension point: Register custom plan modifiers (for future phases)
   */
  public registerPlanModifier(hook: PlanModifierHook): void {
    this.planModifiers.push(hook);
  }

  /**
   * Extension point: Register custom delegation evaluators (for future phases)
   */
  public registerDelegationEvaluator(hook: DelegationEvaluatorHook): void {
    this.delegationEvaluators.push(hook);
  }

  /**
   * Step 1: Understand the user's request
   * Analyzes text, attachments, and context to determine intent and entities.
   */
  public understandRequest(request: BrainRequest): BrainIntent {
    const text = (request.text || '').trim();

    // Check registered custom classifiers
    for (const classifier of this.intentClassifiers) {
      const custom = classifier(request);
      if (custom && custom.category) {
        return {
          category: custom.category,
          confidence: custom.confidence ?? 0.9,
          summary: custom.summary ?? 'Custom intent recognized',
          detectedEntities: custom.detectedEntities ?? {},
          suggestedHandling: custom.suggestedHandling ?? 'local_axon',
        };
      }
    }

    // 1. Check for Project Timeline queries ("when did I work on...", "what did I do on Sept 3rd")
    const isTimeline =
      /(?:when did (?:i|we)|what did (?:i|we) (?:do|work on)|show (?:my )?(?:work|activity|timeline|history)|work history|project timeline)/i.test(
        text
      ) ||
      /(?:when was .* (?:created|drafted|done|worked on|updated|written))/i.test(text);

    if (isTimeline) {
      return {
        category: 'project_timeline_query',
        confidence: 0.95,
        summary: 'Querying project activity records and work history dates.',
        detectedEntities: {},
        suggestedHandling: 'local_axon',
      };
    }

    // 2. Check for File Intelligence natural language search
    if (fileIntelligence.isNaturalLanguageFileQuery(text)) {
      return {
        category: 'file_intelligence_query',
        confidence: 0.9,
        summary: 'Natural language search across indexed files (docs, code, media).',
        detectedEntities: {},
        suggestedHandling: 'local_axon',
      };
    }

    // 3. Check for arithmetic calculation
    if (/^(?:what is |calculate |evaluate |compute )?[\d\s+\-*/().%^]+$/i.test(text)) {
      return {
        category: 'local_calculation',
        confidence: 0.95,
        summary: 'Deterministic arithmetic expression.',
        detectedEntities: { mathExpression: text },
        suggestedHandling: 'local_axon',
      };
    }

    // 4. Check for storage commands
    if (/(?:storage manifest|compress assets|storage budget|quantize)/i.test(text)) {
      return {
        category: 'storage_command',
        confidence: 0.85,
        summary: 'Device storage and asset manifest command.',
        detectedEntities: {},
        suggestedHandling: 'local_axon',
      };
    }

    // 5. Check for heavy code / reasoning that can be flagged for delegation
    if (/(?:write (?:a|an) (?:app|script|function|algorithm)|implement|synthesize|deep research|solve this complex)/i.test(text)) {
      return {
        category: 'delegation_candidate',
        confidence: 0.8,
        summary: 'High-complexity task suitable for potential external tool delegation.',
        detectedEntities: {},
        suggestedHandling: 'delegate_external',
      };
    }

    // Default conversational request
    return {
      category: 'conversational',
      confidence: 0.75,
      summary: 'Standard conversational interaction or query.',
      detectedEntities: {},
      suggestedHandling: 'local_axon',
    };
  }

  /**
   * Step 2: Form an execution plan
   * Outlines steps to solve the user's request.
   */
  public formPlan(
    request: BrainRequest,
    intent: BrainIntent,
    registry?: CapabilityRegistry
  ): BrainPlan {
    const planId = `plan-${Date.now()}`;
    const steps: BrainPlanStep[] = [];
    let delegationRequired = false;
    let delegationProposal: BrainPlan['delegationProposal'] = undefined;

    switch (intent.category) {
      case 'project_timeline_query':
        steps.push({
          stepIndex: 1,
          title: 'Query Project Timeline Data Store',
          handler: 'timeline_engine',
          status: 'pending',
          summary: 'Retrieve timestamped activity events matching query criteria.',
        });
        steps.push({
          stepIndex: 2,
          title: 'Synthesize Factual Timeline Response',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Format structured chronological summary with exact dates.',
        });
        break;

      case 'file_intelligence_query':
        steps.push({
          stepIndex: 1,
          title: 'Search File Intelligence Index',
          handler: 'file_intelligence',
          status: 'pending',
          summary: 'Query documents, code, images, and audio metadata.',
        });
        steps.push({
          stepIndex: 2,
          title: 'Compile File Matches',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Format matched files with summaries and sizes.',
        });
        break;

      case 'local_calculation':
      case 'storage_command':
        steps.push({
          stepIndex: 1,
          title: 'Execute Deterministic Local Routine',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Run on-device engine for offline safety.',
        });
        break;

      case 'delegation_candidate': {
        delegationRequired = true;
        const targetCap: CapabilityFeature = request.attachment ? 'vision_multimodal' : 'reasoning';
        const bestDelegate = registry?.getBestDelegateFor({
          feature: targetCap,
          requiresVision: Boolean(request.attachment),
        });

        delegationProposal = {
          targetProvider: bestDelegate?.provider || 'gemini',
          targetCapability: targetCap,
          reason: `Task involves ${targetCap}; suitable for external API delegation.`,
          fallbackAllowed: true,
        };

        steps.push({
          stepIndex: 1,
          title: 'Prepare Task Delegation Context',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Pack project context, notes, and attachments.',
        });
        steps.push({
          stepIndex: 2,
          title: `Delegate to External API (${delegationProposal.targetProvider})`,
          handler: 'external_delegate',
          toolOrProvider: delegationProposal.targetProvider,
          status: 'pending',
          summary: delegationProposal.reason,
        });
        break;
      }

      default:
        steps.push({
          stepIndex: 1,
          title: 'Process Conversational Request',
          handler: 'axon_local',
          status: 'pending',
          summary: 'Formulate response incorporating active project context.',
        });
        break;
    }

    let plan: BrainPlan = {
      id: planId,
      goal: intent.summary,
      steps,
      delegationRequired,
      delegationProposal,
    };

    // Allow registered plan modifiers to alter the plan
    for (const modifier of this.planModifiers) {
      const modified = modifier(request, intent, plan);
      if (modified) plan = modified;
    }

    return plan;
  }

  /**
   * Step 3: Evaluate whether to attempt locally or delegate to external AI tools
   * Clean extension point for Phase 1+ delegation logic.
   */
  public evaluateDelegation(
    request: BrainRequest,
    plan: BrainPlan,
    registry?: CapabilityRegistry
  ): DelegationDecision {
    const availableDelegates = registry ? registry.getAvailableCapabilities() : [];

    // Check custom delegation evaluators
    for (const evaluator of this.delegationEvaluators) {
      const customDecision = evaluator(request, plan, registry);
      if (customDecision && typeof customDecision.shouldDelegate === 'boolean') {
        return {
          shouldDelegate: customDecision.shouldDelegate,
          suggestedProvider: customDecision.suggestedProvider,
          targetCapability: customDecision.targetCapability,
          reason: customDecision.reason,
          eligibleDelegates: availableDelegates,
        };
      }
    }

    if (!plan.delegationRequired || !plan.delegationProposal) {
      return {
        shouldDelegate: false,
        reason: 'Handled directly by AXON local intelligence.',
        eligibleDelegates: availableDelegates,
      };
    }

    const { targetProvider, targetCapability, reason } = plan.delegationProposal;
    return {
      shouldDelegate: true,
      suggestedProvider: targetProvider,
      targetCapability,
      reason,
      eligibleDelegates: availableDelegates,
    };
  }

  /**
   * Central Pipeline Entry Point: processRequest
   * Every user request conceptually passes through this method.
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

    if (intent.category === 'project_timeline_query') {
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
    }

    // 5. Formulate activity record for project work tracking
    let activityEvent: ProjectActivityEvent | undefined;
    if (projectId) {
      let activityType: ProjectActivityType = 'message_sent';
      if (intent.category === 'file_intelligence_query' || intent.category === 'project_timeline_query') {
        activityType = 'tool_used';
      } else if (intent.category === 'code_execution') {
        activityType = 'code_executed';
      }

      const cleanSummary = text.length > 80 ? `${text.substring(0, 77)}...` : text;
      activityEvent = createProjectActivityEvent({
        projectId,
        type: activityType,
        title: intent.summary,
        summary: cleanSummary,
        metadata: {
          intentCategory: intent.category,
          delegationEvaluated: delegationDecision.shouldDelegate,
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
