var gulp = require('gulp');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');


var sources = {
  scripts: [
    '*.js',
    'lib/**/*.js'
  ]
};


gulp.task('lint', function () {
  return gulp.src(sources.scripts)
    .pipe(jshint({esnext: true}))
    .pipe(jshint.reporter(stylish));
});
