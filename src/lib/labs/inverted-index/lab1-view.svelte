<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#lib/components/ui/collapsible';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import { ScrollArea } from '#lib/components/ui/scroll-area';
	import { Separator } from '#lib/components/ui/separator';
	import ModalOrDrawer from '#lib/components/modal-or-drawer.svelte';
	import { getVariantFields, getVariantInfo, labs } from '#lib/labs';
	import { shellStore } from '#lib/shell.svelte';
	import { appStore as app } from './store.svelte';
	import type { Document } from './models';
	import { findWords, removeStopWords, tokenizeAndNormalize } from './text-processing';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import InfoIcon from '@lucide/svelte/icons/info';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import UploadIcon from '@lucide/svelte/icons/upload';

	const hasIndex = $derived(app.dictionary.size > 0);
	const lab = $derived(labs.find((l) => l.folder === 'inverted-index') ?? labs[0]);
	const variantInfo = $derived(getVariantInfo(lab, shellStore.selectedVariant));
	const variantFields = $derived(getVariantFields(variantInfo));
	const totalTokens = $derived.by(() => {
		let sum = 0;
		for (const info of app.dictionary.values()) sum += info.collectionFrequency;
		return sum;
	});
	const logLines = $derived(app.logs.slice(-200));
	const stemDocIds = $derived(
		new Set(
			app.searchStem
				? (app.dictionary.get(app.searchStem)?.postings ?? []).map((p) => p.docId)
				: [],
		),
	);

	let fileInput: HTMLInputElement | null = $state(null);
	let dragOver = $state(false);

	/** Document shown in the viewer modal/drawer. */
	let viewDoc = $state<Document | null>(null);
	let viewOpen = $state(false);
	// A const mirror keeps narrowing stable in $derived and in the template.
	const shownDoc = $derived(viewDoc);
	const docWordCount = $derived(shownDoc ? findWords(shownDoc.rawText).length : 0);

	/** Per-document algorithm stages, computed once for the open document. */
	const sourceLexemes = $derived(shownDoc ? findWords(shownDoc.rawText).map((w) => w.word) : []);
	const normalizedLexemes = $derived(
		shownDoc ? removeStopWords(tokenizeAndNormalize(shownDoc.rawText)) : [],
	);
	const docPostings = $derived(
		shownDoc
			? [...app.dictionary.entries()].filter(([, info]) =>
					info.postings.some((p) => p.docId === shownDoc.id),
				)
			: [],
	);
	/** Preview limits keep the modal responsive; "show full" removes them. */
	const PREVIEW_LIMITS = { lexemes: 200, normalized: 400, postings: 30 } as const;
	let showFullStages = $state(false);

	function onFilePick(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		if (files.length > 0) void app.loadFromFiles(files);
	}

	function onDrop(event: DragEvent): void {
		event.preventDefault();
		dragOver = false;
		const files = Array.from(event.dataTransfer?.files ?? []);
		if (files.length > 0) void app.loadFromFiles(files);
	}

	function openSearchInDoc(docId: number): void {
		goto(resolve('/search/[docId]/[query]', {
			docId: String(docId),
			query: encodeURIComponent(app.searchQuery.trim()),
		}));
	}
</script>

<div class="flex flex-col gap-4">
	<Card>
		<CardHeader>
			<CardTitle>Документы</CardTitle>
			<CardDescription>
				Выберите текстовые файлы — токенизация, стемминг и построение индекса выполняются
				полностью в браузере.
			</CardDescription>
		</CardHeader>
		<CardContent class="flex flex-col gap-3">
			<div class="flex flex-wrap gap-2">
				<Badge variant="secondary">Вариант: {shellStore.selectedVariant}</Badge>
				{#each variantFields as [key, value] (key)}
					<Badge variant="secondary">{key}: {String(value)}</Badge>
				{/each}
			</div>
			{#if app.errors.length > 0}
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>Коллекция не соответствует заданию</AlertTitle>
					<AlertDescription>
						<ul class="list-disc pl-4">
							{#each app.errors as error (error)}
								<li>{error}</li>
							{/each}
						</ul>
					</AlertDescription>
				</Alert>
			{/if}
			<div class="flex flex-wrap gap-2">
				<Button onclick={() => fileInput?.click()} disabled={app.isProcessing}>
					{#if app.isProcessing}
						<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
					{:else}
						<UploadIcon data-icon="inline-start" />
					{/if}
					Выбрать файлы
				</Button>
				<Button
					variant="secondary"
					onclick={() => void app.loadDemoCollection()}
					disabled={app.isProcessing}
				>
					<SparklesIcon data-icon="inline-start" />
					Демо-тексты (100 документов)
				</Button>
				{#if app.documents.length > 0}
					<Button variant="outline" onclick={() => app.reset()} disabled={app.isProcessing}>
						<RotateCcwIcon data-icon="inline-start" />
						Сбросить
					</Button>
				{/if}
			</div>

			<input
				type="file"
				accept=".txt,text/plain"
				multiple
				class="hidden"
				bind:this={fileInput}
				onchange={onFilePick}
			/>

			<button
				type="button"
				class="border-border/80 text-muted-foreground hover:bg-muted/50 focus-visible:ring-ring/50 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
				class:bg-muted={dragOver}
				aria-label="Выбрать или перетащить текстовые файлы"
				onclick={() => fileInput?.click()}
				ondragover={(event) => {
					event.preventDefault();
					dragOver = true;
				}}
				ondragleave={() => (dragOver = false)}
				ondrop={onDrop}
			>
				Перетащите текстовые файлы сюда
			</button>

			{#if app.documents.length > 0 || hasIndex}
				<div class="flex flex-wrap gap-2">
					<Badge variant="secondary">Документов: {app.documents.length}</Badge>
					<Badge variant="secondary">Терминов: {app.dictionary.size}</Badge>
					<Badge variant="secondary">Токенов в индексе: {totalTokens}</Badge>
				</div>
			{/if}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Поиск слова</CardTitle>
			<CardDescription>
				Введите слово — стемминг приведёт его к базовой форме, и вы увидите все формы
				слова, встречающиеся в документах.
			</CardDescription>
		</CardHeader>
		<CardContent class="flex flex-col gap-4">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-end">
				<div class="flex flex-1 flex-col gap-1.5">
					<Label for="search-query">Введите слово для поиска</Label>
					<Input
						id="search-query"
						placeholder="например: документы, индекс, система…"
						bind:value={app.searchQuery}
						onkeydown={(event) => {
							if (event.key === 'Enter') app.showWordForms();
						}}
					/>
				</div>
				<Button
					onclick={() => app.showWordForms()}
					disabled={app.documents.length === 0 || app.isProcessing}
				>
					<SearchIcon data-icon="inline-start" />
					Показать формы слова
				</Button>
			</div>

			{#if app.foundForms.length > 0}
				<div class="flex flex-col gap-1.5">
					<p class="text-sm font-medium">
						Формы слова «{app.searchQuery.trim()}» (стем: {app.searchStem}):
					</p>
					<div class="flex flex-wrap gap-1.5">
						{#each app.foundForms as form (form)}
							<Badge>{form}</Badge>
						{/each}
					</div>
				</div>
			{/if}

			{#if app.documents.length > 0}
				<Separator />
				<div class="flex flex-col gap-2">
					<p class="text-sm font-medium">
						{#if app.foundForms.length > 0}
							Документы:
						{:else}
							Документы ({app.documents.length})
						{/if}
					</p>
					<div class="grid gap-2">
						{#each app.documents as doc (doc.id)}
							<div
								class="hover:bg-muted/50 flex items-center gap-2 rounded-lg border p-3 transition-colors"
							>
								<button
									type="button"
									class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
									onclick={() => {
										viewDoc = doc;
										showFullStages = false;
										viewOpen = true;
									}}
								>
									<FileTextIcon class="text-muted-foreground size-4 shrink-0" />
									<span class="min-w-0">
										<span class="block truncate font-medium">{doc.name}</span>
										<span class="text-muted-foreground block truncate text-xs">
											ID: {doc.id} — путь: {doc.path}
										</span>
									</span>
								</button>
								{#if app.foundForms.length > 0 && stemDocIds.has(doc.id)}
									<Badge variant="outline" class="hidden shrink-0 sm:inline-flex">
										слово есть
									</Badge>
								{/if}
								{#if app.foundForms.length > 0}
									<Button
										size="sm"
										variant="outline"
										class="shrink-0"
										onclick={() => openSearchInDoc(doc.id)}
									>
										Поиск в документе
									</Button>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{:else if !app.isProcessing}
				<Alert>
					<InfoIcon />
					<AlertTitle>Документы не загружены</AlertTitle>
					<AlertDescription>
						Выберите текстовые файлы или загрузите демо-коллекцию, чтобы построить
						инвертированный индекс.
					</AlertDescription>
				</Alert>
			{/if}
		</CardContent>
	</Card>

	<Button
		class="w-full"
		size="lg"
		onclick={() => goto(resolve('/invertedIndex'))}
		disabled={!hasIndex || app.isProcessing}
	>
		<BookOpenIcon data-icon="inline-start" />
		Инвертированный индекс
	</Button>

	{#if app.diagnostics}
		<Card>
			<CardHeader>
				<CardTitle>Диагностика повторов</CardTitle>
				<CardDescription>
					Инспектируемые признаки задания «схожие по тематике»: слова, повторяющиеся внутри
					документа и общие для нескольких документов. Это данные для оценки, а не
					автоматическое доказательство смысловой близости текстов.
				</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-col gap-3">
				<div class="flex flex-wrap gap-2">
					<Badge variant="secondary">
						Терминов, общих для нескольких документов: {app.diagnostics.sharedAcrossDocuments.length}
					</Badge>
				</div>
				<p class="text-muted-foreground text-sm">
					Примеры общих терминов: {app.diagnostics.sharedAcrossDocuments.slice(0, 10).join(', ')}
				</p>
				<Collapsible>
					<CollapsibleTrigger class="group flex w-full items-center gap-2 text-left text-sm font-medium">
						<ChevronRightIcon
							class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
						/>
						<ChevronDownIcon
							class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
						/>
						Повторы внутри документов ({app.diagnostics.repeatedWithinDocuments.length} документов)
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div class="mt-2 max-h-48 overflow-auto rounded-md border p-2 font-mono text-xs">
							{#each app.diagnostics.repeatedWithinDocuments.slice(0, 10) as item (item.name)}
								<div class="truncate">
									{item.name}: {item.terms.slice(0, 15).join(', ')}
								</div>
							{/each}
						</div>
					</CollapsibleContent>
				</Collapsible>
			</CardContent>
		</Card>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle>Логи</CardTitle>
			<CardDescription>Последние 200 сообщений журнала обработки.</CardDescription>
		</CardHeader>
		<CardContent>
			{#if app.logs.length === 0}
				<p class="text-muted-foreground text-sm">
					Журнал пуст — загрузите документы или демо-тексты.
				</p>
			{:else}
				<ScrollArea class="bg-muted/30 h-72 rounded-md border p-3">
					<pre class="font-mono text-xs leading-relaxed whitespace-pre-wrap">{logLines.join('\n')}</pre>
				</ScrollArea>
			{/if}
		</CardContent>
	</Card>

	<ModalOrDrawer
		bind:open={viewOpen}
		title={shownDoc ? `Документ: ${shownDoc.name}` : 'Документ'}
		description="Текст документа полностью"
	>
		{#snippet badges()}
			{#if shownDoc}
				<Badge variant="secondary">ID: {shownDoc.id}</Badge>
				<Badge variant="secondary">Слов: {docWordCount}</Badge>
				<Badge variant="secondary" class="max-w-full truncate">Путь: {shownDoc.path}</Badge>
			{/if}
		{/snippet}
		{#if shownDoc}
			<div class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<p class="text-muted-foreground text-xs">
						Этапы показаны в порядке алгоритма; исходный текст приведён целиком в прокручиваемой
						панели. Превью лексем, терминов и постингов ограничено — нажмите «Показать
						полностью», чтобы увидеть все данные.
					</p>
					<Button
						size="sm"
						variant="outline"
						onclick={() => (showFullStages = !showFullStages)}
					>
						{showFullStages ? 'Свернуть до превью' : 'Показать полностью'}
					</Button>
				</div>
				<Collapsible>
					<CollapsibleTrigger class="group flex w-full items-center gap-2 text-left text-sm font-medium">
						<ChevronRightIcon
							class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
						/>
						<ChevronDownIcon
							class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
						/>
						Этап 1–2: исходный текст и исходные лексемы
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div class="mt-2 flex flex-col gap-2 text-sm">
							<p class="text-muted-foreground text-xs">
								Исходный текст: полностью ({shownDoc.rawText.length} символов). Исходные лексемы:
								показано {showFullStages ? sourceLexemes.length : Math.min(PREVIEW_LIMITS.lexemes, sourceLexemes.length)} из
								{sourceLexemes.length}.
							</p>
							<pre class="bg-muted/30 max-h-48 overflow-auto rounded-md border p-2 whitespace-pre-wrap">{shownDoc.rawText}</pre>
							<p class="text-muted-foreground font-mono text-xs">
								{(showFullStages ? sourceLexemes : sourceLexemes.slice(0, PREVIEW_LIMITS.lexemes)).join(' ')}
							</p>
						</div>
					</CollapsibleContent>
				</Collapsible>
				<Collapsible>
					<CollapsibleTrigger class="group flex w-full items-center gap-2 text-left text-sm font-medium">
						<ChevronRightIcon
							class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
						/>
						<ChevronDownIcon
							class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
						/>
						Этап 3: нормализованные лексемы (после стоп-слов)
					</CollapsibleTrigger>
					<CollapsibleContent>
						<p class="text-muted-foreground mt-2 text-xs">
							Показано {showFullStages ? normalizedLexemes.length : Math.min(PREVIEW_LIMITS.normalized, normalizedLexemes.length)} из
							{normalizedLexemes.length} нормализованных лексем.
						</p>
						<p class="bg-muted/30 mt-1 max-h-48 overflow-auto rounded-md border p-2 font-mono text-xs whitespace-pre-wrap">
							{(showFullStages ? normalizedLexemes : normalizedLexemes.slice(0, PREVIEW_LIMITS.normalized)).join(' ')}
						</p>
					</CollapsibleContent>
				</Collapsible>
				<Collapsible>
					<CollapsibleTrigger class="group flex w-full items-center gap-2 text-left text-sm font-medium">
						<ChevronRightIcon
							class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
						/>
						<ChevronDownIcon
							class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
						/>
						Этап 4: постинги и позиции в документе
					</CollapsibleTrigger>
					<CollapsibleContent>
						<p class="text-muted-foreground mt-2 text-xs">
							Показано {showFullStages ? docPostings.length : Math.min(PREVIEW_LIMITS.postings, docPostings.length)} из
							{docPostings.length} терминов с постингами в этом документе.
						</p>
						<div class="mt-1 max-h-48 overflow-auto rounded-md border p-2 font-mono text-xs">
							{#each (showFullStages ? docPostings : docPostings.slice(0, PREVIEW_LIMITS.postings)) as [term, info] (term)}
								<div>
									{term}: частота {info.postings.find((p) => p.docId === shownDoc.id)?.termFrequency},
									позиции [{info.postings.find((p) => p.docId === shownDoc.id)?.positions.join(', ')}]
								</div>
							{/each}
						</div>
					</CollapsibleContent>
				</Collapsible>
			</div>
		{/if}
	</ModalOrDrawer>
</div>
