<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '#lib/components/ui/sonner';
	import MainFooter from '#lib/components/main-footer.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Лабораторные работы по РСОИ</title>
	<meta
		name="description"
		content="Лабораторные работы по курсу «Распределённые системы обработки информации»: инвертированный индекс, стемминг, алгоритм шинглов, оценка качества поиска"
	/>
</svelte:head>

<ModeWatcher />

<div class="flex min-h-svh flex-col bg-background text-foreground">
	<main class="flex flex-1 flex-col">
		{@render children()}
	</main>
	<MainFooter />
</div>

<Toaster richColors position="bottom-right" />
