<script lang="ts">
	import LabAssignmentDrawer from '#lib/components/lab-assignment-drawer.svelte';
	import * as Select from '#lib/components/ui/select';
	import { Tabs, TabsList, TabsTrigger } from '#lib/components/ui/tabs';
	import ThemeToggle from './theme-toggle.svelte';
	import { getVariantNumbers, labs } from '#lib/labs';

	const LAB_NUMBERS = [1, 2, 3, 4];

	let activeLab = $state('1');
	let variant = $state('8');

	const lab = $derived(labs.find((l) => String(l.number) === activeLab) ?? labs[0]);
	const variantNumbers = $derived(getVariantNumbers(lab));
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
		<div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:justify-start">
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
			<LabAssignmentDrawer lab={lab} variant={Number(variant)} />
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
</header>
