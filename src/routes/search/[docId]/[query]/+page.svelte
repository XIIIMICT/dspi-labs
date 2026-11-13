<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';
	import { Button } from '#lib/components/ui/button';
	import PageHeader from '#lib/components/page-header.svelte';
	import SearchView from './search-view.svelte';
	import { appStore as app } from '#lib/lab/store.svelte';
	import FileSearchIcon from '@lucide/svelte/icons/file-search';

	const docId = $derived(Number(page.params.docId));
	const query = $derived(page.params.query ?? '');
	const doc = $derived(app.documents.find((d) => d.id === docId));
</script>

<div class="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
	<PageHeader
		backHref="/"
		title="Поиск «{query}»"
		subtitle={doc ? `Документ: ${doc.name} (ID: ${doc.id})` : 'Документ не загружен'}
	/>

	{#if doc}
		{#key `${docId}|${query}`}
			<SearchView {doc} {query} />
		{/key}
	{:else}
		<Alert>
			<FileSearchIcon />
			<AlertTitle>Документ не найден</AlertTitle>
			<AlertDescription>
				Коллекция документов живёт в памяти сессии — после перезагрузки страницы её нужно
				загрузить заново на главном экране.
			</AlertDescription>
		</Alert>
		<Button onclick={() => goto('/')}>На главный экран</Button>
	{/if}
</div>
