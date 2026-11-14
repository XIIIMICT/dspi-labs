<script lang="ts">
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { ScrollArea } from '#lib/components/ui/scroll-area';
	import type { Document } from '#lib/labs/lab-1/models';
	import { findWords, stem } from '#lib/labs/lab-1/text-processing';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	let { doc, query }: { doc: Document; query: string } = $props();

	// Mirrors remember { ... } in SearchScreen.kt: derived from the inputs;
	// the parent remounts this component via {#key}, so it runs once per visit.
	const normalizedQuery = $derived(stem(query.trim().toLowerCase()));

	// All words of the document with coordinates and stems.
	const words = $derived(findWords(doc.rawText));
	const matchCount = $derived(words.filter((w) => w.stem === normalizedQuery).length);
	const formsInDoc = $derived(
		[...new Set(words.filter((w) => w.stem === normalizedQuery).map((w) => w.word))],
	);

	// Split the text into segments: plain text or a matched word with its ordinal.
	type Segment = { text: string; matchOrdinal: number | null };

	function buildSegments(): Segment[] {
		const segments: Segment[] = [];
		let cursor = 0;
		let ordinal = 0;
		for (const word of words) {
			if (word.start > cursor) {
				segments.push({ text: doc.rawText.slice(cursor, word.start), matchOrdinal: null });
			}
			if (word.stem === normalizedQuery) {
				segments.push({ text: word.word, matchOrdinal: ordinal++ });
			} else {
				segments.push({ text: word.word, matchOrdinal: null });
			}
			cursor = word.end;
		}
		if (cursor < doc.rawText.length) {
			segments.push({ text: doc.rawText.slice(cursor), matchOrdinal: null });
		}
		return segments;
	}

	const segments = $derived(buildSegments());

	let current = $state(0);

	// Auto-scroll to the active match (like animateScrollTo in the original).
	$effect(() => {
		current;
		document.getElementById(`match-${current}`)?.scrollIntoView({
			block: 'center',
			behavior: 'smooth',
		});
	});

	function prev(): void {
		if (current > 0) current -= 1;
	}

	function next(): void {
		if (current < matchCount - 1) current += 1;
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			prev();
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			next();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-2">
		<Button variant="outline" size="sm" onclick={prev} disabled={current === 0}>
			<ChevronLeftIcon data-icon="inline-start" />
			Пред.
		</Button>
		<Button
			variant="outline"
			size="sm"
			onclick={next}
			disabled={current >= matchCount - 1}
		>
			След.
			<ChevronRightIcon data-icon="inline-end" />
		</Button>
		{#if matchCount > 0}
			<span class="text-sm whitespace-nowrap">Результат {current + 1} из {matchCount}</span>
		{:else}
			<span class="text-muted-foreground text-sm">Вхождения не найдены</span>
		{/if}
		<span class="grow"></span>
		<Badge variant="secondary" class="whitespace-nowrap">стем: {normalizedQuery}</Badge>
	</div>

	{#if formsInDoc.length > 0}
		<div class="flex flex-wrap items-center gap-1.5">
			<span class="text-muted-foreground text-sm">Формы в документе:</span>
			{#each formsInDoc as form (form)}
				<Badge variant="outline">{form}</Badge>
			{/each}
		</div>
	{/if}

	<ScrollArea class="h-[65vh] rounded-lg border p-4">
		<div class="text-[15px] leading-relaxed whitespace-pre-wrap">
			{#each segments as segment, index (index)}
				{#if segment.matchOrdinal === null}
					{segment.text}
				{:else if segment.matchOrdinal === current}
					<mark
						id="match-{segment.matchOrdinal}"
						class="bg-primary text-primary-foreground rounded-sm px-0.5 font-semibold"
					>
						{segment.text}
					</mark>
				{:else}
					<mark
						id="match-{segment.matchOrdinal}"
						class="text-destructive rounded-sm bg-transparent px-0.5 font-semibold"
					>
						{segment.text}
					</mark>
				{/if}
			{/each}
		</div>
	</ScrollArea>

	<p class="text-muted-foreground text-xs">
		Переключать вхождения можно кнопками или стрелками ← → на клавиатуре.
	</p>
</div>
