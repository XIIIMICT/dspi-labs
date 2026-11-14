<script lang="ts">
	import MainHeader from '#lib/components/main-header.svelte';
	import { getLabView } from '#lib/labs/lab-views';
	import { shellStore } from '#lib/shell.svelte';
	import { labs } from '#lib/labs';

	// Registry-driven dispatch: the active lab renders its own registered view;
	// labs without a registered view show the placeholder.
	const activeLab = $derived(labs.find((l) => String(l.number) === shellStore.activeLab) ?? labs[0]);
	const ActiveLabView = $derived(getLabView(activeLab.folder));
</script>

<MainHeader />

{#if ActiveLabView}
	<div class="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
		<ActiveLabView />
	</div>
{:else}
	<p
		class="text-muted-foreground flex flex-1 items-center justify-center px-4 text-center text-lg"
	>
		Эта лабораторная работа ещё не реализована
	</p>
{/if}
