<script lang="ts">
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import FileDropzone from '#lib/components/file-dropzone.svelte';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#lib/components/ui/collapsible';
	import { getVariantInfo, labs } from '#lib/labs';
	import { shellStore } from '#lib/shell.svelte';
	import { MIN_WORDS_PER_TEXT, REQUIRED_TEXTS, shinglesStore as store } from './store.svelte';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import GitCompareIcon from '@lucide/svelte/icons/git-compare';
	import LibraryIcon from '@lucide/svelte/icons/library';

	const lab = $derived(labs.find((l) => l.folder === 'shingles') ?? labs[0]);
	const variantInfo = $derived(getVariantInfo(lab, shellStore.selectedVariant));
	const shingleWidth = $derived(
		typeof variantInfo?.['Слов в шинглах'] === 'number'
			? (variantInfo['Слов в шинглах'] as number)
			: 8,
	);
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex flex-wrap items-center gap-2">
			<GitCompareIcon class="size-5" />
			{lab.title}
		</CardTitle>
		<CardDescription>
			Добавьте {REQUIRED_TEXTS} текстовых файла (не менее {MIN_WORDS_PER_TEXT} латинских
			токенов каждый) или выберите документы из коллекции ЛР 1 — затем нажмите «Сравнить тексты».
		</CardDescription>
	</CardHeader>
	<CardContent class="flex flex-col gap-3">
		<FileDropzone
			multiple
			label="Добавить файлы"
			loading={store.isProcessing}
			onfiles={(files) => store.addFiles(files)}
		>
			{#snippet actions()}
				{#if store.candidates.length > 0 || store.results.length > 0}
					<Button variant="outline" onclick={() => store.reset()} disabled={store.isProcessing}>
						Сбросить
					</Button>
				{/if}
				<Button
					onclick={() => void store.run(shingleWidth)}
					disabled={store.isProcessing || store.candidates.length !== REQUIRED_TEXTS}
				>
					<GitCompareIcon data-icon="inline-start" />
					Сравнить тексты
				</Button>
			{/snippet}
		</FileDropzone>

		{#if store.lab1Documents.length > 0}
			<Collapsible>
				<CollapsibleTrigger class="group flex w-full items-center gap-2 text-left text-sm font-medium">
					<ChevronRightIcon
						class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
					/>
					<ChevronDownIcon
						class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
					/>
					<LibraryIcon class="size-4" />
					Выбрать документ из коллекции ЛР 1 ({store.lab1Documents.length})
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div class="mt-2 grid max-h-48 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
						{#each store.lab1Documents as doc (doc.id)}
							<div class="hover:bg-muted/50 flex items-center gap-2 rounded-lg border p-2">
								<FileTextIcon class="text-muted-foreground size-4 shrink-0" />
								<span class="min-w-0 flex-1 truncate text-sm">{doc.name}</span>
								<Button size="sm" variant="outline" onclick={() => store.addLab1Document(doc.id)}>
									Добавить
								</Button>
							</div>
						{/each}
					</div>
				</CollapsibleContent>
			</Collapsible>
		{:else}
			<p class="text-muted-foreground text-sm">
				Добавьте английские текстовые файлы или выберите документы из коллекции ЛР 1. Демо-коллекция
				ЛР 1 русскоязычна, поэтому для этого варианта используйте импорт файлов.
			</p>
		{/if}

		{#if store.candidates.length > 0}
			<div class="grid gap-2">
				<p class="text-sm font-medium">Выбранные тексты ({store.candidates.length}/{REQUIRED_TEXTS}):</p>
				{#each store.candidates as candidate, index (index)}
					<div class="hover:bg-muted/50 flex items-center gap-2 rounded-lg border p-3">
						<FileTextIcon class="text-muted-foreground size-4 shrink-0" />
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-medium">{candidate.name}</span>
							<span class="text-muted-foreground block text-xs">
								{candidate.wordCount} слов · {candidate.origin === 'file' ? 'файл' : 'ЛР 1'}
							</span>
						</span>
						<Button
							size="sm"
							variant="outline"
							onclick={() => store.removeCandidate(index)}
							disabled={store.isProcessing}
						>
							Убрать
						</Button>
					</div>
				{/each}
			</div>
		{/if}

		{#if store.errors.length > 0}
			<Alert variant="destructive">
				<CircleAlertIcon />
				<AlertTitle>Проверка ввода не пройдена</AlertTitle>
				<AlertDescription>
					<ul class="list-disc pl-4">
						{#each store.errors as error (error)}
							<li>{error}</li>
						{/each}
					</ul>
				</AlertDescription>
			</Alert>
		{/if}
	</CardContent>
</Card>
