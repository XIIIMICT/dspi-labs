<script lang="ts">
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#lib/components/ui/collapsible';
	import { Label } from '#lib/components/ui/label';
	import { Input } from '#lib/components/ui/input';
	import * as Table from '#lib/components/ui/table';
	import { getVariantFields, getVariantInfo, labs } from '#lib/labs';
	import { shellStore } from '#lib/shell.svelte';
	import { MIN_WORDS_PER_TEXT, searchQualityStore as store } from './store.svelte';
	import { SAMPLE_SIZES } from './experiment';
	import ChartLineIcon from '@lucide/svelte/icons/chart-line';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import TargetIcon from '@lucide/svelte/icons/target';
	import UploadIcon from '@lucide/svelte/icons/upload';

	const lab = $derived(labs.find((l) => l.folder === 'search-quality') ?? labs[0]);
	const variantInfo = $derived(getVariantInfo(lab, shellStore.selectedVariant));
	const variantFields = $derived(getVariantFields(variantInfo));

	const shingleWidth = $derived(
		typeof variantInfo?.['Слов в шинглах'] === 'number'
			? (variantInfo['Слов в шинглах'] as number)
			: 8,
	);
	const hashAlgorithm = $derived(String(variantInfo?.['Алгоритм хэширования'] ?? 'SHA-1'));

	let relevantInput: HTMLInputElement | null = $state(null);
	let nonRelevantInput: HTMLInputElement | null = $state(null);
	/** Which file-input the next pick goes through (relevant or not). */
	let nextRelevant = $state(true);

	// --- SVG chart geometry (viewBox units) ---
	const CHART_W = 640;
	const CHART_H = 320;
	const PAD = 48;
	const chartPoints = $derived.by(() => {
		if (!store.result) return [];
		const xs = store.result.chart.map((p) => p.x);
		const minX = Math.min(...xs);
		const maxX = Math.max(...xs);
		const spanX = maxX - minX || 1;
		return store.result.chart.map((p) => ({
			...p,
			cx: PAD + ((p.x - minX) / spanX) * (CHART_W - 2 * PAD),
			cy: CHART_H - PAD - p.y * (CHART_H - 2 * PAD),
		}));
	});
	const polyPoints = $derived(chartPoints.map((p) => `${p.cx},${p.cy}`).join(' '));

	// Y-axis grid lines at 0, 0.25, 0.5, 0.75, 1.
	const gridLines = [0, 0.25, 0.5, 0.75, 1].map((v) => ({
		v,
		y: CHART_H - PAD - v * (CHART_H - 2 * PAD),
	}));

	function percent(value: number): string {
		return `${(value * 100).toFixed(1)}%`;
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex flex-wrap items-center gap-2">
			<TargetIcon class="size-5" />
			Оценка качества поиска
		</CardTitle>
		<CardDescription>
			Вариант {shellStore.selectedVariant}. Поиск по алгоритму ЛР 3 (шинглы по {shingleWidth} слов,
			хэширование {hashAlgorithm}): запрос сравнивается с документами по контрольным суммам.
			Коэффициенты вычисляются для выборок {SAMPLE_SIZES.join(', ')} документов.
		</CardDescription>
	</CardHeader>
	<CardContent class="flex flex-col gap-3">
		<div class="flex flex-wrap gap-2">
			<Badge variant="secondary">Вариант: {shellStore.selectedVariant}</Badge>
			{#each variantFields as [key, value] (key)}
				<Badge variant="secondary">{key}: {String(value)}</Badge>
			{/each}
		</div>

		<div class="flex flex-col gap-2 rounded-lg border p-3">
			<div class="flex flex-wrap items-center gap-2">
				<Label>Коллекция оценки ({store.documents.length} док.)</Label>
				<Button
					size="sm"
					onclick={() => {
						nextRelevant = true;
						relevantInput?.click();
					}}
					disabled={store.isProcessing}
				>
					<UploadIcon data-icon="inline-start" />
					Добавить релевантный
				</Button>
				<Button
					size="sm"
					variant="outline"
					onclick={() => {
						nextRelevant = false;
						nonRelevantInput?.click();
					}}
					disabled={store.isProcessing}
				>
					<UploadIcon data-icon="inline-start" />
					Добавить нерелевантный
				</Button>
				{#if store.documents.length > 0}
					<Button size="sm" variant="outline" onclick={() => store.reset()}>Сбросить</Button>
				{/if}
			</div>
			<input
				type="file"
				accept=".txt,text/plain"
				class="hidden"
				bind:this={relevantInput}
				onchange={(event) => {
					const input = event.currentTarget;
					const file = input.files?.[0];
					input.value = '';
					if (file) void store.addFile(file, nextRelevant);
				}}
			/>
			<input
				type="file"
				accept=".txt,text/plain"
				class="hidden"
				bind:this={nonRelevantInput}
				onchange={(event) => {
					const input = event.currentTarget;
					const file = input.files?.[0];
					input.value = '';
					if (file) void store.addFile(file, nextRelevant);
				}}
			/>
			<p class="text-muted-foreground text-sm">
				Первый документ — запрос (по умолчанию). Релевантность задаётся явно при добавлении и может
				быть изменена в списке — это основа истинности для расчёта a, b, c, d. Требуется запрос и
				не менее 9 кандидатов, каждый не менее {MIN_WORDS_PER_TEXT} английских слов.
			</p>

			{#if store.documents.length > 0}
				<div class="grid max-h-64 gap-2 overflow-y-auto">
					{#each store.documents as doc, index (index)}
						<div class="hover:bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg border p-2">
							<FileTextIcon class="text-muted-foreground size-4 shrink-0" />
							<span class="min-w-0 flex-1 truncate text-sm font-medium">{doc.name}</span>
							<Badge variant={doc.relevant ? 'default' : 'secondary'}>
								{doc.relevant ? 'релевантный' : 'нерелевантный'}
							</Badge>
							{#if index === 0}
								<Badge variant="outline">запрос</Badge>
							{:else}
								<Button size="sm" variant="ghost" onclick={() => store.makeQuery(index)}>
									Сделать запросом
								</Button>
							{/if}
							<Button
								size="sm"
								variant="outline"
								onclick={() => store.toggleRelevant(index)}
								disabled={index === 0}
							>
								{doc.relevant ? '→ нерелевантный' : '→ релевантный'}
							</Button>
							<Button size="sm" variant="outline" onclick={() => store.removeDocument(index)}>
								Убрать
							</Button>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex max-w-xs flex-col gap-2">
			<Label for="threshold-input">Порог схожести для выдачи, %</Label>
			<Input
				id="threshold-input"
				type="number"
				min={0}
				max={100}
				step={1}
				value={store.thresholdPercent}
				onchange={(event) => {
					const value = Number((event.currentTarget as HTMLInputElement).value);
					if (Number.isFinite(value)) store.thresholdPercent = Math.min(100, Math.max(0, value));
				}}
			/>
			<p class="text-muted-foreground text-sm">
				Документ считается выданным, если его схожесть с запросом не ниже порога.
			</p>
		</div>

		<Button
			onclick={() => void store.run(shingleWidth)}
			disabled={store.isProcessing || store.documents.length < 10}
		>
			<ChartLineIcon data-icon="inline-start" />
			Вычислить коэффициенты
		</Button>

		{#if store.errors.length > 0}
			<Alert variant="destructive">
				<CircleAlertIcon />
				<AlertTitle>Проверка ввода не пройдена</AlertTitle>
				<AlertDescription>
					<ul class="list-disc pl-4">
						{#each store.errors as error (error)}
							<li>{error}</li>
						{/each}
					</ul>
				</AlertDescription>
			</Alert>
		{/if}
	</CardContent>
</Card>

{#if store.result}
	{@const result = store.result}
	<Card>
		<CardHeader>
			<CardTitle>Таблица результатов</CardTitle>
			<CardDescription>
				Запрос: «{result.queryName}», порог выдачи {result.thresholdPercent}% схожести. Значения
				вычислены из количеств a, b, c, d по формулам: P = a/(a+b), R = a/(a+c), Fallout = b/(b+d),
				F1 = 2PR/(P+R).
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

	<Card>
		<CardHeader>
			<CardTitle>График F1-меры от количества документов</CardTitle>
			<CardDescription>Значения по оси Y — рассчитанная F1-мера каждой выборки.</CardDescription>
		</CardHeader>
		<CardContent>
			<svg
				viewBox="0 0 {CHART_W} {CHART_H}"
				class="h-auto w-full"
				role="img"
				aria-label="Линейный график зависимости F1-меры от количества документов"
			>
				<!-- grid + Y axis labels -->
				{#each gridLines as line (line.v)}
					<line
						x1={PAD}
						y1={line.y}
						x2={CHART_W - PAD}
						y2={line.y}
						class="stroke-border"
						stroke-dasharray="4 4"
					/>
					<text x={PAD - 8} y={line.y + 4} text-anchor="end" class="fill-muted-foreground text-[11px]">
						{line.v.toFixed(2)}
					</text>
				{/each}
				<!-- axes -->
				<line x1={PAD} y1={PAD - 16} x2={PAD} y2={CHART_H - PAD} class="stroke-foreground/40" />
				<line
					x1={PAD}
					y1={CHART_H - PAD}
					x2={CHART_W - PAD + 16}
					y2={CHART_H - PAD}
					class="stroke-foreground/40"
				/>
				<!-- axis titles -->
				<text
					x={(CHART_W - 2 * PAD) / 2 + PAD}
					y={CHART_H - 8}
					text-anchor="middle"
					class="fill-muted-foreground text-[12px]"
				>
					Количество документов
				</text>
				<text
					x={16}
					y={(CHART_H - 2 * PAD) / 2 + PAD}
					text-anchor="middle"
					transform="rotate(-90 16 {(CHART_H - 2 * PAD) / 2 + PAD})"
					class="fill-muted-foreground text-[12px]"
				>
					F1-мера
				</text>
				<!-- data polyline + points -->
				<polyline
					points={polyPoints}
					fill="none"
					stroke-width="2.5"
					class="stroke-primary"
					stroke-linejoin="round"
				/>
				{#each chartPoints as point (point.x)}
					<circle cx={point.cx} cy={point.cy} r="5" class="fill-primary" />
					<text x={point.cx} y={point.cy - 10} text-anchor="middle" class="fill-foreground text-[11px]">
						{point.x}
					</text>
					<text x={point.cx} y={point.cy + 20} text-anchor="middle" class="fill-muted-foreground text-[10px]">
						{(point.y * 100).toFixed(0)}%
					</text>
				{/each}
			</svg>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Состав выборок и метки релевантности</CardTitle>
			<CardDescription>
				Какие документы вошли в каждую выборку, их схожесть с запросом и решение системы.
			</CardDescription>
		</CardHeader>
		<CardContent class="flex flex-col gap-2">
			{#each result.samples as sample (sample.size)}
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
										<Table.Head>Релевантность (истина)</Table.Head>
										<Table.Head>Выдан системой</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each sample.documents as doc (doc.name)}
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

	<Card>
		<CardHeader>
			<CardTitle>Выводы</CardTitle>
			<CardDescription>Сформулированы по измеренным данным.</CardDescription>
		</CardHeader>
		<CardContent>
			<ol class="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
				{#each store.conclusions as line, index (index)}
					<li>{line}</li>
				{/each}
			</ol>
		</CardContent>
	</Card>
{/if}
