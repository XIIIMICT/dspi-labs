<script lang="ts">
	import InputCard from './input-card.svelte';
	import SimilarityCard from './similarity-card.svelte';
	import SourceTextsCard from './source-texts-card.svelte';
	import EvidenceCard from './evidence-card.svelte';
	import { shinglesStore as store } from './store.svelte';
</script>

<InputCard />

{#if store.comparisons.length > 0}
	<SimilarityCard />
	<SourceTextsCard />
	<EvidenceCard />
{/if}
