<script lang="ts">
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { getVariantFields, getVariantInfo, labs } from '#lib/labs';
	import { shellStore } from '#lib/shell.svelte';
	import { appStore as app } from './store.svelte';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import UploadIcon from '@lucide/svelte/icons/upload';

	const hasIndex = $derived(app.dictionary.size > 0);
	const lab = $derived(labs.find((l) => l.folder === 'inverted-index') ?? labs[0]);
	const variantInfo = $derived(getVariantInfo(lab, shellStore.selectedVariant));
	const variantFields = $derived(getVariantFields(variantInfo));
	const totalTokens = $derived.by(() => {
		let sum = 0;
		for (const info of app.dictionary.values()) sum += info.collectionFrequency;
		return sum;
	});

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
</script>

<Card>
	<CardHeader>
		<CardTitle>Документы</CardTitle>
		<CardDescription>
			Выберите текстовые файлы — токенизация, стемминг и построение индекса выполняются
			полностью в браузере.
		</CardDescription>
	</CardHeader>
	<CardContent class="flex flex-col gap-3">
		<div class="flex flex-wrap gap-2">
			<Badge variant="secondary">Вариант: {shellStore.selectedVariant}</Badge>
			{#each variantFields as [key, value] (key)}
				<Badge variant="secondary">{key}: {String(value)}</Badge>
			{/each}
		</div>
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
		<div class="flex flex-wrap gap-2">
			<Button onclick={() => fileInput?.click()} disabled={app.isProcessing}>
				{#if app.isProcessing}
					<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
				{:else}
					<UploadIcon data-icon="inline-start" />
				{/if}
				Выбрать файлы
			</Button>
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
		</div>

		<input
			type="file"
			accept=".txt,text/plain"
			multiple
			class="hidden"
			bind:this={fileInput}
			onchange={onFilePick}
		/>

		<button
			type="button"
			class="border-border/80 text-muted-foreground hover:bg-muted/50 focus-visible:ring-ring/50 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
			class:bg-muted={dragOver}
			aria-label="Выбрать или перетащить текстовые файлы"
			onclick={() => fileInput?.click()}
			ondragover={(event) => {
				event.preventDefault();
				dragOver = true;
			}}
			ondragleave={() => (dragOver = false)}
			ondrop={onDrop}
		>
			Перетащите текстовые файлы сюда
		</button>

		{#if app.documents.length > 0 || hasIndex}
			<div class="flex flex-wrap gap-2">
				<Badge variant="secondary">Документов: {app.documents.length}</Badge>
				<Badge variant="secondary">Терминов: {app.dictionary.size}</Badge>
				<Badge variant="secondary">Токенов в индексе: {totalTokens}</Badge>
			</div>
		{/if}
	</CardContent>
</Card>
