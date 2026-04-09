require("esbuild").build({
    entryPoints: ["./src/script.js"],
    platform: "node",
    bundle: true,
    sourcemap: true,
    target: 'es2017', // Or a more recent target for better compatibility
    format: 'iife', // Change to IIFE for traditional script loading
    minify: true,
    loader: { ".ts": "ts" },
    outfile: "./build/script.js"
})
    .then(() => console.log("⚡ Build Done"))
    .catch(() => process.exit(1));