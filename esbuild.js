const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const esbuildProblemMatcherPlugin = {
	name: "esbuild-problem-matcher",

	setup(build) {
		build.onStart(() => {
			console.log("[watch] build started");
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				if (location) {
					console.error(
						`    ${location.file}:${location.line}:${location.column}:`,
					);
				}
			});
			console.log("[watch] build finished");
		});
	},
};

function copyWebviewHtml() {
	const outDir = path.join(__dirname, "dist", "webview");
	fs.mkdirSync(outDir, { recursive: true });
	fs.copyFileSync(
		path.join(__dirname, "src", "webview", "peakView.html"),
		path.join(outDir, "peakView.html"),
	);
}

async function main() {
	const extensionCtx = await esbuild.context({
		entryPoints: ["src/extension.ts"],
		bundle: true,
		format: "cjs",
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: "node",
		outfile: "dist/extension.js",
		external: ["vscode"],
		logLevel: "silent",
		plugins: [esbuildProblemMatcherPlugin],
	});

	const webviewCtx = await esbuild.context({
		entryPoints: ["src/webview/peakView.ts"],
		bundle: true,
		format: "iife",
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: "browser",
		outfile: "dist/webview/peakView.js",
		logLevel: "silent",
		plugins: [esbuildProblemMatcherPlugin],
	});

	const buildAll = async () => {
		await extensionCtx.rebuild();
		await webviewCtx.rebuild();
		copyWebviewHtml();
	};

	if (watch) {
		copyWebviewHtml();
		await extensionCtx.watch();
		await webviewCtx.watch();
	} else {
		await buildAll();
		await extensionCtx.dispose();
		await webviewCtx.dispose();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
