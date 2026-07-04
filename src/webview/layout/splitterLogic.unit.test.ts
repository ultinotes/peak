import * as assert from "assert";
import {
	clampSplitRatio,
	computeDefinitionPanelPx,
	definitionPanelStyles,
	MIN_PANEL_PX,
	resolveSplitRatioFromPointer,
	splitRatioFromPointer,
	type LayoutBounds,
} from "./splitterLogic";

const bounds400: LayoutBounds = {
	width: 400,
	height: 300,
	right: 500,
	bottom: 400,
};

suite("clampSplitRatio", () => {
	test("clamps below minimum panel size", () => {
		const total = 400;
		const minRatio = MIN_PANEL_PX / total;
		assert.strictEqual(clampSplitRatio(0, total), minRatio);
	});

	test("clamps above maximum panel size", () => {
		const total = 400;
		const maxRatio = 1 - MIN_PANEL_PX / total;
		assert.strictEqual(clampSplitRatio(1, total), maxRatio);
	});

	test("passes through mid-range ratio", () => {
		assert.strictEqual(clampSplitRatio(0.5, 400), 0.5);
	});
});

suite("splitRatioFromPointer", () => {
	test("right placement uses horizontal distance from right edge", () => {
		assert.strictEqual(
			splitRatioFromPointer("right", bounds400, 300, 0),
			0.5,
		);
		assert.strictEqual(
			splitRatioFromPointer("right", bounds400, 500, 0),
			0,
		);
	});

	test("bottom placement uses vertical distance from bottom edge", () => {
		assert.strictEqual(
			splitRatioFromPointer("bottom", bounds400, 0, 250),
			0.5,
		);
		assert.strictEqual(
			splitRatioFromPointer("bottom", bounds400, 0, 400),
			0,
		);
	});
});

suite("resolveSplitRatioFromPointer", () => {
	test("clamps pointer ratio at edges", () => {
		const total = 400;
		const minRatio = MIN_PANEL_PX / total;
		assert.strictEqual(
			resolveSplitRatioFromPointer("right", bounds400, 600, 0),
			minRatio,
		);
	});
});

suite("computeDefinitionPanelPx", () => {
	test("uses half of total at ratio 0.5", () => {
		assert.strictEqual(
			computeDefinitionPanelPx("right", 0.5, bounds400, 4),
			200,
		);
	});

	test("respects minimum panel size", () => {
		assert.strictEqual(
			computeDefinitionPanelPx("right", 0.01, bounds400, 4),
			MIN_PANEL_PX,
		);
	});

	test("caps size when splitter bar consumes space", () => {
		assert.strictEqual(
			computeDefinitionPanelPx("right", 0.9, bounds400, 4),
			276,
		);
	});

	test("bottom placement uses height axis", () => {
		assert.strictEqual(
			computeDefinitionPanelPx("bottom", 0.5, bounds400, 0),
			150,
		);
	});
});

suite("definitionPanelStyles", () => {
	test("clears styles when definition hidden", () => {
		assert.deepStrictEqual(definitionPanelStyles("right", 200, false), {
			flexBasis: "",
			width: "",
			height: "",
		});
	});

	test("right placement sets width", () => {
		assert.deepStrictEqual(definitionPanelStyles("right", 200, true), {
			flexBasis: "200px",
			width: "200px",
			height: "",
		});
	});

	test("bottom placement sets height", () => {
		assert.deepStrictEqual(definitionPanelStyles("bottom", 150, true), {
			flexBasis: "150px",
			width: "",
			height: "150px",
		});
	});
});
