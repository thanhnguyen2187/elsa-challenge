<script lang="ts">
import { createActor } from "xstate";
import { machine } from "./state";
import { wrap } from "$lib/xstate-wrapper.svelte";

const actor = wrap(createActor(machine));
const allowEnterName = $derived(actor.state.matches("Waiting"));
const isServerChecking = $derived(actor.state.matches("ServerChecking"));
const isWaiting = $derived(actor.state.matches("Waiting"));
const isPlaying = $derived(actor.state.matches("Playing"));
const isLeaderboard = $derived(actor.state.matches("Leaderboard"));
const isFinal = $derived(actor.state.matches("Final"))

const playerCurrent = $derived(actor.state.context.playerCurrent);
const playerCount = $derived(actor.state.context.playerCount);
const questions = $derived(actor.state.context.questions);
const questionIndex = $derived(actor.state.context.questionIndex);
const questionCurrent = $derived(questions[questionIndex]);
const elapsedMs = $derived(actor.state.context.elapsedMs);
const players = $derived(
  Array.from(actor.state.context.playersMap.values()).sort(
    (a, b) => b.score - a.score,
  ),
);

// setTimeout(() => {
//   actor.ref.send({ type: "ServerReady" });
//   actor.ref.send({ type: "SetDisplayName", value: "Player 1" });
// }, 1_000);
// setTimeout(() => {
//   actor.ref.send({ type: "SetPlayerCount", value: 2 });
// }, 1_500);
// setTimeout(() => {
//   actor.ref.send({ type: "SetPlayerCount", value: 4 });
// }, 3_500);
// setTimeout(() => {
//   actor.ref.send({ type: "GameStart" });
// }, 5_000);

setTimeout(() => {
  actor.ref.send({ type: "SetPlayerScore", id: "1", value: 10 });
  actor.ref.send({ type: "SetPlayerScore", id: "2", value: 15 });
  actor.ref.send({ type: "SetPlayerScore", id: "3", value: 10 });
}, 1_000);
setTimeout(() => {
  actor.ref.send({ type: "Completed" });
}, 2_000);

setTimeout(() => {
  actor.ref.send({ type: "Continue" });
}, 5_000);
setTimeout(() => {
  actor.ref.send({ type: "SetPlayerScore", id: "1", value: 19 });
  actor.ref.send({ type: "SetPlayerScore", id: "2", value: 24 });
  actor.ref.send({ type: "SetPlayerScore", id: "3", value: 20 });
}, 6_000);
setTimeout(() => {
  actor.ref.send({ type: "Completed" });
}, 7_000);

setTimeout(() => {
  actor.ref.send({ type: "Continue" });
}, 10_000);
setTimeout(() => {
  actor.ref.send({ type: "SetPlayerScore", id: "1", value: 29 });
  actor.ref.send({ type: "SetPlayerScore", id: "2", value: 24 });
  actor.ref.send({ type: "SetPlayerScore", id: "3", value: 20 });
}, 11_000);
setTimeout(() => {
  actor.ref.send({ type: "Completed" });
}, 12_000);
setTimeout(() => {
  actor.ref.send({ type: "Finish" });
}, 14_000);

function handleChangeDisplayName(event: Event) {
  if (!isWaiting) return;
  const target = event.target as HTMLInputElement;
  const value = target.value;
  actor.ref.send({ type: "SetDisplayName", value });
}
</script>

<div class="container mx-auto p-4 max-w-md h-[40em]">
  <div class="card bg-base-300 shadow-xl h-full">
    <div class="card-body justify-between items-center text-center">
      <h2 class="card-title text-2xl flex-col w-full">
        <span>
          {#if isServerChecking}
            Checking for Server
          {:else if isWaiting}
            Waiting for Host and Players
          {:else if isPlaying}
            Question {questionIndex + 1}/{questions.length}
          {:else if isLeaderboard}
            Leaderboard <br/>
          {:else if isFinal}
            Final Leaderboard
          {/if}
        </span>
        {#if isLeaderboard}
          <div class="badge">
            Question {questionIndex + 1}/{questions.length}
          </div>
        {:else if isFinal}
          <div class="badge invisible">
            Placeholder
          </div>
        {/if}
        {#if isPlaying}
          <progress
            class="progress progress-primary"
            value={elapsedMs}
            max={questionCurrent.timeMs}
          ></progress>
        {/if}
      </h2>

      {#if isServerChecking || isWaiting}
        <div
          class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"
        ></div>
        <div class="stats shadow">
          <div class="stat space-y-2">
            <div class="stat-title">Your display name</div>
            <div
              class="stat-value text-primary"
            >
              {playerCurrent.displayName}
            </div>
            <input
              class="input input-bordered input-primary max-w-xs"
              type="text"
              placeholder="Enter another name"
              disabled={!allowEnterName}
              onchange={handleChangeDisplayName}
            />
            <div
              class="stat-title"
              class:invisible={isServerChecking}
            >
              {playerCount} player(s) joined
            </div>
          </div>
        </div>
      {:else if isPlaying}
        <div class="prose h-[20em] w-full">
          <h3>{questionCurrent.title}</h3>
          <p>{questionCurrent.description ? questionCurrent.description : "[No description yet]"}</p>
        </div>
        <div class="grid grid-cols-2 gap-4 w-full">
          {#each questionCurrent.answers as answer}
            <button
              class="btn btn-outline"
            >
              {answer.text}
            </button>
          {/each}
        </div>
      {:else if isLeaderboard || isFinal}
        <div class="h-[20em]">
          <table class="table w-full">
            <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Score</th>
            </tr>
            </thead>
            <tbody>
            {#each players as player, index}
              <tr
                class="hover:bg-base-200"
                class:bg-base-100={player.id === playerCurrent.id}
              >
                <td>{index + 1}</td>
                <td>{player.displayName}</td>
                <td>{player.score}</td>
              </tr>
            {/each}
            </tbody>
          </table>
        </div>
        <div class="h-[7.5em]">
          {#if isFinal}
            The game has finished. You might want to ask the organizer to
            restart it.
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
