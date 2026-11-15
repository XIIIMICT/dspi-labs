<script lang="ts">
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import FileDropzone from '#lib/components/file-dropzone.svelte';
	import { labs } from '#lib/labs';
	import { appStore as app } from './store.svelte';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';

	const lab = $derived(labs.find((l) => l.folder === 'inverted-index') ?? labs[0]);
	const hasIndex = $derived(app.dictionary.size > 0);
	const totalTokens = $derived.by(() => {
		let sum = 0;
		for (const info of app.dictionary.values()) sum += info.collectionFrequency;
		return sum;
	});
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex flex-wrap items-center gap-2">
			<BookOpenIcon class="size-5" />
			{lab.title}
		</CardTitle>
		<CardDescription>
			Выберите текстовые файлы — токенизация, стемминг и построение индекса выполняются
			полностью в браузере.
		</CardDescription>
	</CardHeader>
	<CardContent class="flex flex-col gap-3">
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
		<FileDropzone
			multiple
			loading={app.isProcessing}
			onfiles={(files) => app.loadFromFiles(files)}
		>
			{#snippet actions()}
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
			{/snippet}
		</FileDropzone>

		{#if app.documents.length > 0 || hasIndex}
			<div class="flex flex-wrap gap-2">
				<Badge variant="secondary">Документов: {app.documents.length}</Badge>
				<Badge variant="secondary">Терминов: {app.dictionary.size}</Badge>
				<Badge variant="secondary">Токенов в индексе: {totalTokens}</Badge>
			</div>
		{/if}
	</CardContent>
</Card>
