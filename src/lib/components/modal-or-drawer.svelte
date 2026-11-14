<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog';
	import * as Drawer from '#lib/components/ui/drawer';
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';

	let {
		open = $bindable(false),
		title,
		description,
		badges,
		children,
	}: {
		open?: boolean;
		title: string;
		description?: string;
		badges?: Snippet;
		children: Snippet;
	} = $props();

	// Bottom drawer below the `sm` breakpoint, centered dialog above it
	// (the responsive Dialog/Drawer pattern from the shadcn-svelte docs).
	const isMobile = new MediaQuery('(max-width: 639.98px)');
</script>

{#if isMobile.current}
	<Drawer.Root bind:open>
		<Drawer.Content>
			<div class="mx-auto flex max-h-[75vh] w-full max-w-4xl flex-col">
				<Drawer.Header class="shrink-0">
					<Drawer.Title class="truncate">{title}</Drawer.Title>
					{#if description}
						<Drawer.Description>{description}</Drawer.Description>
					{/if}
					{#if badges}
						<div class="mt-2 flex flex-wrap justify-center gap-1.5">{@render badges()}</div>
					{/if}
				</Drawer.Header>
				<div class="min-h-0 overflow-y-auto px-4 pb-6 sm:px-6">
					{@render children()}
				</div>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{:else}
	<Dialog.Root bind:open>
		<Dialog.Content class="flex max-h-[85vh] flex-col sm:max-w-3xl">
			<Dialog.Header class="shrink-0 text-left">
				<Dialog.Title class="truncate pr-8">{title}</Dialog.Title>
				{#if description}
					<Dialog.Description>{description}</Dialog.Description>
				{/if}
				{#if badges}
					<div class="mt-2 flex flex-wrap gap-1.5">{@render badges()}</div>
				{/if}
			</Dialog.Header>
			<div class="-mx-4 min-h-0 flex-1 overflow-y-auto px-4">
				{@render children()}
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}
