import type { WebSocket } from "uWebSockets.js";

export type Player = {
  id: string;
  displayName: string;
  score: number;
};

export type Answer = {
  id: string;
  text: string;
};

export type Question = {
  id: string;
  title: string;
  description: string;
  timeMs: number;
  answers: Answer[];
};

export type QuestionAnswered = Question & {
  answerCorrectID: string;
};

export type PlayerConnected = Player & {
  ws: WebSocket<unknown>;
  answersPicked: Map<string, string>;
}

export const sampleQuestionsAnswered: QuestionAnswered[] = [
  {
    id: "1",
    title: "What is the capital of France?",
    description: "",
    timeMs: 10_000,
    answers: [
      { id: "1", text: "Paris" },
      { id: "2", text: "Lyon" },
      { id: "3", text: "Marseille" },
      { id: "4", text: "Toulouse" },
    ],
    answerCorrectID: "1",
  },
  {
    id: "2",
    title: "What is the capital of Germany?",
    description: "",
    timeMs: 10_000,
    answers: [
      { id: "1", text: "Berlin" },
      { id: "2", text: "Munich" },
      { id: "3", text: "Cologne" },
      { id: "4", text: "Frankfurt" },
    ],
    answerCorrectID: "1",
  },
  {
    id: "3",
    title: "What is the capital of Italy?",
    description: "",
    timeMs: 10_000,
    answers: [
      { id: "1", text: "Rome" },
      { id: "2", text: "Milan" },
      { id: "3", text: "Naples" },
      { id: "4", text: "Turin" },
    ],
    answerCorrectID: "1",
  },
];

export function stripQuestionAnswered(question: QuestionAnswered): Question {
  const { answerCorrectID, ...rest } = question;
  return rest;
}

export function stripPlayerConnected(player: PlayerConnected): Player {
  const { ws, ...rest } = player;
  return rest;
}

export const sampleQuestions: Question[] = sampleQuestionsAnswered.map(
  stripQuestionAnswered,
);
