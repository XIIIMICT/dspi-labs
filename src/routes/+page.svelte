<script lang="ts">
	import { goto } from '$app/navigation';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import { ScrollArea } from '#lib/components/ui/scroll-area';
	import { Separator } from '#lib/components/ui/separator';
	import PageHeader from '#lib/components/page-header.svelte';
	import { appStore as app } from '#lib/lab/store.svelte';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import InfoIcon from '@lucide/svelte/icons/info';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import UploadIcon from '@lucide/svelte/icons/upload';

	const hasIndex = $derived(app.dictionary.size > 0);
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
		goto(`/search/${docId}/${encodeURIComponent(app.searchQuery.trim())}`);
	}
</script>

<div class="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
	<PageHeader
		title="Инвертированный индекс и словарь"
		subtitle="Лабораторная работа №1 · Распределённые системы обработки информации · вариант 8"
	/>

	<Card>
		<CardHeader>
			<CardTitle>Документы</CardTitle>
			<CardDescription>
				Выберите текстовые файлы — токенизация, стемминг и построение индекса выполняются
				полностью в браузере.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-3">
			<div class="flex flex-wrap gap-2">
				<Button onclick={() => fileInput?.click()} disabled={app.isProcessing}>
					{#if app.isProcessing}
						<LoaderCircleIcon class="animate-spin" />
					{:else}
						<UploadIcon />
					{/if}
					Выбрать файлы
				</Button>
				<Button
					variant="secondary"
					onclick={() => void app.loadDemoCollection()}
					disabled={app.isProcessing}
				>
					<SparklesIcon />
					Демо-тексты (100 документов)
				</Button>
				{#if app.documents.length > 0}
					<Button variant="outline" onclick={() => app.reset()} disabled={app.isProcessing}>
						<RotateCcwIcon />
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

			<div
				class="border-border/80 text-muted-foreground rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors"
				class:bg-muted={dragOver}
				role="button"
				tabindex="0"
				ondragover={(event) => {
					event.preventDefault();
					dragOver = true;
				}}
				ondragleave={() => (dragOver = false)}
				ondrop={onDrop}
			>
				Перетащите текстовые файлы сюда
			</div>

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
		<CardContent class="space-y-4">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-end">
				<div class="flex-1 space-y-1.5">
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
					<SearchIcon />
					Показать формы слова
				</Button>
			</div>

			{#if app.foundForms.length > 0}
				<div class="space-y-1.5">
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
				<div class="space-y-2">
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
									onclick={() => goto(`/document/${doc.id}`)}
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
		onclick={() => goto('/invertedIndex')}
		disabled={!hasIndex || app.isProcessing}
	>
		<BookOpenIcon />
		Инвертированный индекс
	</Button>

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
</div>
