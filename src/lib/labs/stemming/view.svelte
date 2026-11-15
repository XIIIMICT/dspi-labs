<script lang="ts">
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import FileDropzone from '#lib/components/file-dropzone.svelte';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#lib/components/ui/collapsible';
	import { ScrollArea } from '#lib/components/ui/scroll-area';
	import * as Table from '#lib/components/ui/table';
	import { getVariantFields, getVariantInfo, labs } from '#lib/labs';
	import { shellStore } from '#lib/shell.svelte';
	import { MIN_WORDS, stemmingStore as store } from './store.svelte';
	import { renderStemmedText } from './stemming';
	import BookTextIcon from '@lucide/svelte/icons/book-text';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import LibraryIcon from '@lucide/svelte/icons/library';

	// Lab 2 is the registry entry with folder "stemming"; number is derived.
	const lab = $derived(labs.find((l) => l.folder === 'stemming') ?? labs[0]);
	const variantInfo = $derived(getVariantInfo(lab, shellStore.selectedVariant));
	const variantFields = $derived(getVariantFields(variantInfo));

	const rendered = $derived(
		store.source && store.result ? renderStemmedText(store.source.text, store.result) : '',
	);
	const wordRows = $derived(store.result ? store.result.words.slice(0, 400) : []);
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex flex-wrap items-center gap-2">
			<LibraryIcon class="size-5" />
			Стемминг и лемматизация
		</CardTitle>
		<CardDescription>
			Загрузите текстовый файл (не менее {MIN_WORDS} слов) — словарный стеммер сопоставит слова текста со
			словарём основ.
		</CardDescription>
	</CardHeader>
	<CardContent class="flex flex-col gap-3">
		<FileDropzone
			label="Выбрать файл"
			loading={store.isProcessing}
			onfiles={(files) => files[0] && store.loadFile(files[0])}
		>
			{#snippet actions()}
				{#if store.source}
					<Button variant="outline" onclick={() => store.reset()}>Сбросить</Button>
				{/if}
			{/snippet}
		</FileDropzone>
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

{#if store.source && store.result}
	{@const result = store.result}
	<div class="grid gap-4 lg:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<BookTextIcon class="size-5" />
					Исходный текст
				</CardTitle>
				<CardDescription>
					{store.source.name} — {result.totalWords} слов
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ScrollArea class="bg-muted/30 h-80 rounded-md border p-3">
					<pre class="text-sm leading-relaxed whitespace-pre-wrap">{store.source.text}</pre>
				</ScrollArea>
			</CardContent>
		</Card>
		<Card>
			<CardHeader>
				<CardTitle>Результат обработки</CardTitle>
				<CardDescription>
					Слова заменены на основы из словаря; знаки препинания и структура текста сохранены.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ScrollArea class="bg-muted/30 h-80 rounded-md border p-3">
					<pre class="text-sm leading-relaxed whitespace-pre-wrap">{rendered}</pre>
				</ScrollArea>
			</CardContent>
		</Card>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Статистика</CardTitle>
			<CardDescription>Итоги работы словарного стеммера по загруженному тексту.</CardDescription>
		</CardHeader>
		<CardContent class="flex flex-wrap gap-2">
			<Badge variant="secondary">Всего слов: {result.totalWords}</Badge>
			<Badge variant="secondary">Найдено в словаре: {result.matched}</Badge>
			<Badge variant="secondary">Нет в словаре: {result.missed}</Badge>
			<Badge variant="secondary">Уникальных основ: {result.uniqueStems.length}</Badge>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Замена слов по словарю</CardTitle>
			<CardDescription>
				Каждое слово текста и его основа (первые 400 вхождений; «—» — слова нет в словаре).
			</CardDescription>
		</CardHeader>
		<CardContent>
			<Collapsible>
				<CollapsibleTrigger class="group flex w-full items-center gap-2 text-left text-sm font-medium">
					<ChevronRightIcon
						class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
					/>
					<ChevronDownIcon
						class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
					/>
					Показать таблицу соответствия слов
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div class="mt-3 overflow-hidden rounded-lg border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>№</Table.Head>
									<Table.Head>Слово</Table.Head>
									<Table.Head>Основа</Table.Head>
									<Table.Head>Способ</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each wordRows as word, index (word.start)}
									<Table.Row>
										<Table.Cell class="text-muted-foreground">{index + 1}</Table.Cell>
										<Table.Cell class="font-medium">{word.source}</Table.Cell>
										<Table.Cell>{word.stem ?? '—'}</Table.Cell>
										<Table.Cell class="text-muted-foreground">
											{word.match === 'exact'
												? 'точное совпадение'
												: word.match === 'prefix'
													? 'по основе-префиксу'
													: 'нет в словаре'}
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
					{#if result.words.length > wordRows.length}
						<p class="text-muted-foreground mt-2 text-sm">
							Показаны первые {wordRows.length} из {result.words.length} вхождений.
						</p>
					{/if}
				</CollapsibleContent>
			</Collapsible>
		</CardContent>
	</Card>
{/if}
