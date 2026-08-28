export interface ProblemAnalysisCandidateService {
  id: string;
  name: string;
}

export interface ProblemAnalysisCandidateCategory {
  id: string;
  name: string;
  services: ProblemAnalysisCandidateService[];
}

export interface ProblemAnalysisInput {
  text: string;
  categories: ProblemAnalysisCandidateCategory[];
  model: string;
  apiKey: string;
  endpointUrl?: string | null;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

export interface ProblemAnalysisResult {
  categoryId: string | null;
  serviceIds: string[];
  normalizedProblem: string;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion: string | null;
}

export interface AiConnectionTestResult {
  ok: boolean;
  message: string;
  latencyMs: number;
}

export interface AiProvider {
  analyzeProblem(input: ProblemAnalysisInput): Promise<ProblemAnalysisResult>;
  testConnection(input: { apiKey: string; model: string; endpointUrl?: string | null; timeoutMs: number }): Promise<AiConnectionTestResult>;
}
