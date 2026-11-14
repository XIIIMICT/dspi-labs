<script lang="ts">
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#lib/components/ui/collapsible';
	import ModalOrDrawer from '#lib/components/modal-or-drawer.svelte';
	import { appStore as app } from './store.svelte';
	import { lab1ViewState as viewer } from './view-state.svelte';
	import { findWords, removeStopWords, tokenizeAndNormalize } from './text-processing';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

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
	/** Preview limits keep the modal responsive; "show full" removes them. */
	const PREVIEW_LIMITS = { lexemes: 200, normalized: 400, postings: 30 } as const;
</script>

<ModalOrDrawer
	bind:open={viewer.viewOpen}
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
					onclick={() => (viewer.showFullStages = !viewer.showFullStages)}
				>
					{viewer.showFullStages ? 'Свернуть до превью' : 'Показать полностью'}
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
							показано {viewer.showFullStages ? sourceLexemes.length : Math.min(PREVIEW_LIMITS.lexemes, sourceLexemes.length)} из
							{sourceLexemes.length}.
						</p>
						<pre class="bg-muted/30 max-h-48 overflow-auto rounded-md border p-2 whitespace-pre-wrap">{shownDoc.rawText}</pre>
						<p class="text-muted-foreground font-mono text-xs">
							{(viewer.showFullStages ? sourceLexemes : sourceLexemes.slice(0, PREVIEW_LIMITS.lexemes)).join(' ')}
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
						Показано {viewer.showFullStages ? normalizedLexemes.length : Math.min(PREVIEW_LIMITS.normalized, normalizedLexemes.length)} из
						{normalizedLexemes.length} нормализованных лексем.
					</p>
					<p class="bg-muted/30 mt-1 max-h-48 overflow-auto rounded-md border p-2 font-mono text-xs whitespace-pre-wrap">
						{(viewer.showFullStages ? normalizedLexemes : normalizedLexemes.slice(0, PREVIEW_LIMITS.normalized)).join(' ')}
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
						Показано {viewer.showFullStages ? docPostings.length : Math.min(PREVIEW_LIMITS.postings, docPostings.length)} из
						{docPostings.length} терминов с постингами в этом документе.
					</p>
					<div class="mt-1 max-h-48 overflow-auto rounded-md border p-2 font-mono text-xs">
						{#each (viewer.showFullStages ? docPostings : docPostings.slice(0, PREVIEW_LIMITS.postings)) as [term, info] (term)}
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
