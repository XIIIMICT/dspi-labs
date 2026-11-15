<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { searchQualityStore as store } from './store.svelte';
</script>

{#if store.result}
	<Card>
		<CardHeader>
			<CardTitle>Выводы</CardTitle>
			<CardDescription>Сформулированы по измеренным данным.</CardDescription>
		</CardHeader>
		<CardContent>
			<ol class="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
				{#each store.conclusions as line, index (index)}
					<li>{line}</li>
				{/each}
			</ol>
		</CardContent>
	</Card>
{/if}
