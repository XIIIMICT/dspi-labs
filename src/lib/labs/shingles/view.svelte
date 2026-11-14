<script lang="ts">
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#lib/components/ui/collapsible';
	import { ScrollArea } from '#lib/components/ui/scroll-area';
	import * as Table from '#lib/components/ui/table';
	import { getVariantFields, getVariantInfo, labs } from '#lib/labs';
	import { shellStore } from '#lib/shell.svelte';
	import { MIN_WORDS_PER_TEXT, REQUIRED_TEXTS, shinglesStore as store } from './store.svelte';
	import { HASH_FUNCTION_COUNT } from './shingles';
	import BookTextIcon from '@lucide/svelte/icons/book-text';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import GitCompareIcon from '@lucide/svelte/icons/git-compare';
	import HashIcon from '@lucide/svelte/icons/hash';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import UploadIcon from '@lucide/svelte/icons/upload';

	const lab = $derived(labs.find((l) => l.folder === 'shingles') ?? labs[0]);
	const variantInfo = $derived(getVariantInfo(lab, shellStore.selectedVariant));
	const variantFields = $derived(getVariantFields(variantInfo));

	// Shingle width comes from the registry variant field, never hard-coded.
	const shingleWidth = $derived(
		typeof variantInfo?.['Слов в шинглах'] === 'number'
			? (variantInfo['Слов в шинглах'] as number)
			: 8,
	);
	const hashAlgorithm = $derived(String(variantInfo?.['Алгоритм хэширования'] ?? 'SHA-1'));

	let fileInput: HTMLInputElement | null = $state(null);
	let viewIndex = $state(0);
	const selectedText = $derived(store.results[viewIndex] ?? null);
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex flex-wrap items-center gap-2">
			<GitCompareIcon class="size-5" />
			Сравнение текстов с помощью алгоритма шинглов
		</CardTitle>
		<CardDescription>
			Вариант {shellStore.selectedVariant}. Требуется ровно {REQUIRED_TEXTS} текста по
			{MIN_WORDS_PER_TEXT}+ латинских токенов (язык по варианту — английский): канонизация
			(стоп-слова, знаки, теги, приведение известных форм множественного числа
			существительных к единственному числу) → шинглы по {shingleWidth} слов →
			{HASH_FUNCTION_COUNT} хэш-функций {hashAlgorithm} → минимальные контрольные суммы →
			сравнение.
		</CardDescription>
	</CardHeader>
	<CardContent class="flex flex-col gap-3">
		<div class="flex flex-wrap gap-2">
			<Badge variant="secondary">Вариант: {shellStore.selectedVariant}</Badge>
			{#each variantFields as [key, value] (key)}
				<Badge variant="secondary">{key}: {String(value)}</Badge>
			{/each}
		</div>

		<div class="flex flex-wrap gap-2">
			<Button
				onclick={() => fileInput?.click()}
				disabled={store.isProcessing || store.candidates.length >= REQUIRED_TEXTS}
			>
				<UploadIcon data-icon="inline-start" />
				Добавить файлы
			</Button>
			{#if store.candidates.length > 0 || store.results.length > 0}
				<Button variant="outline" onclick={() => store.reset()} disabled={store.isProcessing}>
					Сбросить
				</Button>
			{/if}
			<Button
				onclick={() => void store.run(shingleWidth)}
				disabled={store.isProcessing || store.candidates.length !== REQUIRED_TEXTS}
			>
				<GitCompareIcon data-icon="inline-start" />
				Сравнить тексты
			</Button>
		</div>
		<input
			type="file"
			accept=".txt,text/plain"
			multiple
			class="hidden"
			bind:this={fileInput}
			onchange={(event) => {
				const input = event.currentTarget;
				const files = Array.from(input.files ?? []);
				input.value = '';
				if (files.length > 0) void store.addFiles(files);
			}}
		/>

		{#if store.lab1Documents.length > 0}
			<Collapsible>
				<CollapsibleTrigger class="group flex w-full items-center gap-2 text-left text-sm font-medium">
					<ChevronRightIcon
						class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
					/>
					<ChevronDownIcon
						class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
					/>
					<LibraryIcon class="size-4" />
					Выбрать документ из коллекции ЛР 1 ({store.lab1Documents.length})
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div class="mt-2 grid max-h-48 gap-2 overflow-y-auto">
						{#each store.lab1Documents as doc (doc.id)}
							<div class="hover:bg-muted/50 flex items-center gap-2 rounded-lg border p-2">
								<FileTextIcon class="text-muted-foreground size-4 shrink-0" />
								<span class="min-w-0 flex-1 truncate text-sm">{doc.name}</span>
								<Button size="sm" variant="outline" onclick={() => store.addLab1Document(doc.id)}>
									Добавить
								</Button>
							</div>
						{/each}
					</div>
				</CollapsibleContent>
			</Collapsible>
		{:else}
			<p class="text-muted-foreground text-sm">
				Тексты можно выбрать из коллекции ЛР 1 или импортировать из файлов (оба способа указаны в
				задании). В методичке для одного номера варианта 2/8/14 ЛР 1 задан русский язык, а ЛР 3 —
				английский: демо-коллекция ЛР 1 не подходит без замены языка, поэтому загрузите английские
				файлы напрямую. Канонизация — детерминированная офлайн-обработка: стоп-слова, пунктуация,
				теги и цифры удаляются, известные формы множественного числа существительных
				приводятся к единственному (это не полная морфологическая лемматизация с
				определением части речи). Проверка «1000+ слов» считает токены из латиницы, а не
				определяет язык: соответствие текста английскому по варианту остаётся за
				пользователем. Конструкция 84 хэш-функций (SHA-1 с 84 разными солями) — выбор
				реализации: методичка задаёт только количество функций и правило минимума по каждой
				строке.
			</p>
		{/if}

		{#if store.candidates.length > 0}
			<div class="grid gap-2">
				<p class="text-sm font-medium">Выбранные тексты ({store.candidates.length}/{REQUIRED_TEXTS}):</p>
				{#each store.candidates as candidate, index (index)}
					<div class="hover:bg-muted/50 flex items-center gap-2 rounded-lg border p-3">
						<FileTextIcon class="text-muted-foreground size-4 shrink-0" />
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-medium">{candidate.name}</span>
							<span class="text-muted-foreground block text-xs">
								{candidate.wordCount} слов · {candidate.origin === 'file' ? 'файл' : 'ЛР 1'}
							</span>
						</span>
						<Button
							size="sm"
							variant="outline"
							onclick={() => store.removeCandidate(index)}
							disabled={store.isProcessing}
						>
							Убрать
						</Button>
					</div>
				{/each}
			</div>
		{/if}

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

{#if store.comparisons.length > 0}
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

	<Card>
		<CardHeader>
			<CardTitle>Исходные тексты</CardTitle>
			<CardDescription>Тексты сохранены в исходном виде — без изменения при обработке.</CardDescription>
		</CardHeader>
		<CardContent class="flex flex-col gap-3">
			<div class="flex flex-wrap gap-2">
				{#each store.results as processed, index (index)}
					<Button
						size="sm"
						variant={viewIndex === index ? 'default' : 'outline'}
						onclick={() => (viewIndex = index)}
					>
						{index + 1}. {processed.name}
					</Button>
				{/each}
			</div>
			{#if selectedText}
				<ScrollArea class="bg-muted/30 h-72 rounded-md border p-3">
					<pre class="text-sm leading-relaxed whitespace-pre-wrap">{selectedText.text}</pre>
				</ScrollArea>
			{/if}
		</CardContent>
	</Card>

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
{/if}
