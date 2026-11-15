<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
	import { searchQualityStore as store } from './store.svelte';

	// SVG chart geometry (viewBox units).
	const CHART_W = 640;
	const CHART_H = 320;
	const PAD = 48;
	const chartPoints = $derived.by(() => {
		if (!store.result) return [];
		const xs = store.result.chart.map((p) => p.x);
		const minX = Math.min(...xs);
		const maxX = Math.max(...xs);
		const spanX = maxX - minX || 1;
		return store.result.chart.map((p) => ({
			...p,
			cx: PAD + ((p.x - minX) / spanX) * (CHART_W - 2 * PAD),
			cy: CHART_H - PAD - p.y * (CHART_H - 2 * PAD),
		}));
	});
	const polyPoints = $derived(chartPoints.map((p) => `${p.cx},${p.cy}`).join(' '));
	const gridLines = [0, 0.25, 0.5, 0.75, 1].map((v) => ({
		v,
		y: CHART_H - PAD - v * (CHART_H - 2 * PAD),
	}));
</script>

{#if store.result}
	<Card>
		<CardHeader>
			<CardTitle>График F1-меры от количества документов</CardTitle>
			<CardDescription>Значения по оси Y — рассчитанная F1-мера каждой выборки.</CardDescription>
		</CardHeader>
		<CardContent>
			<svg
				viewBox="0 0 {CHART_W} {CHART_H}"
				class="h-auto w-full"
				role="img"
				aria-label="Линейный график зависимости F1-меры от количества документов"
			>
				<!-- grid + Y axis labels -->
				{#each gridLines as line (line.v)}
					<line
						x1={PAD}
						y1={line.y}
						x2={CHART_W - PAD}
						y2={line.y}
						class="stroke-border"
						stroke-dasharray="4 4"
					/>
					<text x={PAD - 8} y={line.y + 4} text-anchor="end" class="fill-muted-foreground text-[11px]">
						{line.v.toFixed(2)}
					</text>
				{/each}
				<!-- axes -->
				<line x1={PAD} y1={PAD - 16} x2={PAD} y2={CHART_H - PAD} class="stroke-foreground/40" />
				<line
					x1={PAD}
					y1={CHART_H - PAD}
					x2={CHART_W - PAD + 16}
					y2={CHART_H - PAD}
					class="stroke-foreground/40"
				/>
				<!-- axis titles -->
				<text
					x={(CHART_W - 2 * PAD) / 2 + PAD}
					y={CHART_H - 8}
					text-anchor="middle"
					class="fill-muted-foreground text-[12px]"
				>
					Количество документов
				</text>
				<text
					x={16}
					y={(CHART_H - 2 * PAD) / 2 + PAD}
					text-anchor="middle"
					transform="rotate(-90 16 {(CHART_H - 2 * PAD) / 2 + PAD})"
					class="fill-muted-foreground text-[12px]"
				>
					F1-мера
				</text>
				<!-- data polyline + points -->
				<polyline
					points={polyPoints}
					fill="none"
					stroke-width="2.5"
					class="stroke-primary"
					stroke-linejoin="round"
				/>
				{#each chartPoints as point (point.x)}
					<circle cx={point.cx} cy={point.cy} r="5" class="fill-primary" />
					<text x={point.cx} y={point.cy - 10} text-anchor="middle" class="fill-foreground text-[11px]">
						{point.x}
					</text>
					<text x={point.cx} y={point.cy + 20} text-anchor="middle" class="fill-muted-foreground text-[10px]">
						{(point.y * 100).toFixed(0)}%
					</text>
				{/each}
			</svg>
		</CardContent>
	</Card>
{/if}
