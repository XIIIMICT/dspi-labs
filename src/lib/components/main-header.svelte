<script lang="ts">
	import ModalOrDrawer from '#lib/components/modal-or-drawer.svelte';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import * as Select from '#lib/components/ui/select';
	import { Tabs, TabsList, TabsTrigger } from '#lib/components/ui/tabs';
	import ThemeToggle from './theme-toggle.svelte';
	import { getVariantInfo, getVariantNumbers, labs } from '#lib/labs';
	import { marked, Renderer } from 'marked';

	const LAB_NUMBERS = [1, 2, 3, 4];

	// Assignment Markdown ships with the repo and contains no HTML; escape any
	// raw HTML tokens so {@html} can never execute markup from the MD file.
	const assignmentRenderer = new Renderer();
	assignmentRenderer.html = ({ text }) =>
		text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	let activeLab = $state('1');
	let variant = $state('8');
	let assignmentOpen = $state(false);

	const lab = $derived(labs.find((l) => String(l.number) === activeLab) ?? labs[0]);
	const variantNumbers = $derived(getVariantNumbers(lab));
	const variantInfo = $derived(getVariantInfo(lab, Number(variant)));
	const assignmentHtml = $derived(marked.parse(lab.assignment, { renderer: assignmentRenderer }) as string);
</script>

<header class="sticky top-0 z-10 border-b border-foreground/10 bg-background">
	<div class="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 py-3 sm:px-6">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<h1 class="min-w-0 flex-1 text-xl font-semibold tracking-tight sm:text-2xl">
				<span class="sm:hidden">РСОИ</span>
				<span class="hidden sm:inline">Распределённые системы обработки информации</span>
			</h1>
			<ThemeToggle />
		</div>
		<div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
			<Button size="sm" onclick={() => (assignmentOpen = true)}>Задание</Button>
			<Tabs bind:value={activeLab}>
				<TabsList>
					{#each LAB_NUMBERS as labNumber (labNumber)}
						<TabsTrigger value={String(labNumber)} disabled={labNumber !== 1}>
							{#if activeLab === String(labNumber)}
								<span class="sm:hidden">ЛР {labNumber}</span>
								<span class="hidden sm:inline">Лабораторная работа {labNumber}</span>
							{:else}
								{labNumber}
							{/if}
						</TabsTrigger>
					{/each}
				</TabsList>
			</Tabs>
			<Select.Root type="single" bind:value={variant}>
				<Select.Trigger class="w-32">Вариант {variant}</Select.Trigger>
				<Select.Content>
					<Select.Group>
						{#each variantNumbers as n (n)}
							<Select.Item value={String(n)} label="Вариант {n}" />
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<ModalOrDrawer
		bind:open={assignmentOpen}
		title="Задание — Лабораторная работа {lab.number}"
		description={lab.title}
	>
		{#snippet badges()}
			<Badge variant="secondary">Вариант: {variant}</Badge>
			<Badge variant="secondary">Вид: {variantInfo?.вид ?? '—'}</Badge>
			<Badge variant="secondary">Язык: {variantInfo?.язык ?? '—'}</Badge>
		{/snippet}
		<!-- Assignment Markdown from the lab's assignment.md, rendered as sanitized HTML -->
		<div class="prose prose-sm dark:prose-invert max-w-none">
			{@html assignmentHtml}
		</div>
	</ModalOrDrawer>
</header>
