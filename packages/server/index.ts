import uWS from "uWebSockets.js";
import { type ActorRefFrom, createActor } from "xstate";
import { machine as quizzMachine } from "./state";

const actorsMap = new Map<string, ActorRefFrom<typeof quizzMachine>>();

export function getOrCreateActor(quizzID: string, actorsMap: Map<string, ActorRefFrom<typeof quizzMachine>>) {
  let actor = actorsMap.get(quizzID);
  if (!actor) {
    actor = createActor(quizzMachine, {
      input: {
        quizzID,
      },
    });
    actor.start();
    actorsMap.set(quizzID, actor);
  }
  return actor;
}

uWS
  .App()
  .ws("/quizz", {
    open: (ws) => {},
    message: (ws, message, isBinary) => {
      const messageTyped = JSON.parse(Buffer.from(message).toString());
      messageTyped.wsPlayer = ws;
      const actor = getOrCreateActor(messageTyped.quizzID, actorsMap);
      actor.send(messageTyped);
    },
    close: (ws, code) => {},
  })
  .ws("/quizz/organizer", {
    open: (ws) => {},
    message: (ws, message, isBinary) => {
      // TODO: validate message
      const messageTyped = JSON.parse(Buffer.from(message).toString());
      const quizzID = messageTyped.quizzID;
      messageTyped.wsOrganizer = ws;
      const actor = getOrCreateActor(quizzID, actorsMap);
      actor.send(messageTyped);
    },
    close: (ws, code) => {},
  })
  .listen(8080, () => {});
