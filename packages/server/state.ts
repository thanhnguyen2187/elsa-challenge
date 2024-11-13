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
}

export namespace State {
  export const Initializing = "Initializing";
  export const Waiting = "Waiting";

  export type Type = typeof Initializing | typeof Waiting;

  export function generate(states: Type[]): string {
    return `#${Constant.MachineID}.${states.join(".")}`;
  }
}

export namespace Context {
  export type Type = {
    quizzID: string;
    wsOrganizer: uWS.WebSocket<unknown>;
    wsPlayersMap: Map<string, PlayerConnected>;
    questionsAnswered: QuestionAnswered[];
  };

  export type Input = {
    quizzID: string;
    wsOrganizer: uWS.WebSocket<unknown>;
  };

  export function create({ input }: { input: Input }): Type {
    return {
      wsPlayersMap: new Map(),
      questionsAnswered: [],
      ...input,
    };
  }
}

export namespace Event {
  export type Organizer_ServerChecking = {
    type: "Organizer_ServerChecking";
  };

  export type Player_ServerChecking = {
    type: "Player_ServerChecking";
    playerID: string;
    wsPlayer: uWS.WebSocket<unknown>;
  };

  export type All = Organizer_ServerChecking | Player_ServerChecking;
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
            ({ context, event }) => {
              const questionsAnswered = event.output;
              context.wsOrganizer.send(
                JSON.stringify({
                  type: "ServerReady",
                  questions: questionsAnswered.map(stripQuestionAnswered),
                }),
              );
            },
          ],
        },
      },
    },
    [State.Waiting]: {
      on: {
        Player_ServerChecking: {
          actions: [
            assign({
              wsPlayersMap: ({ context, event }) => {
                const wsPlayersMap = context.wsPlayersMap;
                const displayName = `Player ${wsPlayersMap.size}`;
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
            },
          ],
        },
      },
    },
  },
  on: {},
});
