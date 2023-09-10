require("esbuild").build({
    entryPoints: ["./src/script.js"],
    bundle: true,
    sourcemap: true,
    target: 'es6',
    format: 'iife',
    minify: true,
    loader: { ".js": "js" },
    outfile: "./build/script.js"
})
    .then(() => console.log("⚡ Build Done"))
    .catch(() => process.exit(1));