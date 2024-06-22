import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import {sassPlugin} from "esbuild-sass-plugin";
import * as fs from "fs/promises";

const banner =
	"/* THIS IS A GENERATED/BUNDLED FILE BY ESBUILD see https://github.com/BambusControl/obsidian-unicode-search for the source */";

const prodBuild = (process.argv[2] === "production");

const sourceDir = "./src/unicode-search";
const outputDir = "./dist/unicode-search";

/* Copy the manifest for working*/
await fs.mkdir(outputDir, {recursive: true});
await fs.copyFile("manifest.json", `${outputDir}/manifest.json`);

const buildOptions = {
	banner: {
		js: banner,
	},
	entryPoints: [
		`${sourceDir}/main.ts`,
		`${sourceDir}/styles.scss`,
	],
	entryNames: "[name]",
	outdir: outputDir,
	bundle: true,
	external: [
		"obsidian",
		...builtins,
	],
	format: "cjs",
	target: "ES6",
	logLevel: "info",
	sourcemap: prodBuild ? false : "inline",
	treeShaking: true,
	minify: prodBuild,
	plugins: [
		sassPlugin({
			syntax: "scss",
			style: prodBuild ? "compressed" : "expanded",
		}),
	],
    drop: prodBuild ? ["console"] : []
};

try {
	if (prodBuild) {
		await esbuild.build(buildOptions);
	} else {
		await (await esbuild.context(buildOptions)).watch();
	}

} catch {
	process.exit(1);
}
