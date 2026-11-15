<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#lib/components/ui/collapsible';
	import { ScrollArea } from '#lib/components/ui/scroll-area';
	import * as Table from '#lib/components/ui/table';
	import { shinglesStore as store } from './store.svelte';
	import { HASH_FUNCTION_COUNT } from './shingles';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import HashIcon from '@lucide/svelte/icons/hash';
</script>

<Card>
	<CardHeader>
		<CardTitle>Промежуточные результаты</CardTitle>
		<CardDescription>
			Данные этапов алгоритма: канонические токены, шинглы и контрольные суммы каждого текста.
		</CardDescription>
	</CardHeader>
	<CardContent class="flex flex-col gap-3">
		{#each store.results as processed, index (index)}
			<Collapsible>
				<CollapsibleTrigger class="group flex w-full items-center gap-2 text-left text-sm font-medium">
					<ChevronRightIcon
						class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
					/>
					<ChevronDownIcon
						class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
					/>
					<HashIcon class="size-4" />
					{index + 1}. {processed.name} — {processed.sketch.tokens.length} токенов,
					{processed.sketch.shingles.length} шинглов
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div class="mt-2 flex flex-col gap-2">
						<details class="text-sm">
							<summary class="cursor-pointer font-medium">Канонические токены</summary>
							<ScrollArea class="bg-muted/30 mt-1 h-40 rounded-md border p-2">
								<pre class="text-xs whitespace-pre-wrap">{processed.sketch.tokens.join(' ')}</pre>
							</ScrollArea>
						</details>
						<details class="text-sm">
							<summary class="cursor-pointer font-medium">Шинглы (первые 20)</summary>
							<ScrollArea class="bg-muted/30 mt-1 h-40 rounded-md border p-2">
								<pre class="text-xs whitespace-pre-wrap">{processed.sketch.shingles
									.slice(0, 20)
									.map((s) => `Sh${s.index + 1} = ${s.words.join(' ')}`)
									.join('\n')}</pre>
							</ScrollArea>
						</details>
						<details class="text-sm">
							<summary class="cursor-pointer font-medium">
								Контрольные суммы ({HASH_FUNCTION_COUNT} функций)
							</summary>
							<ScrollArea class="bg-muted/30 mt-1 h-40 rounded-md border p-2">
								<pre class="text-xs whitespace-pre-wrap">{processed.sketch.controlSums
									.map((sum, fn) => `#${fn + 1}: ${sum}`)
									.join('\n')}</pre>
							</ScrollArea>
						</details>
					</div>
				</CollapsibleContent>
			</Collapsible>
		{/each}

		<Collapsible>
			<CollapsibleTrigger class="group flex w-full items-center gap-2 text-left text-sm font-medium">
				<ChevronRightIcon
					class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
				/>
				<ChevronDownIcon
					class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
				/>
				Совпавшие контрольные суммы по парам
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div class="mt-2 overflow-hidden rounded-lg border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Пара</Table.Head>
								<Table.Head>Номера совпавших функций</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each store.comparisons as comparison (comparison.a * 10 + comparison.b)}
								<Table.Row>
									<Table.Cell class="font-medium">
										{store.results[comparison.a]?.name} ↔ {store.results[comparison.b]?.name}
									</Table.Cell>
									<Table.Cell class="font-mono text-xs">
										{comparison.matchingFunctions.length > 0
											? comparison.matchingFunctions.map((fn) => fn + 1).join(', ')
											: '—'}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</CollapsibleContent>
		</Collapsible>
	</CardContent>
</Card>
