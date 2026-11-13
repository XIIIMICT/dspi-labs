<script lang="ts">
	import { Badge } from '#lib/components/ui/badge';
	import * as Drawer from '#lib/components/ui/drawer';
	import type { Document } from '#lib/labs/lab-1/models';
	import { findWords } from '#lib/labs/lab-1/text-processing';

	let { doc = null, open = $bindable(false) }: { doc: Document | null; open?: boolean } =
		$props();

	const wordCount = $derived(doc ? findWords(doc.rawText).length : 0);
</script>

<Drawer.Root bind:open>
	<Drawer.Content>
		<div class="mx-auto flex max-h-[75vh] w-full max-w-4xl flex-col">
			<Drawer.Header class="shrink-0">
				<Drawer.Title class="truncate">{doc ? `Документ: ${doc.name}` : 'Документ'}</Drawer.Title>
				<Drawer.Description>Текст документа полностью</Drawer.Description>
			</Drawer.Header>
			<div class="min-h-0 overflow-y-auto px-4 pb-6 sm:px-6">
				{#if doc}
					<div class="flex flex-wrap gap-2">
						<Badge variant="secondary">ID: {doc.id}</Badge>
						<Badge variant="secondary">Слов: {wordCount}</Badge>
						<Badge variant="secondary" class="max-w-full truncate">Путь: {doc.path}</Badge>
					</div>
					<p class="mt-3 leading-relaxed whitespace-pre-wrap">{doc.rawText}</p>
				{:else}
					<p class="text-muted-foreground">Документ не выбран.</p>
				{/if}
			</div>
		</div>
	</Drawer.Content>
</Drawer.Root>
