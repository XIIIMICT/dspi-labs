<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import * as Table from '#lib/components/ui/table';
	import { searchQualityStore as store } from './store.svelte';

	function percent(value: number): string {
		return `${(value * 100).toFixed(1)}%`;
	}

	const result = $derived(store.result);
</script>

{#if result}
	<Card>
		<CardHeader>
			<CardTitle>Таблица результатов</CardTitle>
			<CardDescription>
				Запрос: «{result.queryName}» (в выдачу не входит), порог выдачи {result.thresholdPercent}%
				схожести. Значения вычислены из количеств a, b, c, d по формулам: P = a/(a+b), R =
				a/(a+c), Fallout = b/(b+d), F1 = 2PR/(P+R), где a — выданные релевантные, b — выданные
				нерелевантные, c — не выданные релевантные, d — не выданные нерелевантные (по таблице
				методички; в её текстовом описании d ошибочно повторяет c). При нулевом знаменателе
				доля принимается равной 0 — соглашение приложения, методичка его не задаёт.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="overflow-x-auto rounded-lg border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Документов</Table.Head>
							<Table.Head>a</Table.Head>
							<Table.Head>b</Table.Head>
							<Table.Head>c</Table.Head>
							<Table.Head>d</Table.Head>
							<Table.Head>Точность P</Table.Head>
							<Table.Head>Полнота R</Table.Head>
							<Table.Head>Выпадение</Table.Head>
							<Table.Head>F1-мера</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each result.samples as sample (sample.size)}
							<Table.Row>
								<Table.Cell class="font-medium">{sample.size}</Table.Cell>
								<Table.Cell>{sample.counts.retrievedRelevant}</Table.Cell>
								<Table.Cell>{sample.counts.retrievedNonRelevant}</Table.Cell>
								<Table.Cell>{sample.counts.missedRelevant}</Table.Cell>
								<Table.Cell>{sample.counts.missedNonRelevant}</Table.Cell>
								<Table.Cell>{percent(sample.metrics.precision)}</Table.Cell>
								<Table.Cell>{percent(sample.metrics.recall)}</Table.Cell>
								<Table.Cell>{percent(sample.metrics.fallout)}</Table.Cell>
								<Table.Cell class="font-medium">{percent(sample.metrics.f1)}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</CardContent>
	</Card>
{/if}
