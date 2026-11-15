<script lang="ts">
	import { Badge } from '#lib/components/ui/badge';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#lib/components/ui/collapsible';
	import { Textarea } from '#lib/components/ui/textarea';
	import { appStore as app } from './store.svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	/** Full, untruncated repeat evidence: one document per block, terms as a
	 * "- term" list, blank line between documents. */
	const repeatsText = $derived(
		(app.diagnostics?.repeatedWithinDocuments ?? [])
			.map((item) => `${item.name}:\n${item.terms.map((term) => `- ${term}`).join('\n')}`)
			.join('\n\n'),
	);
</script>

{#if app.diagnostics}
	<Card>
		<CardHeader>
			<CardTitle>Диагностика повторов</CardTitle>
			<CardDescription>
				Инспектируемые признаки задания «схожие по тематике»: слова, повторяющиеся внутри
				документа и общие для нескольких документов. Это данные для оценки, а не
				автоматическое доказательство смысловой близости текстов.
			</CardDescription>
		</CardHeader>
		<CardContent class="flex flex-col gap-3">
			<div class="flex flex-wrap gap-2">
				<Badge variant="secondary">
					Терминов, общих для нескольких документов: {app.diagnostics.sharedAcrossDocuments.length}
				</Badge>
			</div>
			<p class="text-muted-foreground text-sm">
				Примеры общих терминов: {app.diagnostics.sharedAcrossDocuments.slice(0, 10).join(', ')}
			</p>
			<Collapsible>
				<CollapsibleTrigger class="group flex w-full items-center gap-2 text-left text-sm font-medium">
					<ChevronRightIcon
						class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:hidden"
					/>
					<ChevronDownIcon
						class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:hidden"
					/>
					Повторы внутри документов ({app.diagnostics.repeatedWithinDocuments.length} документов)
				</CollapsibleTrigger>
				<CollapsibleContent>
					<Textarea
						value={repeatsText}
						readonly
						rows={8}
						class="mt-2 font-mono !text-xs leading-relaxed whitespace-pre-wrap"
						aria-label="Повторы внутри документов"
					/>
				</CollapsibleContent>
			</Collapsible>
		</CardContent>
	</Card>
{/if}
