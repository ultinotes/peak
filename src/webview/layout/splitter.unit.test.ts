import * as assert from "assert";
import type { DefinitionPreviewPlacement } from "../../shared/webviewProtocol";
import { setupSplitter } from "./splitter";
import type { SplitterDom } from "./splitterDom";
import type { LayoutBounds } from "./splitterLogic";

interface AppliedSplit {
	placement: DefinitionPreviewPlacement;
	splitRatio: number;
	hasDefinition: boolean;
}

function createFakeSplitterDom(bounds: LayoutBounds, splitterSize = 4): {
	dom: SplitterDom;
	applied: AppliedSplit[];
	simulateMouseDown: () => void;
	simulateMouseMove: (clientX: number, clientY: number) => void;
	simulateMouseUp: () => void;
} {
	const applied: AppliedSplit[] = [];
	let handlers: {
		onMouseDown: (event: MouseEvent) => void;
		onMouseMove: (event: MouseEvent) => void;
		onMouseUp: () => void;
	} | undefined;

	const dom: SplitterDom = {
		readMetrics(_placement) {
			return { bounds, splitterSize };
		},
		applySplit(placement, splitRatio, hasDefinition) {
			applied.push({ placement, splitRatio, hasDefinition });
		},
		onDrag(h) {
			handlers = h;
			return () => {
				handlers = undefined;
			};
		},
	};

	return {
		dom,
		applied,
		simulateMouseDown() {
			handlers?.onMouseDown({ preventDefault: () => undefined } as MouseEvent);
		},
		simulateMouseMove(clientX: number, clientY: number) {
			handlers?.onMouseMove({ clientX, clientY } as MouseEvent);
		},
		simulateMouseUp() {
			handlers?.onMouseUp();
		},
	};
}

suite("setupSplitter orchestration", () => {
	test("drag applies pointer-derived ratio during move, commits on mouseup only", () => {
		const fake = createFakeSplitterDom({
			width: 400,
			height: 300,
			right: 500,
			bottom: 400,
		});
		let committed: number | undefined;

		setupSplitter(
			{
				getPlacement: () => "right",
				isDefinitionVisible: () => true,
				onSplitRatioCommit: (ratio) => {
					committed = ratio;
				},
			},
			fake.dom,
		);

		fake.simulateMouseDown();
		fake.simulateMouseMove(300, 0);

		assert.strictEqual(fake.applied.length, 1);
		assert.strictEqual(fake.applied[0]!.splitRatio, 0.5);
		assert.strictEqual(fake.applied[0]!.hasDefinition, true);
		assert.strictEqual(committed, undefined);

		fake.simulateMouseUp();
		assert.strictEqual(committed, 0.5);
	});

	test("ignores drag when definition is not visible", () => {
		const fake = createFakeSplitterDom({
			width: 400,
			height: 300,
			right: 500,
			bottom: 400,
		});
		let committed: number | undefined;

		setupSplitter(
			{
				getPlacement: () => "right",
				isDefinitionVisible: () => false,
				onSplitRatioCommit: (ratio) => {
					committed = ratio;
				},
			},
			fake.dom,
		);

		fake.simulateMouseDown();
		fake.simulateMouseMove(300, 0);
		fake.simulateMouseUp();

		assert.strictEqual(fake.applied.length, 0);
		assert.strictEqual(committed, undefined);
	});
});
