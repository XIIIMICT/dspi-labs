<script lang="ts">
	import DocumentsPanel from './documents-panel.svelte';
	import SearchCard from './search-card.svelte';
	import DiagnosticsCard from './diagnostics-card.svelte';
	import LogPanel from './log-panel.svelte';
	import DocumentModal from './document-modal.svelte';
</script>

<div class="flex flex-col gap-4">
	<DocumentsPanel />
	<SearchCard />
	<DiagnosticsCard />
	<LogPanel />
	<DocumentModal />
</div>
