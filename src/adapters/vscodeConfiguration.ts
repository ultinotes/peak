import * as vscode from "vscode";
import type { PeakConfigurationPort, DefinitionPreviewPlacement } from "./ports";

export class VscodePeakConfiguration implements PeakConfigurationPort {
	updateOnCursorMove(): boolean {
		return vscode.workspace
			.getConfiguration("peak")
			.get<boolean>("updateOnCursorMove", true);
	}

	definitionPreviewPlacement(): DefinitionPreviewPlacement {
		const value = vscode.workspace
			.getConfiguration("peak")
			.get<string>("definitionPreviewPlacement", "right");
		return value === "bottom" ? "bottom" : "right";
	}
}

export function createPeakConfiguration(): PeakConfigurationPort {
	return new VscodePeakConfiguration();
}
