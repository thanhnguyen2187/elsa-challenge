import { assign, fromPromise, setup } from "xstate";
import {
  type QuestionAnswered,
  type PlayerConnected,
  sampleQuestionsAnswered,
  stripQuestionAnswered,
} from "shared/domain";
import type uWS from "uWebSockets.js";

export namespace Constant {
  export const MachineID = "Quizz";
  export const TickMs = 500;
}

export namespace State {
  export const Initializing = "Initializing";
  export const Waiting = "Waiting";
  export const Playing = "Playing";
  export const Error_ = "Error";
  export const Leaderboard = "Leaderboard";
  export const Final = "Final";

  export type Type =
    | typeof Initializing
    | typeof Waiting
    | typeof Error_
    | typeof Leaderboard
    | typeof Final;

  export function generate(states: Type[]): string {
    return `#${Constant.MachineID}.${states.join(".")}`;
  }
}

export namespace Context {
  export type Type = {
    quizzID: string;
    wsOrganizer: uWS.WebSocket<unknown> | undefined;
    wsPlayersMap: Map<string, PlayerConnected>;
    questionsAnswered: QuestionAnswered[];
    questionIndex: number;
    elapsedMs: number;
  };

  export type Input = {
    quizzID: string;
  };

  export function create({ input }: { input: Input }): Type {
    return {
      ...input,
      wsOrganizer: undefined,
      wsPlayersMap: new Map(),
      questionsAnswered: [],
      questionIndex: 0,
      elapsedMs: 0,
    };
  }
}

export namespace Event {
  export type Organizer_ServerChecking = {
    type: "Organizer_ServerChecking";
    wsOrganizer: uWS.WebSocket<unknown>;
  };

  export type Player_ServerChecking = {
    type: "Player_ServerChecking";
    playerID: string;
    wsPlayer: uWS.WebSocket<unknown>;
  };

  export type Organizer_Start = {
    type: "Organizer_Start";
  };

  export type Organizer_Completed = {
    type: "Organizer_Completed";
  };

  export type Organizer_Continue = {
    type: "Organizer_Continue";
  };

  export type Organizer_Finished = {
    type: "Organizer_Finished";
  };

  export type All =
    | Organizer_ServerChecking
    | Organizer_Start
    | Organizer_Completed
    | Organizer_Continue
    | Organizer_Finished
    | Player_ServerChecking;
}

export namespace Actor {
  export const readQuestionsAnswered = fromPromise(
    async ({
      input,
    }: { input: { quizzID: string } }): Promise<QuestionAnswered[]> => {
      // stimulate fetching from database or another service
      return sampleQuestionsAnswered;
    },
  );

  export const map = {
    readQuestionsAnswered,
  };
}

export namespace Guard {}

export const machine = setup({
  types: {
    input: {} as Context.Input,
    context: {} as Context.Type,
    events: {} as Event.All,
  },
  actors: Actor.map,
  delays: {
    currentQuestion: ({ context }) => {
      return context.questionsAnswered[context.questionIndex].timeMs;
    },
  },
}).createMachine({
  id: Constant.MachineID,
  initial: State.Initializing,
  context: Context.create,
  states: {
    [State.Initializing]: {
      invoke: {
        input: ({ context }) => ({
          quizzID: context.quizzID,
        }),
        src: "readQuestionsAnswered",
        onDone: {
          target: State.Waiting,
          actions: [
            assign({
              questionsAnswered: ({ context, event }) => event.output,
            }),
          ],
        },
        onError: [State.Error_],
      },
    },
    [State.Waiting]: {
      on: {
        Organizer_ServerChecking: {
          actions: [
            assign({
              wsOrganizer: ({ event }) => event.wsOrganizer,
            }),
            ({ context, event }) => {
              event.wsOrganizer.send(
                JSON.stringify({
                  type: "ServerReady",
                  questions: context.questionsAnswered.map(
                    stripQuestionAnswered,
                  ),
                }),
              );
            },
          ],
        },
        Player_ServerChecking: {
          actions: [
            // TODO: make the actions less repetitive
            assign({
              wsPlayersMap: ({ context, event }) => {
                const wsPlayersMap = context.wsPlayersMap;
                const displayName = `Player ${wsPlayersMap.size + 1}`;
                const player = {
                  id: event.playerID,
                  displayName,
                  score: 0,
                };
                wsPlayersMap.set(event.playerID, {
                  ws: event.wsPlayer,
                  ...player,
                });
                return wsPlayersMap;
              },
            }),
            ({ context, event }) => {
              const displayName = `Player ${context.wsPlayersMap.size}`;
              event.wsPlayer.send(JSON.stringify({ type: "ServerReady" }));
              event.wsPlayer.send(
                JSON.stringify({ type: "SetDisplayName", value: displayName }),
              );
              event.wsPlayer.send(
                JSON.stringify({
                  type: "SetQuestions",
                  value: context.questionsAnswered.map(stripQuestionAnswered),
                }),
              );
            },
          ],
        },
        Organizer_Start: {
          target: State.Playing,
          actions: [
            ({ context, event }) => {
              context.wsOrganizer?.send(JSON.stringify({ type: "GameStart" }));
              for (const [, player] of context.wsPlayersMap) {
                player.ws.send(JSON.stringify({ type: "GameStart" }));
              }
            },
          ],
        },
      },
    },
    [State.Playing]: {
      always: [
        {
          guard: ({ context }) =>
            context.questionIndex >= context.questionsAnswered.length,
          target: State.Final,
        },
      ],
      on: {
        Organizer_Completed: State.Leaderboard,
        Organizer_Finished: State.Final,
      },
      after: {
        currentQuestion: {
          actions: [
            assign({
              questionIndex: ({ context }) => context.questionIndex + 1,
            }),
            ({ context }) => {
              context.wsOrganizer?.send(JSON.stringify({ type: "Completed" }));
              for (const [, player] of context.wsPlayersMap) {
                player.ws.send(JSON.stringify({ type: "Completed" }));
              }
            },
          ],
          target: State.Leaderboard,
        },
      },
    },
    [State.Leaderboard]: {
      on: {
        Organizer_Continue: State.Playing,
      }
    },
    [State.Final]: {},
    [State.Error_]: {},
  },
  on: {},
});
