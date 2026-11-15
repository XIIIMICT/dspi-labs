<script lang="ts">
	import { Button } from '#lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { ScrollArea } from '#lib/components/ui/scroll-area';
	import { shinglesStore as store } from './store.svelte';

	let viewIndex = $state(0);
	const selectedText = $derived(store.results[viewIndex] ?? null);
</script>

<Card>
	<CardHeader>
		<CardTitle>Исходные тексты</CardTitle>
		<CardDescription>Тексты сохранены в исходном виде — без изменения при обработке.</CardDescription>
	</CardHeader>
	<CardContent class="flex flex-col gap-3">
		<div class="flex flex-wrap gap-2">
			{#each store.results as processed, index (index)}
				<Button
					size="sm"
					variant={viewIndex === index ? 'default' : 'outline'}
					onclick={() => (viewIndex = index)}
				>
					{index + 1}. {processed.name}
				</Button>
			{/each}
		</div>
		{#if selectedText}
			<ScrollArea class="bg-muted/30 h-72 rounded-md border p-3">
				<pre class="text-sm leading-relaxed whitespace-pre-wrap">{selectedText.text}</pre>
			</ScrollArea>
		{/if}
	</CardContent>
</Card>
