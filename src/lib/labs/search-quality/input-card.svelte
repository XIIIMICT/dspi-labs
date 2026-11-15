<script lang="ts">
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import FileDropzone from '#lib/components/file-dropzone.svelte';
	import * as InputGroup from '#lib/components/ui/input-group';
	import { Label } from '#lib/components/ui/label';
	import { getVariantInfo, labs } from '#lib/labs';
	import { shellStore } from '#lib/shell.svelte';
	import { MIN_WORDS_PER_TEXT, REQUIRED_CANDIDATES, searchQualityStore as store } from './store.svelte';
	import ChartLineIcon from '@lucide/svelte/icons/chart-line';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import TargetIcon from '@lucide/svelte/icons/target';

	const lab = $derived(labs.find((l) => l.folder === 'search-quality') ?? labs[0]);
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
			<TargetIcon class="size-5" />
			{lab.title}
		</CardTitle>
		<CardDescription>
			Добавьте файлы с метками «релевантный» или «нерелевантный»: первый документ станет
			запросом, остальные — кандидатами. Затем задайте порог и нажмите «Вычислить коэффициенты».
		</CardDescription>
	</CardHeader>
	<CardContent class="flex flex-col gap-3">
		<div class="flex flex-col gap-2 rounded-lg border p-3">
			<FileDropzone
				loading={store.isProcessing}
				dropEnabled={false}
				label="Добавить файл"
				pickers={[
					{ label: 'Добавить релевантный', onfiles: (files) => files[0] && store.addFile(files[0], true) },
					{ label: 'Добавить нерелевантный', variant: 'outline', onfiles: (files) => files[0] && store.addFile(files[0], false) },
				]}
				onfiles={(files) => files[0] && store.addFile(files[0], true)}
			>
				{#snippet actions()}
					{#if store.documents.length > 0}
						<Button size="sm" variant="outline" onclick={() => store.reset()}>Сбросить</Button>
					{/if}
				{/snippet}
			</FileDropzone>
			<p class="text-muted-foreground text-sm">
				Первый документ — запрос, остальные — кандидаты (можно менять метку и запрос в списке).
				Нужны {REQUIRED_CANDIDATES} кандидатов по {MIN_WORDS_PER_TEXT}+ латинских токенов.
			</p>

			{#if store.documents.length > 0}
				<div class="grid max-h-64 gap-2 overflow-y-auto">
					{#each store.documents as doc, index (index)}
						<div class="hover:bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg border p-2">
							<FileTextIcon class="text-muted-foreground size-4 shrink-0" />
							<span class="min-w-0 flex-1 truncate text-sm font-medium">{doc.name}</span>
							<Badge variant={doc.relevant ? 'default' : 'secondary'}>
								{doc.relevant ? 'релевантный' : 'нерелевантный'}
							</Badge>
							{#if index === 0}
								<Badge variant="outline">запрос</Badge>
							{:else}
								<Button size="sm" variant="ghost" onclick={() => store.makeQuery(index)}>
									Сделать запросом
								</Button>
							{/if}
							<Button
								size="sm"
								variant="outline"
								onclick={() => store.toggleRelevant(index)}
								disabled={index === 0}
							>
								{doc.relevant ? '→ нерелевантный' : '→ релевантный'}
							</Button>
							<Button size="sm" variant="outline" onclick={() => store.removeDocument(index)}>
								Убрать
							</Button>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<Label for="threshold-input">Порог схожести для выдачи:</Label>
				<InputGroup.Root class="w-20">
					<InputGroup.Input
						id="threshold-input"
						type="number"
						min={0}
						max={100}
						step={1}
						value={store.thresholdPercent}
						onchange={(event) => {
							const value = Number((event.currentTarget as HTMLInputElement).value);
							store.setThreshold(value);
						}}
					/>
					<InputGroup.Addon align="inline-end">%</InputGroup.Addon>
				</InputGroup.Root>
			</div>
			<Button
				onclick={() => void store.run(shingleWidth)}
				disabled={store.isProcessing || store.documents.length < REQUIRED_CANDIDATES + 1}
			>
				<ChartLineIcon data-icon="inline-start" />
				Вычислить коэффициенты
			</Button>
		</div>

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
