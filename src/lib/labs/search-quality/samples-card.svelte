<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#lib/components/ui/collapsible';
	import * as Table from '#lib/components/ui/table';
	import { searchQualityStore as store } from './store.svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
</script>

{#if store.result}
	<Card>
		<CardHeader>
			<CardTitle>Состав выборок и метки релевантности</CardTitle>
			<CardDescription>
				Какие документы вошли в каждую выборку, их схожесть с запросом и решение системы.
			</CardDescription>
		</CardHeader>
		<CardContent class="flex flex-col gap-2">
			{#each store.result.samples as sample (sample.size)}
				<Collapsible>
					<CollapsibleTrigger class="group flex w-full items-center gap-2 text-left text-sm font-medium">
						<ChevronRightIcon
							class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
						/>
						<ChevronDownIcon
							class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
						/>
						Выборка из {sample.size} документов
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div class="mt-2 overflow-hidden rounded-lg border">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Документ</Table.Head>
										<Table.Head>Схожесть</Table.Head>
										<Table.Head>Релевантность (эталонная разметка)</Table.Head>
										<Table.Head>Выдан системой</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each sample.documents as doc (doc.id)}
										<Table.Row>
											<Table.Cell class="font-medium">{doc.name}</Table.Cell>
											<Table.Cell>{doc.similarityPercent}%</Table.Cell>
											<Table.Cell>{doc.relevant ? 'релевантный' : 'нерелевантный'}</Table.Cell>
											<Table.Cell>{doc.retrieved ? 'выдан' : 'не выдан'}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					</CollapsibleContent>
				</Collapsible>
			{/each}
		</CardContent>
	</Card>
{/if}
