module.exports = function(grunt) {
  grunt.initConfig({
    'pkg': grunt.file.readJSON('package.json'),
    'requirejs': {
      build: {
        options: {
          almond: true,
          baseUrl: 'dev/js',
          mainConfigFile: 'dev/js/config.js',
          optimize: 'uglify',
          out: 'build/build.js',
          name: 'app',
          replaceRequireScript: [{
            files: 'build/index.html',
            module: 'app',
            modulePath: 'build'
          }],
          include: [ '../vendor/requirejs/require' ]
        }
      }
    },
    'connect': {
      dev: {
        options: {
          port: 8888,
          keepalive: true,
          base: 'dev'
        }
      },
      build: {
        options: {
          port: 8889,
          keepalive: true,
          base: 'build'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-requirejs');

  grunt.registerTask('server', ['connect:dev']);
  grunt.registerTask('default', ['connect:dev']);
  grunt.registerTask('build', ['requirejs']);
}
