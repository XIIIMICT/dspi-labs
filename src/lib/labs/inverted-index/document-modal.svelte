<script lang="ts">
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#lib/components/ui/collapsible';
	import { Textarea } from '#lib/components/ui/textarea';
	import ModalOrDrawer from '#lib/components/modal-or-drawer.svelte';
	import { appStore as app } from './store.svelte';
	import { lab1ViewState as viewer } from './view-state.svelte';
	import { findWords, removeStopWords, tokenizeAndNormalize } from './text-processing';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import DownloadIcon from '@lucide/svelte/icons/download';

	// A const mirror keeps narrowing stable in $derived and in the template.
	const shownDoc = $derived(viewer.viewDoc);
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
	/** Full evidence strings for the three algorithm stages (no truncation). */
	const lexemesText = $derived(sourceLexemes.join(' '));
	const normalizedText = $derived(normalizedLexemes.join(' '));
	const postingsText = $derived(
		docPostings
			.map(([term, info]) => {
				const posting = info.postings.find((p) => p.docId === shownDoc?.id);
				return `${term}: частота ${posting?.termFrequency}, позиции [${posting?.positions.join(', ') ?? ''}]`;
			})
			.join('\n'),
	);

	/** Downloads a stage's text as a local .txt file (browser-only, no upload). */
	function downloadText(filename: string, text: string): void {
		const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	}

	function stageFilename(stage: string): string {
		const base = (shownDoc?.name ?? 'документ').replace(/\.txt$/i, '');
		return `${base}-${stage}.txt`;
	}
</script>

<ModalOrDrawer
	bind:open={viewer.viewOpen}
	title={shownDoc ? `Документ: ${shownDoc.name}` : 'Документ'}
>
	{#snippet badges()}
		{#if shownDoc}
			<Badge variant="secondary">ID: {shownDoc.id}</Badge>
			<Badge variant="secondary">Слов: {docWordCount}</Badge>
		{/if}
	{/snippet}
	{#if shownDoc}
		<div class="flex flex-col gap-3">
			<Collapsible bind:open={viewer.sourceTextOpen}>
				<CollapsibleTrigger class="group flex w-full items-center gap-2 text-left text-sm font-medium">
					<ChevronRightIcon
						class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
					/>
					<ChevronDownIcon
						class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
					/>
					Исходный текст
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div class="mt-2 flex flex-col gap-2">
						<Button
							size="sm"
							variant="outline"
							class="self-start"
							onclick={() => downloadText(stageFilename('исходный-текст'), shownDoc.rawText)}
						>
							<DownloadIcon data-icon="inline-start" />
							Скачать
						</Button>
						<Textarea
							value={shownDoc.rawText}
							readonly
							rows={10}
							class="font-mono !text-xs leading-relaxed whitespace-pre-wrap"
							aria-label="Исходный текст документа"
						/>
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
					Этап 1: исходные лексемы ({sourceLexemes.length})
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div class="mt-2 flex flex-col gap-2">
						<Button
							size="sm"
							variant="outline"
							class="self-start"
							onclick={() => downloadText(stageFilename('лексемы'), lexemesText)}
						>
							<DownloadIcon data-icon="inline-start" />
							Скачать
						</Button>
						<Textarea
							value={lexemesText}
							readonly
							rows={6}
							class="font-mono !text-xs leading-relaxed whitespace-pre-wrap"
							aria-label="Исходные лексемы документа"
						/>
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
					Этап 2: нормализованные лексемы, после стоп-слов ({normalizedLexemes.length})
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div class="mt-2 flex flex-col gap-2">
						<Button
							size="sm"
							variant="outline"
							class="self-start"
							onclick={() => downloadText(stageFilename('нормализованные'), normalizedText)}
						>
							<DownloadIcon data-icon="inline-start" />
							Скачать
						</Button>
						<Textarea
							value={normalizedText}
							readonly
							rows={6}
							class="font-mono !text-xs leading-relaxed whitespace-pre-wrap"
							aria-label="Нормализованные лексемы документа"
						/>
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
					Этап 3: постинги и позиции ({docPostings.length} терминов)
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div class="mt-2 flex flex-col gap-2">
						<Button
							size="sm"
							variant="outline"
							class="self-start"
							onclick={() => downloadText(stageFilename('постинги'), postingsText)}
						>
							<DownloadIcon data-icon="inline-start" />
							Скачать
						</Button>
						<Textarea
							value={postingsText}
							readonly
							rows={8}
							class="font-mono !text-xs leading-relaxed whitespace-pre-wrap"
							aria-label="Постинги и позиции документа"
						/>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	{/if}
</ModalOrDrawer>
