<script lang="ts">
	import { goto } from '$app/navigation';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#lib/components/ui/collapsible';
	import { Input } from '#lib/components/ui/input';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '#lib/components/ui/table';
	import PageHeader from '#lib/components/page-header.svelte';
	import { appStore as app } from '#lib/lab/store.svelte';
	import type { TermInfo } from '#lib/lab/models';
	import { goBack } from '#lib/lab/navigation';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import SearchIcon from '@lucide/svelte/icons/search';

	const PAGE_SIZE = 50;

	let filter = $state('');
	let limit = $state(PAGE_SIZE);

	const sortedTerms = $derived(
		[...app.dictionary.values()].sort((a, b) => b.collectionFrequency - a.collectionFrequency),
	);
	const filteredTerms = $derived.by(() => {
		const query = filter.trim().toLowerCase();
		if (!query) return sortedTerms;
		return sortedTerms.filter((info) => info.term.includes(query));
	});
	const shownTerms = $derived(filteredTerms.slice(0, limit));

	function docName(docId: number): string {
		return app.documents.find((d) => d.id === docId)?.name ?? `Документ ${docId}`;
	}

	function formatPositions(positions: number[]): string {
		return positions.join(', ');
	}

	function termTitle(info: TermInfo): string {
		const docs = info.postings
			.map((p) => `Документ ID=${p.docId}, Частота=${p.termFrequency}`)
			.join('; ');
		return `${info.term} → ${docs}`;
	}
</script>

<div class="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
	<PageHeader
		backHref="/"
		title="Инвертированный индекс"
		subtitle="Термины отсортированы по частоте в коллекции; раскройте термин, чтобы увидеть постинги"
	/>

	{#if app.dictionary.size === 0}
		<Alert>
			<BookOpenIcon />
			<AlertTitle>Индекс не построен</AlertTitle>
			<AlertDescription>
				Сначала загрузите документы на главном экране — после обработки здесь появится
				словарь терминов с постингами.
			</AlertDescription>
		</Alert>
		<Button variant="outline" onclick={() => goBack('/')}>На главный экран</Button>
	{:else}
		<Card>
			<CardHeader>
				<CardTitle>Словарь</CardTitle>
				<CardDescription>
					Всего терминов: {app.dictionary.size}
					{#if filter.trim()}
						· по фильтру «{filter.trim()}»: {filteredTerms.length}
					{/if}
					· показано: {shownTerms.length}
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="relative">
					<SearchIcon class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
					<Input
						class="pl-9"
						placeholder="Фильтр по термину…"
						bind:value={filter}
						oninput={() => (limit = PAGE_SIZE)}
					/>
				</div>

				<div class="overflow-hidden rounded-lg border">
					{#each shownTerms as info (info.term)}
						<Collapsible>
							<CollapsibleTrigger
								class="hover:bg-muted/50 group flex w-full items-center gap-3 px-4 py-2.5 text-left"
								title={termTitle(info)}
							>
								<ChevronRightIcon
									class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
								/>
								<ChevronDownIcon
									class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
								/>
								<span class="min-w-0 flex-1 truncate font-medium">{info.term}</span>
								<Badge variant="secondary" class="shrink-0">в {info.docFrequency} док.</Badge>
								<Badge variant="outline" class="shrink-0">{info.collectionFrequency} вхожд.</Badge>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<div class="border-t px-2 py-2 sm:px-4">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Документ</TableHead>
												<TableHead>Частота</TableHead>
												<TableHead>Позиции</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{#each info.postings as posting (posting.docId)}
												<TableRow>
													<TableCell class="max-w-[240px] truncate font-medium">
														ID={posting.docId} · {docName(posting.docId)}
													</TableCell>
													<TableCell>{posting.termFrequency}</TableCell>
													<TableCell class="text-muted-foreground max-w-[280px] truncate font-mono text-xs">
														[{formatPositions(posting.positions)}]
													</TableCell>
												</TableRow>
											{/each}
										</TableBody>
									</Table>
								</div>
							</CollapsibleContent>
						</Collapsible>
					{/each}
				</div>

				{#if limit < filteredTerms.length}
					<Button
						variant="outline"
						class="w-full"
						onclick={() => (limit += PAGE_SIZE)}
					>
						Показать ещё {Math.min(PAGE_SIZE, filteredTerms.length - limit)} терминов
					</Button>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>
