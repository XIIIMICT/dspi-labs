<script lang="ts">
	import { toggleMode } from 'mode-watcher';
	import { Button } from '#lib/components/ui/button';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
</script>

<Button variant="ghost" size="icon" onclick={toggleMode} title="Переключить тему">
	<SunIcon class="dark:hidden" />
	<MoonIcon class="hidden dark:block" />
	<span class="sr-only">Переключить тему</span>
</Button>
