/** Assumption: inline scroll pans; ctrl/meta+scroll zooms; modal scroll always zooms. */
export type WheelBehavior = "zoom" | "pan-or-zoom";

export interface PanZoomState {
	zoom: number;
	panX: number;
	panY: number;
	panning: boolean;
	panStartX: number;
	panStartY: number;
	panOriginX: number;
	panOriginY: number;
}

export interface PanZoomController {
	state: PanZoomState;
	reset(): void;
	apply(): void;
	stopPanning(): void;
	zoomIn(): void;
	zoomOut(): void;
}

const MIN_ZOOM = 0.05;
const WHEEL_ZOOM_FACTOR = 1.12;

export function formatZoomLabel(zoom: number): string {
	return `${Math.round(zoom * 100)}%`;
}

function applyZoom(
	state: PanZoomState,
	factor: number,
	apply: () => void,
): void {
	const prevZoom = state.zoom;
	state.zoom = Math.max(MIN_ZOOM, state.zoom * factor);
	const scale = state.zoom / prevZoom;
	state.panX *= scale;
	state.panY *= scale;
	apply();
}

export function createPanZoom(
	viewportId: string,
	contentId: string,
	options?: {
		isActive?: () => boolean;
		onZoomChange?: (zoom: number) => void;
		wheelBehavior?: WheelBehavior;
	},
): PanZoomController {
	const wheelBehavior = options?.wheelBehavior ?? "zoom";
	const state: PanZoomState = {
		zoom: 1,
		panX: 0,
		panY: 0,
		panning: false,
		panStartX: 0,
		panStartY: 0,
		panOriginX: 0,
		panOriginY: 0,
	};

	const apply = (): void => {
		const content = document.getElementById(contentId);
		if (!content) {
			return;
		}
		content.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
		options?.onZoomChange?.(state.zoom);
	};

	const reset = (): void => {
		state.zoom = 1;
		state.panX = 0;
		state.panY = 0;
		apply();
	};

	const zoomIn = (): void => {
		applyZoom(state, WHEEL_ZOOM_FACTOR, apply);
	};

	const zoomOut = (): void => {
		applyZoom(state, 1 / WHEEL_ZOOM_FACTOR, apply);
	};

	const stopPanning = (): void => {
		if (!state.panning) {
			return;
		}
		state.panning = false;
		document.getElementById(viewportId)?.classList.remove("panning");
	};

	const viewport = document.getElementById(viewportId);
	viewport?.addEventListener(
		"wheel",
		(event) => {
			if (options?.isActive && !options.isActive()) {
				return;
			}
			event.preventDefault();
			if (
				wheelBehavior === "pan-or-zoom" &&
				!event.ctrlKey &&
				!event.metaKey
			) {
				state.panX -= event.deltaX;
				state.panY -= event.deltaY;
				apply();
				return;
			}
			const prevZoom = state.zoom;
			state.zoom =
				event.deltaY > 0
					? Math.max(MIN_ZOOM, state.zoom / WHEEL_ZOOM_FACTOR)
					: state.zoom * WHEEL_ZOOM_FACTOR;
			const scale = state.zoom / prevZoom;
			state.panX *= scale;
			state.panY *= scale;
			apply();
		},
		{ passive: false },
	);

	viewport?.addEventListener("mousedown", (event) => {
		if (options?.isActive && !options.isActive()) {
			return;
		}
		if (event.button !== 0) {
			return;
		}
		state.panning = true;
		state.panStartX = event.clientX;
		state.panStartY = event.clientY;
		state.panOriginX = state.panX;
		state.panOriginY = state.panY;
		viewport.classList.add("panning");
		event.preventDefault();
	});

	const onMouseMove = (event: MouseEvent): void => {
		if (!state.panning) {
			return;
		}
		state.panX = state.panOriginX + (event.clientX - state.panStartX);
		state.panY = state.panOriginY + (event.clientY - state.panStartY);
		apply();
	};

	const onMouseUp = (): void => {
		stopPanning();
	};

	window.addEventListener("mousemove", onMouseMove);
	window.addEventListener("mouseup", onMouseUp);

	const controller: PanZoomController = {
		state,
		reset,
		apply,
		stopPanning,
		zoomIn,
		zoomOut,
	};

	return controller;
}
