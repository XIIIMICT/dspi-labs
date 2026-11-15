<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { ScrollArea } from '#lib/components/ui/scroll-area';
	import { appStore as app } from './store.svelte';

	const logLines = $derived(app.logs.slice(-1000));
</script>

<Card>
	<CardHeader>
		<CardTitle>Логи</CardTitle>
		<CardDescription>Последние 1000 сообщений журнала обработки.</CardDescription>
	</CardHeader>
	<CardContent>
		{#if app.logs.length === 0}
			<p class="text-muted-foreground text-sm">
				Журнал пуст — загрузите документы или демо-тексты.
			</p>
		{:else}
			<ScrollArea class="bg-muted/30 h-72 rounded-md border p-3">
				<pre class="font-mono text-xs leading-relaxed whitespace-pre-wrap">{logLines.join('\n')}</pre>
			</ScrollArea>
		{/if}
	</CardContent>
</Card>
