<script lang="ts">
	import { Button } from '#lib/components/ui/button';
	import * as Drawer from '#lib/components/ui/drawer';
	import { getVariantInfo, type LabDefinition } from '#lib/labs';
	import { marked } from 'marked';

	let { lab, variant }: { lab: LabDefinition; variant: number } = $props();

	const assignmentHtml = $derived(marked.parse(lab.assignment) as string);
	const info = $derived(getVariantInfo(lab, variant));
</script>

<Drawer.Root>
	<Drawer.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" size="sm">Задание</Button>
		{/snippet}
	</Drawer.Trigger>
	<Drawer.Content>
		<div class="mx-auto flex max-h-[75vh] w-full max-w-4xl flex-col">
			<Drawer.Header class="shrink-0">
				<Drawer.Title>{lab.title}</Drawer.Title>
				<Drawer.Description>Задание к лабораторной работе {lab.number}</Drawer.Description>
			</Drawer.Header>
			<div class="min-h-0 overflow-y-auto px-4 pb-6 sm:px-6">
				<!-- markdown-контент задания из assignment.md лабораторной -->
				<div class="prose prose-sm dark:prose-invert max-w-none">
					{@html assignmentHtml}
				</div>
				<div class="mt-4 text-sm">
					<p><b>Вариант:</b> {variant}</p>
					<p><b>Вид:</b> {info?.вид ?? '—'}</p>
					<p><b>Язык:</b> {info?.язык ?? '—'}</p>
				</div>
			</div>
		</div>
	</Drawer.Content>
</Drawer.Root>
