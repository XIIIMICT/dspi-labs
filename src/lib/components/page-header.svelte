<script lang="ts">
	import { Button } from '#lib/components/ui/button';
	import ThemeToggle from './theme-toggle.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { goBack } from '#lib/labs/lab-1/navigation';

	let {
		title,
		subtitle = '',
		backHref = '',
	}: { title: string; subtitle?: string; backHref?: string } = $props();
</script>

<header class="flex flex-wrap items-center gap-x-3 gap-y-2">
	{#if backHref}
		<Button variant="outline" size="sm" onclick={() => goBack(backHref)}>
			<ArrowLeftIcon data-icon="inline-start" />
			Назад
		</Button>
	{/if}
	<div class="min-w-0 flex-1">
		<h1 class="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
		{#if subtitle}
			<p class="text-muted-foreground text-sm">{subtitle}</p>
		{/if}
	</div>
	<ThemeToggle />
</header>
