export type ToneOption = "담백한" | "열정적인" | "전문적인" | "친근한";
export type QuestionMode = "auto" | "custom";

export interface GenerationInput {
  company: string;
  role: string;
  posting: string;
  experience: string;
  tone: ToneOption;
  characterLimit: number;
  questionMode: QuestionMode;
  customQuestions?: string[];
  makeNatural: boolean;
}

export interface GeneratedSection {
  question: string;
  answer: string;
}

export interface GeneratedEssay {
  title: string;
  sections: GeneratedSection[];
  overallTip?: string;
}

export interface GenerationRow {
  id: string;
  company: string;
  role: string;
  tone: ToneOption;
  created_at: string;
  output: GeneratedEssay;
}
