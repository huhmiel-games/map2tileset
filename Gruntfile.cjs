var os = require('os');
os.tmpDir = os.tmpdir;
module.exports = function (grunt)
{
    grunt.initConfig({
        nwjs: {
            options: {
                platforms: ['linux64'], // win 'win64', 'osx64'
                buildDir: './dist', // Where the build version of my NW.js app is saved
                version: '0.79.1',
                flavor: 'normal'
            },
            src: ['./build/**/*'] // Your NW.js app
        },
    })

    grunt.loadNpmTasks('grunt-nw-builder');

    grunt.registerTask('default', ['nwjs']);
};
