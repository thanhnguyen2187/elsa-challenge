import { assign, fromPromise, setup } from "xstate";
import {
  type QuestionAnswered,
  type PlayerConnected,
  sampleQuestionsAnswered,
  stripQuestionAnswered,
  stripPlayerConnected,
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

  export type Organizer_GameStart = {
    type: "Organizer_GameStart";
  };

  export type Player_AnswerPicked = {
    type: "Player_AnswerPicked";
    wsPlayer: uWS.WebSocket<unknown>;
    questionID: string;
    answerID: string;
    playerID: string;
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

  export type Organizer_Restart = {
    type: "Organizer_Restart";
  };

  export type All =
    | Organizer_ServerChecking
    | Organizer_GameStart
    | Player_AnswerPicked
    | Organizer_Completed
    | Organizer_Continue
    | Organizer_Finished
    | Organizer_Restart
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
        onError: State.Error_,
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
                }),
              );
              event.wsOrganizer.send(
                JSON.stringify({
                  type: "SetQuestions",
                  value: context.questionsAnswered.map(stripQuestionAnswered),
                }),
              );
              event.wsOrganizer.send(
                JSON.stringify({
                  type: "SetPlayers",
                  value: Array.from(context.wsPlayersMap.values()).map(
                    stripPlayerConnected,
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
                const displayName = `Player ${context.wsPlayersMap.size + 1}`;
                const newPlayer = {
                  id: event.playerID,
                  displayName,
                  score: 0,
                };
                wsPlayersMap.set(event.playerID, {
                  ws: event.wsPlayer,
                  answersPicked: new Map(),
                  ...newPlayer,
                });
                return wsPlayersMap;
              },
            }),
            ({ context, event }) => {
              const displayName = `Player ${context.wsPlayersMap.size}`;
              const newPlayer = {
                id: event.playerID,
                displayName,
                score: 0,
              };

              // Notify the new player
              event.wsPlayer.send(JSON.stringify({ type: "ServerReady" }));
              event.wsPlayer.send(
                JSON.stringify({
                  type: "SetQuestions",
                  value: context.questionsAnswered.map(stripQuestionAnswered),
                }),
              );
              event.wsPlayer.send(
                JSON.stringify({
                  type: "SetPlayers",
                  value: Array.from(context.wsPlayersMap.values()).map(
                    stripPlayerConnected,
                  ),
                }),
              );

              // Notify everyone that a new player joined. In case the new
              // player is notified, his name will be set.
              {
                const event = {
                  type: "PlayerJoined",
                  player: newPlayer,
                };
                const eventStr = JSON.stringify(event);
                for (const [, player] of context.wsPlayersMap) {
                  player.ws.send(eventStr);
                }
                context.wsOrganizer?.send(eventStr);
              }
            },
          ],
        },
        Organizer_GameStart: {
          target: State.Playing,
          actions: [
            ({ context }) => {
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
        Organizer_Completed: {
          target: State.Leaderboard,
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
        },
        Organizer_Finished: {
          target: State.Final,
          actions: [
            ({ context }) => {
              context.wsOrganizer?.send(JSON.stringify({ type: "Finished" }));
              for (const [, player] of context.wsPlayersMap) {
                player.ws.send(JSON.stringify({ type: "Finished" }));
              }
            },
          ],
        },
        Player_AnswerPicked: {
          actions: [
            assign({
              wsPlayersMap: ({ context, event }) => {
                // If there is no player, we don't need to do anything
                const player = context.wsPlayersMap.get(event.playerID);
                if (!player) {
                  return context.wsPlayersMap;
                }

                // If the player is not the one who picked the answer, we don't
                // need to do anything
                if (player.ws !== event.wsPlayer) {
                  return context.wsPlayersMap;
                }

                // If the player already picked an answer, we also don't need to
                // do anything
                const answersPicked = player.answersPicked;
                if (answersPicked.has(event.questionID)) {
                  return context.wsPlayersMap;
                }

                // If the answer came at the wrong time, we also do nothing.
                const currentQuestion =
                  context.questionsAnswered[context.questionIndex];
                if (currentQuestion.id !== event.questionID) {
                  return context.wsPlayersMap;
                }

                // Otherwise, we update the player's answer and increase the
                // score if it was correct; we also need to notify the player
                // who answered, but optimistically update in this case doesn't
                // matter
                answersPicked.set(event.questionID, event.answerID);
                if (event.answerID === currentQuestion.answerCorrectID) {
                  // TODO: implement a better way to score the player
                  player.score += 100;
                  // Also notify everyone of the new score
                  const event = {
                    type: "SetPlayerScore",
                    id: player.id,
                    value: player.score,
                  };
                  const eventStr = JSON.stringify(event);
                  for (const [, player] of context.wsPlayersMap) {
                    player.ws.send(eventStr);
                  }
                  context.wsOrganizer?.send(eventStr);
                }

                const wsPlayersMap = new Map(context.wsPlayersMap);
                return wsPlayersMap;
              },
            }),
          ],
        },
      },
      after: {
        // currentQuestion: {
        //   actions: [
        //     assign({
        //       questionIndex: ({ context }) => context.questionIndex + 1,
        //     }),
        //     ({ context }) => {
        //       context.wsOrganizer?.send(JSON.stringify({ type: "Completed" }));
        //       for (const [, player] of context.wsPlayersMap) {
        //         player.ws.send(JSON.stringify({ type: "Completed" }));
        //       }
        //     },
        //   ],
        //   target: State.Leaderboard,
        // },
      },
    },
    [State.Leaderboard]: {
      on: {
        Organizer_Continue: {
          target: State.Playing,
          actions: [
            ({ context }) => {
              context.wsOrganizer?.send(JSON.stringify({ type: "Continue" }));
              for (const [, player] of context.wsPlayersMap) {
                player.ws.send(JSON.stringify({ type: "Continue" }));
              }
            },
          ],
        },
      },
    },
    [State.Final]: {
      on: {
        Organizer_Restart: {
          target: State.Initializing,
          actions: [
            ({ context }) => {
              context.wsOrganizer?.send(JSON.stringify({ type: "Restart" }));
              for (const [, player] of context.wsPlayersMap) {
                player.ws.send(JSON.stringify({ type: "Restart" }));
              }
            },
            assign({
              wsPlayersMap: new Map(),
              questionIndex: 0,
              questionsAnswered: [],
            }),
          ],
        },
      },
    },
    [State.Error_]: {},
  },
  on: {},
});
