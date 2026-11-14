<script lang="ts">
	import type { Component } from 'svelte';
	import BookOpenCheckIcon from '@lucide/svelte/icons/book-open-check';
	import FileCodeCornerIcon from '@lucide/svelte/icons/file-code-corner';

	const links: { label: string; href: string; icon: Component }[] = [
		{
			label: 'Исходный код',
			href: 'https://github.com/XIIIMICT/dspi-labs',
			icon: FileCodeCornerIcon,
		},
		{
			label: 'Методичка',
			href: 'https://github.com/XIIIMICT/dspi-labs/blob/main/docs/Методичка.docx',
			icon: BookOpenCheckIcon,
		},
	];
</script>

<footer class="border-t border-foreground/10 bg-background">
	<nav
		aria-label="Ссылки на материалы проекта"
		class="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-4 sm:px-6"
	>
		{#each links as link (link.href)}
			<a
				href={link.href}
				target="_blank"
				rel="noopener noreferrer"
				class="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-2 rounded-sm text-sm underline-offset-4 transition-colors hover:underline focus-visible:ring-3 focus-visible:outline-none"
			>
				<link.icon aria-hidden="true" class="size-4" />
				{link.label}
			</a>
		{/each}
	</nav>
</footer>
