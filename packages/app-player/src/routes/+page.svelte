<script lang="ts">
import { createActor } from "xstate";
import { machine } from "./state";
import { wrap } from "$lib/xstate-wrapper.svelte";

const actor = wrap(createActor(machine));
const allowEnterName = $derived(actor.state.value.match("Waiting"));
const isServerChecking = $derived(actor.state.value.match("ServerChecking"));
const isWaiting = $derived(actor.state.value.match("Waiting"));
const isPlaying = $derived(actor.state.value.match("Playing"));
const displayName = $derived(actor.state.context.displayName);
const playerCount = $derived(actor.state.context.playerCount);

setTimeout(() => {
  actor.ref.send({ type: "ServerReady" });
  actor.ref.send({ type: "SetDisplayName", value: "Player 1" });
}, 3_000);

setTimeout(() => {
  actor.ref.send({ type: "SetPlayerCount", value: 2 });
}, 5_000);

setTimeout(() => {
  actor.ref.send({ type: "SetPlayerCount", value: 4 });
}, 7_000);

setTimeout(() => {
  actor.ref.send({ type: "GameStart" });
}, 10_000);

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
      <h2 class="card-title text-2xl">
        {#if isServerChecking}
          Checking for Server
        {:else if isWaiting}
          Waiting for Host and Players
        {:else if isPlaying}
          Let's play!
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
              {displayName}
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
      {/if}
    </div>
  </div>
</div>
