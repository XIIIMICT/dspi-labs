<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent } from '#lib/components/ui/card';
	import { ScrollArea } from '#lib/components/ui/scroll-area';
	import PageHeader from '#lib/components/page-header.svelte';
	import { appStore as app } from '#lib/labs/lab-1/store.svelte';
	import { findWords } from '#lib/labs/lab-1/text-processing';
	import FileXIcon from '@lucide/svelte/icons/file-x';

	const doc = $derived(app.documents.find((d) => d.id === Number(page.params.docId)));
	const wordCount = $derived(doc ? findWords(doc.rawText).length : 0);
</script>

<div class="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
	<PageHeader backHref="/" title={doc ? `Документ: ${doc.name}` : 'Документ'} />

	{#if doc}
		<div class="flex flex-wrap gap-2">
			<Badge variant="secondary">ID: {doc.id}</Badge>
			<Badge variant="secondary">Слов: {wordCount}</Badge>
			<Badge variant="secondary">Путь: {doc.path}</Badge>
		</div>

		<Card>
			<CardContent class="p-0">
				<ScrollArea class="h-[70vh] rounded-lg border p-4">
					<p class="leading-relaxed whitespace-pre-wrap">{doc.rawText}</p>
				</ScrollArea>
			</CardContent>
		</Card>
	{:else}
		<Alert>
			<FileXIcon />
			<AlertTitle>Документ не найден</AlertTitle>
			<AlertDescription>
				Возможно, страница открыта по прямой ссылке после перезагрузки — коллекция
				документов живёт только в памяти текущей сессии. Вернитесь на главный экран и
				загрузите документы заново.
			</AlertDescription>
		</Alert>
		<Button onclick={() => goto('/')}>На главный экран</Button>
	{/if}
</div>
