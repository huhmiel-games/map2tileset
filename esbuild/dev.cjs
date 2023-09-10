require('esbuild').serve({
    port: 3000,
    servedir: "public",
    onRequest: (error, result) =>
    {
        if (error.status !== 200)
        {
            console.log('\x1b[31m%s\x1b[0m', '⚡ Request failed:', error)
        } 
        else if(error.status === 200)
        {
            console.log('\x1b[34m%s\x1b[0m', `⚡ Requested: ${error.path} in ${error.timeInMS}ms`)
        }
        else
        {
            console.log(error);
        }
    }
}, {
    entryPoints: ["./src/script.js"],
    bundle: true,
    format: 'iife',
    target: 'es6',
    minify: false,
    sourcemap: true,
    loader: { ".js": "js" },
    outfile: "./public/script.js",
})
    .then((e) => console.log('\x1b[32m%s\x1b[0m', `Page loaded at http://${e.host}:${e.port}`))
    .catch(() => process.exit(1));
