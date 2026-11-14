<script lang="ts">
	import ModalOrDrawer from '#lib/components/modal-or-drawer.svelte';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import * as Select from '#lib/components/ui/select';
	import { Tabs, TabsList, TabsTrigger } from '#lib/components/ui/tabs';
	import ThemeToggle from './theme-toggle.svelte';
	import { shellStore } from '#lib/shell.svelte';
	import { getVariantFields, getVariantInfo, getVariantNumbers, labs } from '#lib/labs';

	let variant = $state('8');
	let assignmentOpen = $state(false);

	const lab = $derived(labs.find((l) => String(l.number) === shellStore.activeLab) ?? labs[0]);
	const variantNumbers = $derived(getVariantNumbers(lab));
	const variantInfo = $derived(getVariantInfo(lab, Number(variant)));
	const variantFields = $derived(getVariantFields(variantInfo));

	// Keep the selected variant valid when switching to a lab with a different set.
	$effect(() => {
		if (variantNumbers.length > 0 && !variantNumbers.includes(Number(variant))) {
			variant = String(variantNumbers[0]);
		}
	});
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
			<Tabs bind:value={shellStore.activeLab}>
				<TabsList>
					{#each labs as item (item.number)}
						<TabsTrigger value={String(item.number)}>
							{#if shellStore.activeLab === String(item.number)}
								<span class="sm:hidden">ЛР {item.number}</span>
								<span class="hidden sm:inline">Лабораторная работа {item.number}</span>
							{:else}
								{item.number}
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
			{#each variantFields as [key, value] (key)}
				<Badge variant="secondary">{key}: {String(value)}</Badge>
			{/each}
		{/snippet}
		<p class="text-sm leading-relaxed whitespace-pre-wrap">{lab.task}</p>
	</ModalOrDrawer>
</header>
