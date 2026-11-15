<script lang="ts">
	/**
	 * Shared file picker + drag-and-drop zone (used by all four labs).
	 *
	 * One hidden <input> serves the primary button and any extra labelled pick
	 * buttons (`pickers`, e.g. Lab 4's relevant/non-relevant files); the active
	 * target is remembered between click and change. Dropped files always go to
	 * the primary `onfiles` handler. Extra buttons (demo/reset/compare) are
	 * supplied by the caller through the `actions` snippet.
	 *
	 * Browser-only by nature: File/Blob APIs are only touched from user events.
	 */
	import type { Snippet } from 'svelte';
	import { Button, type ButtonVariant } from '#lib/components/ui/button';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import UploadIcon from '@lucide/svelte/icons/upload';

	/** A labelled alternative pick button with its own file handler. */
	export interface FilePicker {
		label: string;
		variant?: ButtonVariant;
		onfiles: (files: File[]) => void | Promise<void>;
	}

	interface Props {
		/** Handler for the primary pick button and for dropped files. */
		onfiles: (files: File[]) => void | Promise<void>;
		/** Extra labelled pick buttons (rendered instead of the primary label). */
		pickers?: FilePicker[];
		multiple?: boolean;
		disabled?: boolean;
		loading?: boolean;
		/** Set false to hide the drag-and-drop zone (Lab 4 needs pickers only). */
		dropEnabled?: boolean;
		accept?: string;
		label?: string;
		dropLabel?: string;
		/** Extra buttons next to the pick button(s): demo, reset, compare… */
		actions?: Snippet;
	}

	let {
		onfiles,
		pickers,
		multiple = false,
		disabled = false,
		loading = false,
		dropEnabled = true,
		accept = '.txt,text/plain',
		label = 'Выбрать файлы',
		dropLabel = 'Перетащите текстовые файлы сюда',
		actions,
	}: Props = $props();

	let input: HTMLInputElement | null = $state(null);
	let dragOver = $state(false);
	/** Index of the picker whose button was clicked, or null for the primary. */
	let activePicker: number | null = null;
	const isBusy = $derived(disabled || loading);

	function pick(index: number | null): void {
		if (isBusy) return;
		activePicker = index;
		input?.click();
	}

	function onInputChange(event: Event): void {
		const element = event.currentTarget as HTMLInputElement;
		const files = Array.from(element.files ?? []);
		element.value = '';
		const index = activePicker;
		activePicker = null;
		if (files.length === 0) return;
		if (index !== null && pickers?.[index]) {
			void pickers[index].onfiles(files);
		} else {
			void onfiles(files);
		}
	}

	function onDrop(event: DragEvent): void {
		event.preventDefault();
		dragOver = false;
		if (isBusy) return;
		const files = Array.from(event.dataTransfer?.files ?? []);
		if (files.length > 0) void onfiles(files);
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap gap-2">
		{#if pickers && pickers.length > 0}
			{#each pickers as picker, index (picker.label)}
				<Button
					variant={picker.variant ?? 'default'}
					disabled={isBusy}
					onclick={() => pick(index)}
				>
					{#if loading}
						<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
					{:else}
						<UploadIcon data-icon="inline-start" />
					{/if}
					{picker.label}
				</Button>
			{/each}
		{:else}
			<Button disabled={isBusy} onclick={() => pick(null)}>
				{#if loading}
					<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
				{:else}
					<UploadIcon data-icon="inline-start" />
				{/if}
				{label}
			</Button>
		{/if}
		{@render actions?.()}
	</div>

	<input
		type="file"
		{accept}
		{multiple}
		class="hidden"
		bind:this={input}
		onchange={onInputChange}
	/>

	{#if dropEnabled}
		<button
			type="button"
			class="border-border/80 text-muted-foreground hover:bg-muted/50 focus-visible:ring-ring/50 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			class:bg-muted={dragOver}
			aria-label={dropLabel}
			disabled={isBusy}
			onclick={() => pick(null)}
			ondragover={(event) => {
				event.preventDefault();
				dragOver = true;
			}}
			ondragleave={() => (dragOver = false)}
			ondrop={onDrop}
		>
			{dropLabel}
		</button>
	{/if}
</div>
