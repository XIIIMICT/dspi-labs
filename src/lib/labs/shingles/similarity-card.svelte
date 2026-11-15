<script lang="ts">
	import { Badge } from '#lib/components/ui/badge';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import * as Table from '#lib/components/ui/table';
	import { REQUIRED_TEXTS, shinglesStore as store } from './store.svelte';
	import { HASH_FUNCTION_COUNT } from './shingles';
</script>

<Card>
	<CardHeader>
		<CardTitle>Процент схожести текстов</CardTitle>
		<CardDescription>
			Все пары из {REQUIRED_TEXTS} текстов ({store.comparisons.length}); совпавшие контрольные
			суммы из {HASH_FUNCTION_COUNT}.
		</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="overflow-hidden rounded-lg border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Пара</Table.Head>
						<Table.Head>Совпало сумм</Table.Head>
						<Table.Head>Схожесть</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each store.comparisons as comparison (comparison.a * 10 + comparison.b)}
						<Table.Row>
							<Table.Cell class="font-medium">
								{store.results[comparison.a]?.name} ↔ {store.results[comparison.b]?.name}
							</Table.Cell>
							<Table.Cell>{comparison.matches} / {HASH_FUNCTION_COUNT}</Table.Cell>
							<Table.Cell>
								<Badge
									variant={comparison.similarityPercent >= 50 ? 'default' : 'secondary'}
								>
									{comparison.similarityPercent}%
								</Badge>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</CardContent>
</Card>
