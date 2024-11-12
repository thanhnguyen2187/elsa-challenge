<script lang="ts">
import { machine, Guard } from "./state";
import { createActor } from "xstate";
import { wrap } from "shared/xstate-wrapper.svelte";

const actor = wrap(createActor(machine));
const context = $derived(actor.state.context);

const isServerChecking = $derived(actor.state.matches("ServerChecking"));
const isWaiting = $derived(actor.state.matches("Waiting"));
const isPlaying = $derived(actor.state.matches("Playing"));
const isLeaderboard = $derived(actor.state.matches("Leaderboard"));
const isFinal = $derived(actor.state.matches("Final"));
const elapsedMs = $derived(actor.state.context.elapsedMs);

const players = $derived(Array.from(actor.state.context.playersMap.values()));
const questions = $derived(actor.state.context.questions);
const questionIndex = $derived(actor.state.context.questionIndex);
const questionCurrent = $derived(questions[questionIndex]);

setTimeout(() => {
  actor.ref.send({ type: "ServerReady" });
}, 2_000);
setTimeout(() => {
  actor.ref.send({
    type: "PlayerJoined",
    player: { id: "1", displayName: "Player 1", score: 0 },
  });
}, 3_000);
setTimeout(() => {
  actor.ref.send({
    type: "PlayerJoined",
    player: { id: "2", displayName: "Player 2", score: 0 },
  });
}, 3_500);
setTimeout(() => {
  actor.ref.send({
    type: "PlayerJoined",
    player: { id: "3", displayName: "Player 3", score: 0 },
  });
}, 4_000);
setTimeout(() => {
  actor.ref.send({
    type: "PlayerJoined",
    player: { id: "4", displayName: "Player 4", score: 0 },
  });
}, 4_000);

function handleStart() {
  if (!isWaiting) return;
  actor.ref.send({ type: "GameStart" });
}

function handleFinish() {
  if (!isPlaying) return;
  actor.ref.send({ type: "Finish" });
}

function handleContinue() {
  if (!isLeaderboard) return;
  actor.ref.send({ type: "Continue" });
}

function handleRestart() {
  if (!isLeaderboard) return;
  actor.ref.send({ type: "Restart" });
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
            Waiting for Players...
          {:else if isPlaying}
            Question {questionIndex + 1}/{questions.length}
          {:else if isLeaderboard}
            Leaderboard <br/>
          {:else if isFinal}
            Final Leaderboard
          {/if}
        </span>
        {#if isPlaying}
          <progress
            class="progress progress-primary"
            value={elapsedMs}
            max={questionCurrent.timeMs}
          ></progress>
        {:else if isLeaderboard}
          <div class="badge">
            Question {questionIndex + 1}/{questions.length}
          </div>
        {/if}
      </h2>
      {#if isServerChecking}
        <div
          class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"
        ></div>
        <div class="h-[7em]"></div>
      {:else if isWaiting}
        <div class="prose h-80">
          <p>List of players:</p>
          {#if players.length === 0}
            <p>[No players yet.]</p>
          {:else}
            <ul class="text-left">
              {#each players as player}
                <li>{player.displayName} (ID: {player.id})</li>
              {/each}
            </ul>
          {/if}
        </div>
        <div class="h-[7em]">
          <button
            class="btn btn-primary"
            onclick={handleStart}
          >Start</button>
        </div>
      {:else if isPlaying}
        <div class="prose h-[20em] w-full">
          <h3>{questionCurrent.title}</h3>
          <p>{questionCurrent.description ? questionCurrent.description : "[No description yet]"}</p>
        </div>
        <div class="h-[7em]">
          <button
            class="btn btn-primary"
            onclick={handleFinish}
          >
            Finish
          </button>
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
              >
                <td>{index + 1}</td>
                <td>{player.displayName}</td>
                <td>{player.score}</td>
              </tr>
            {/each}
            </tbody>
          </table>
        </div>
        <div class="h-[7em]">

          {#if Guard.allowContinue({ context })}
            <button
              class="btn btn-primary"
              onclick={handleContinue}
            >
              Continue
            </button>
          {:else}
            <button
              class="btn btn-primary mt-2"
              onclick={handleRestart}
            >
              Restart
            </button>
          {/if}
        </div>
      {/if}

    </div>
  </div>
</div>
