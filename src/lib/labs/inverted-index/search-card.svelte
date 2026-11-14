<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import { Separator } from '#lib/components/ui/separator';
	import { appStore as app } from './store.svelte';
	import { lab1ViewState as viewer } from './view-state.svelte';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import InfoIcon from '@lucide/svelte/icons/info';
	import SearchIcon from '@lucide/svelte/icons/search';

	const hasIndex = $derived(app.dictionary.size > 0);
	const stemDocIds = $derived(
		new Set(
			app.searchStem
				? (app.dictionary.get(app.searchStem)?.postings ?? []).map((p) => p.docId)
				: [],
		),
	);

	function openSearchInDoc(docId: number): void {
		goto(resolve('/search/[docId]/[query]', {
			docId: String(docId),
			query: encodeURIComponent(app.searchQuery.trim()),
		}));
	}
</script>

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
								onclick={() => viewer.open(doc)}
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
