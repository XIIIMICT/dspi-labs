<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import XIcon from "@lucide/svelte/icons/x";
	import { cn, type WithoutChildrenOrChild } from "#lib/utils.js";
	import type { ComponentProps } from "svelte";
	import DialogOverlay from "./dialog-overlay.svelte";
	import DialogPortal from "./dialog-portal.svelte";

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		...restProps
	}: DialogPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
	} = $props();
</script>

<DialogPortal {...portalProps}>
	<DialogOverlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			"bg-background data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border p-6 shadow-lg duration-200 sm:max-w-lg",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		<DialogPrimitive.Close
			data-slot="dialog-close"
			class="absolute top-4 right-4 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
		>
			<XIcon />
			<span class="sr-only">Закрыть</span>
		</DialogPrimitive.Close>
	</DialogPrimitive.Content>
</DialogPortal>
