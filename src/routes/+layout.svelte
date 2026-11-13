<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '#lib/components/ui/sonner';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Инвертированный индекс и словарь</title>
	<meta
		name="description"
		content="Построение инвертированного индекса и словаря — веб-версия лабораторной работы №1 по курсу «Распределённые системы обработки информации»"
	/>
</svelte:head>

<ModeWatcher />

<main class="min-h-svh bg-background text-foreground">
	{@render children()}
</main>

<Toaster richColors position="bottom-right" />
