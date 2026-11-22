<script lang="ts">
	import { untrack } from 'svelte';

	interface Props {
		value: number;
		duration?: number;
		suffix?: string;
	}

	let { value, duration = 650, suffix = '' }: Props = $props();
	let display = $state(untrack(() => value));

	$effect(() => {
		const target = value;
		if (!Number.isFinite(target)) return;
		if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			display = target;
			return;
		}

		const from = 0;
		const start = performance.now();
		let raf = 0;

		const tick = (now: number) => {
			const t = Math.min((now - start) / duration, 1);
			const eased = 1 - Math.pow(1 - t, 3);
			display = Math.round(from + (target - from) * eased);
			if (t < 1) {
				raf = requestAnimationFrame(tick);
			} else {
				display = target;
			}
		};

		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

{display.toLocaleString()}{suffix}
